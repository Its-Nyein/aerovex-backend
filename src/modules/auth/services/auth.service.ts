import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { USER_ACCOUNT } from 'src/modules/user/contracts/user-account.contract';
import type { UserAccountStanding } from 'src/modules/user/contracts/user-account.contract';
import type { UserAccountContract } from 'src/modules/user/contracts/user-account.contract';
import { LoginResponseDto } from '../dtos/login-response.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { cookieConstants } from '../constant';
import { jwtConfig } from '../jwt.config';
import { Response } from 'express';
import { RefreshResponseDto } from '../dtos/refresh-response.dto';
import { JwtUser } from '../decorators/current-user.decorator';
import { LogoutResponseDto } from '../dtos/logout-response.dto';
import { ApiTags } from '@nestjs/swagger';
import { RedisService } from 'src/redis/redis.service';
import { ConfigService } from '@nestjs/config';
// import { EmailPohService } from 'src/external-service/email-poh';

/**
 * A real bcrypt hash, never matched by any password.
 *
 * Status parity alone is not enough: verifying a password costs around 100ms,
 * so returning early for an unknown email would make it measurably faster than
 * a wrong password and still leak which addresses are registered. Comparing
 * against this placeholder keeps both paths the same shape.
 */
const ABSENT_USER_PASSWORD_HASH =
  '$2b$10$QWw9/uU7GFWanMGWtFS5VexsNcAQ0UpZZ.Hz5P/XUbY49JivRfMKS';

/**
 * Refresh tokens carry the version their session was issued at.
 *
 * A refresh token used to stay valid for its full fifteen days no matter what:
 * logging out only cleared the cookie, so a copied token kept working, and
 * nothing rechecked the account. Bumping the stored version invalidates every
 * refresh token issued for that user.
 */
interface RefreshTokenPayload extends JwtUser {
  tokenVersion?: number;
}

interface AccountLockInfo {
  failed_attempts: number;
  locked_until: number | null;
}

@ApiTags('Auth')
@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_ACCOUNT)
    private readonly userService: UserAccountContract,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    // private readonly emailPohService: EmailPohService,
    private readonly configService: ConfigService,
  ) {}

  private getAccountLockKey(userId: string): string {
    return `account_lock:${userId}`;
  }

  private async checkAccountLocked(
    userId: string,
  ): Promise<AccountLockInfo | null> {
    const key = this.getAccountLockKey(userId);
    const lockInfo = await this.redisService.get<AccountLockInfo>(key);

    if (lockInfo && lockInfo.locked_until) {
      const now = Date.now();
      if (now < lockInfo.locked_until) {
        const remainingSeconds = Math.ceil(
          (lockInfo.locked_until - now) / 1000,
        );
        throw new HttpException(
          `Account is locked. Please try again in ${remainingSeconds} seconds.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      await this.redisService.del(key);
      return null;
    }

    return lockInfo;
  }

  private async incrementFailedAttempts(userId: string): Promise<void> {
    const maxLoginAttempts = this.configService.get<number>(
      'MAX_LOGIN_ATTEMPTS',
      5,
    );
    const lockDurationSeconds = this.configService.get<number>(
      'LOCK_DURATION_SECONDS',
      3600,
    );
    const key = this.getAccountLockKey(userId);
    const lockInfo = await this.redisService.get<AccountLockInfo>(key);

    const newAttempts = lockInfo ? lockInfo.failed_attempts + 1 : 1;

    let newLockInfo: AccountLockInfo;
    if (newAttempts >= maxLoginAttempts) {
      const lockedUntil = Date.now() + lockDurationSeconds * 1000;
      newLockInfo = {
        failed_attempts: newAttempts,
        locked_until: lockedUntil,
      };
      await this.redisService.set(key, newLockInfo, lockDurationSeconds);
    } else {
      newLockInfo = {
        failed_attempts: newAttempts,
        locked_until: null,
      };
      await this.redisService.set(key, newLockInfo, lockDurationSeconds);
    }
  }

  private async resetFailedAttempts(userId: string): Promise<void> {
    const key = this.getAccountLockKey(userId);
    await this.redisService.del(key);
  }

  async login(
    email: string,
    password: string,
    res: Response,
  ): Promise<LoginResponseDto> {
    // Null rather than a thrown NotFoundException: the contract used to raise
    // 404 "User with email x not found" for an unknown address while a wrong
    // password gave 401, which let anyone enumerate registered accounts. Both
    // cases now leave through the same 401 below.
    const user = await this.userService.findAuthCredentialsByEmail(email);
    if (!user) {
      await bcrypt.compare(password, ABSENT_USER_PASSWORD_HASH);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.checkAccountLocked(user.id);

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      await this.incrementFailedAttempts(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Checked after the password so a wrong password on a suspended account
    // still looks like a wrong password.
    this.assertAccountUsable({
      id: user.id,
      isActive: user.isActive,
      accountStatus: user.accountStatus,
      deletedAt: null,
    });

    await this.resetFailedAttempts(user.id);

    const payload = {
      id: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtConfig.accessSecret(this.configService),
      expiresIn: jwtConfig.accessExpiresIn(this.configService),
    });

    // Stamped with the current version so a later logout can invalidate it.
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, tokenVersion: await this.getTokenVersion(user.id) },
      {
        secret: jwtConfig.refreshSecret(this.configService),
        expiresIn: jwtConfig.refreshExpiresIn(this.configService),
      },
    );

    res.cookie(
      cookieConstants.accessTokenName,
      accessToken,
      cookieConstants.accessTokenOptions,
    );

    res.cookie(
      cookieConstants.refreshTokenName,
      refreshToken,
      cookieConstants.refreshTokenOptions,
    );

    return {
      success: true,
      message: 'Login successful',
      User: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private getTokenVersionKey(userId: string): string {
    return `auth:token_version:${userId}`;
  }

  private async getTokenVersion(userId: string): Promise<number> {
    const stored = await this.redisService.get<number>(
      this.getTokenVersionKey(userId),
    );
    return stored ?? 0;
  }

  /** Invalidates every refresh token already issued for this user. */
  private async bumpTokenVersion(userId: string): Promise<void> {
    const next = (await this.getTokenVersion(userId)) + 1;
    await this.redisService.set(this.getTokenVersionKey(userId), next);
  }

  private assertAccountUsable(standing: UserAccountStanding | null): void {
    // One message for every case: which of them applies is not something an
    // unauthenticated caller should be able to learn.
    if (
      !standing ||
      standing.deletedAt !== null ||
      !standing.isActive ||
      standing.accountStatus !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Account is not active');
    }
  }

  async refresh(
    refreshToken: string,
    res: Response,
  ): Promise<RefreshResponseDto> {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: jwtConfig.refreshSecret(this.configService) },
      );
    } catch (error) {
      Logger.error('Refresh token validation error:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revocation. A token issued before the last logout, or before any other
    // event that bumped the version, no longer matches.
    const currentVersion = await this.getTokenVersion(payload.id);
    if ((payload.tokenVersion ?? 0) !== currentVersion) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // The account may have been suspended, deactivated or deleted since the
    // token was issued. Nothing checked this before.
    this.assertAccountUsable(
      await this.userService.findAccountStandingById(payload.id),
    );

    const newAccessToken = await this.jwtService.signAsync(
      { id: payload.id, email: payload.email },
      {
        secret: jwtConfig.accessSecret(this.configService),
        expiresIn: jwtConfig.accessExpiresIn(this.configService),
      },
    );

    // Rotate. Reusing the same refresh token for fifteen days gives an
    // attacker who captures it the same lifetime as the legitimate session.
    const newRefreshToken = await this.jwtService.signAsync(
      { id: payload.id, email: payload.email, tokenVersion: currentVersion },
      {
        secret: jwtConfig.refreshSecret(this.configService),
        expiresIn: jwtConfig.refreshExpiresIn(this.configService),
      },
    );

    res.cookie(
      cookieConstants.accessTokenName,
      newAccessToken,
      cookieConstants.accessTokenOptions,
    );
    res.cookie(
      cookieConstants.refreshTokenName,
      newRefreshToken,
      cookieConstants.refreshTokenOptions,
    );

    return {
      success: true,
      message: 'Token refreshed successfully',
    };
  }

  async logout(
    refreshToken: string | undefined,
    res: Response,
  ): Promise<LogoutResponseDto> {
    // Clearing the cookie only stopped this browser from sending the token.
    // Bumping the version makes any copy of it useless. The refresh token
    // identifies the user, so logging out works even with an expired access
    // token.
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
          refreshToken,
          { secret: jwtConfig.refreshSecret(this.configService) },
        );
        await this.bumpTokenVersion(payload.id);
      } catch {
        // An unreadable token means there is no session to revoke; clearing
        // the cookies below is still the right response.
      }
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return {
      success: true,
      message: 'Logout successful',
    };
  }
}
