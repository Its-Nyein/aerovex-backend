import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import type { UserAccountContract } from 'src/modules/user/contracts/user-account.contract';
import { RedisService } from 'src/redis/redis.service';
import { AuthService } from './auth.service';

/**
 * Session lifetime behaviour.
 *
 * Before this, a refresh token stayed valid for its full fifteen days no
 * matter what: logout only cleared the cookie, the same token was reusable
 * forever, and nothing rechecked whether the account still existed or was
 * still allowed to sign in.
 */
describe('AuthService sessions', () => {
  let service: AuthService;
  let redis: Map<string, unknown>;
  let userAccount: {
    findAuthCredentialsByEmail: jest.Mock;
    findAccountStandingById: jest.Mock;
  };

  const config = new ConfigService({
    JWT_ACCESS_SECRET_KEY: 'test-access-secret',
    JWT_REFRESH_SECRET_KEY: 'test-refresh-secret',
  });
  const jwtService = new JwtService();

  const res = () => ({
    cookie: jest.fn<void, [string, string, object]>(),
    clearCookie: jest.fn<void, [string]>(),
  });

  const activeStanding = {
    id: 'user-1',
    isActive: true,
    accountStatus: 'ACTIVE' as const,
    deletedAt: null,
  };

  const signRefresh = (payload: object) =>
    jwtService.sign(payload, {
      secret: 'test-refresh-secret',
      expiresIn: '15d',
    });

  beforeEach(() => {
    redis = new Map();
    userAccount = {
      findAuthCredentialsByEmail: jest.fn(),
      findAccountStandingById: jest.fn().mockResolvedValue(activeStanding),
    };

    const redisService = {
      get: jest.fn((key: string) => Promise.resolve(redis.get(key) ?? null)),
      set: jest.fn((key: string, value: unknown) => {
        redis.set(key, value);
        return Promise.resolve();
      }),
      del: jest.fn((key: string) => {
        redis.delete(key);
        return Promise.resolve(1);
      }),
    };

    service = new AuthService(
      userAccount as unknown as UserAccountContract,
      jwtService,
      redisService as unknown as RedisService,
      config,
    );
  });

  describe('refresh', () => {
    it('rotates the refresh token instead of reusing it', async () => {
      const response = res();
      await service.refresh(
        signRefresh({ id: 'user-1', email: 'a@b.c', tokenVersion: 0 }),
        response as unknown as Response,
      );

      const cookieNames = response.cookie.mock.calls.map((call) => call[0]);
      expect(cookieNames).toContain('access_token');
      expect(cookieNames).toContain('refresh_token');
    });

    it('rejects a refresh token issued before logout', async () => {
      const token = signRefresh({
        id: 'user-1',
        email: 'a@b.c',
        tokenVersion: 0,
      });

      await service.logout(token, res() as unknown as Response);

      // Same token, replayed after logout.
      await expect(
        service.refresh(token, res() as unknown as Response),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it('rejects a token whose version does not match', async () => {
      await expect(
        service.refresh(
          signRefresh({ id: 'user-1', email: 'a@b.c', tokenVersion: 7 }),
          res() as unknown as Response,
        ),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });

    it.each([
      ['suspended', { ...activeStanding, accountStatus: 'SUSPENDED' as const }],
      ['deactivated', { ...activeStanding, isActive: false }],
      ['soft deleted', { ...activeStanding, deletedAt: new Date() }],
      ['deleted outright', null],
    ])('refuses to refresh a %s account', async (_label, standing) => {
      userAccount.findAccountStandingById.mockResolvedValue(standing);

      await expect(
        service.refresh(
          signRefresh({ id: 'user-1', email: 'a@b.c', tokenVersion: 0 }),
          res() as unknown as Response,
        ),
      ).rejects.toThrow(new UnauthorizedException('Account is not active'));
    });

    it('rejects a token signed with the wrong secret', async () => {
      const forged = jwtService.sign(
        { id: 'user-1', email: 'a@b.c', tokenVersion: 0 },
        { secret: 'not-the-refresh-secret', expiresIn: '15d' },
      );

      await expect(
        service.refresh(forged, res() as unknown as Response),
      ).rejects.toThrow(new UnauthorizedException('Invalid refresh token'));
    });
  });

  describe('logout', () => {
    it('clears both cookies', async () => {
      const response = res();
      await service.logout(undefined, response as unknown as Response);

      const cleared = response.clearCookie.mock.calls.map((call) => call[0]);
      expect(cleared).toEqual(['access_token', 'refresh_token']);
    });

    it('still clears cookies when the token cannot be read', async () => {
      const response = res();
      await expect(
        service.logout('not-a-jwt', response as unknown as Response),
      ).resolves.toEqual({ success: true, message: 'Logout successful' });

      expect(response.clearCookie).toHaveBeenCalledTimes(2);
    });
  });
});
