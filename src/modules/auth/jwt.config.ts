import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

/**
 * Single place the JWT settings are read from configuration.
 *
 * Every accessor takes a ConfigService and uses getOrThrow, so the process
 * fails loudly on a missing secret rather than falling back to a default that
 * anyone reading this repository could use to forge tokens.
 *
 * These are functions rather than constants so they are evaluated when a
 * provider is constructed or a request is served, never at module load.
 */
export const jwtConfig = {
  accessSecret: (config: ConfigService): string =>
    config.getOrThrow<string>('JWT_ACCESS_SECRET_KEY'),

  refreshSecret: (config: ConfigService): string =>
    config.getOrThrow<string>('JWT_REFRESH_SECRET_KEY'),

  accessExpiresIn: (config: ConfigService): StringValue =>
    config.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN', '5m') as StringValue,

  refreshExpiresIn: (config: ConfigService): StringValue =>
    config.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN', '15d') as StringValue,
};
