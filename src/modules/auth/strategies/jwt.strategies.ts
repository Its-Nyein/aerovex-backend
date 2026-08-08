import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { jwtConfig } from '../jwt.config';
import { JwtUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // ConfigService is injected rather than reading a module-level constant, so
  // the verification secret is resolved after .env has been loaded.
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          const cookies = request?.cookies as
            | { [key: string]: string }
            | undefined;
          return cookies?.access_token ?? null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessSecret(configService),
    });
  }

  validate(payload: JwtUser) {
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }
    return { id: payload.id, email: payload.email };
  }
}
