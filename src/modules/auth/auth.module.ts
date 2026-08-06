import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constant';
import { JwtStrategy } from './strategies/jwt.strategies';
import { UserModule } from 'src/modules/user/user.module';
import { ExternalServiceModule } from 'src/external-service/external-service.module';

@Module({
  imports: [
    UserModule,
    ExternalServiceModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.accessTokenSecret,
      signOptions: { expiresIn: jwtConstants.accessTokenExpiresIn },
    }),
    JwtModule.register({
      global: true,
      secret: jwtConstants.refreshTokenSecret,
      signOptions: { expiresIn: jwtConstants.refreshTokenExpiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
