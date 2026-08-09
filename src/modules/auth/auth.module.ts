import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ExternalServiceModule } from 'src/external-service/external-service.module';
import { UserModule } from 'src/modules/user/user.module';
import { AuthController } from './controllers/auth.controller';
import { jwtConfig } from './jwt.config';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategies';

@Module({
  imports: [
    UserModule,
    ExternalServiceModule,
    // registerAsync so the secret is resolved from ConfigService after .env is
    // loaded. The previous register() calls read module-level constants that
    // were evaluated before ConfigModule.forRoot() ran, so every token was
    // signed with a hardcoded default.
    //
    // Registered once, not globally: there were two register({ global: true })
    // calls and the second silently overrode the first. AuthService passes the
    // secret explicitly on every sign, and nothing outside this module injects
    // JwtService.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: jwtConfig.accessSecret(config),
        signOptions: { expiresIn: jwtConfig.accessExpiresIn(config) },
      }),
    }),
  ],
  controllers: [AuthController],
  // Nothing outside auth consumes AuthService. Auth's public surface is its
  // guards and decorators, which are plain imports rather than providers.
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
