import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { USER_ACCOUNT } from 'src/modules/user/contracts/user-account.contract';
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
    const user = await this.userService.findUserByEmail(email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.checkAccountLocked(user.id);

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await this.incrementFailedAttempts(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.resetFailedAttempts(user.id);

    const payload = {
      id: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtConfig.accessSecret(this.configService),
      expiresIn: jwtConfig.accessExpiresIn(this.configService),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: jwtConfig.refreshSecret(this.configService),
      expiresIn: jwtConfig.refreshExpiresIn(this.configService),
    });

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

    // Just for testing purposes
    // try {
    //   await this.emailPohService.welcomeEmail({
    //     to: user.email,
    //     name: user.name,
    //     verificationUrl: `${process.env.AEROVEX_FRONTEND_URL}/verify-email`,
    //   });
    //   Logger.log(`Login notification email sent to ${user.email}`);
    // } catch (error) {
    //   Logger.error(
    //     `Failed to send login notification email to ${user.email}:`,
    //     error,
    //   );
    // }

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

  async refresh(
    refreshToken: string,
    res: Response,
  ): Promise<RefreshResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtUser>(refreshToken, {
        secret: jwtConfig.refreshSecret(this.configService),
      });

      const newAccessToken = await this.jwtService.signAsync(
        { id: payload.id, email: payload.email },
        {
          secret: jwtConfig.accessSecret(this.configService),
          expiresIn: jwtConfig.accessExpiresIn(this.configService),
        },
      );

      res.cookie(
        cookieConstants.accessTokenName,
        newAccessToken,
        cookieConstants.accessTokenOptions,
      );

      return {
        success: true,
        message: 'Token refreshed successfully',
      };
    } catch (error: any) {
      Logger.error('Refresh token validation error:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  logout(res: Response): LogoutResponseDto {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return {
      success: true,
      message: 'Logout successful',
    };
  }
}
