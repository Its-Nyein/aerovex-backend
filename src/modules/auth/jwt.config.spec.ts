import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { jwtConfig } from './jwt.config';

describe('jwtConfig', () => {
  // ConfigService falls back to process.env for anything missing from the
  // object it was constructed with, so these tests only prove anything if the
  // real variables are absent. Another spec calling ConfigModule.forRoot()
  // loads .env into process.env for the whole worker, which made this pass or
  // fail depending on file order and on whether a .env existed.
  const JWT_KEYS = [
    'JWT_ACCESS_SECRET_KEY',
    'JWT_REFRESH_SECRET_KEY',
    'JWT_ACCESS_TOKEN_EXPIRES_IN',
    'JWT_REFRESH_TOKEN_EXPIRES_IN',
  ];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of JWT_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of JWT_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  const configFor = (values: Record<string, string>) =>
    new ConfigService(values);

  it('throws instead of falling back when the access secret is missing', () => {
    // The bug this replaces: a missing secret silently resolved to the string
    // 'access-token-secret', which is public in this repository, so anyone
    // could forge a token for any user.
    expect(() => jwtConfig.accessSecret(configFor({}))).toThrow();
  });

  it('throws instead of falling back when the refresh secret is missing', () => {
    expect(() => jwtConfig.refreshSecret(configFor({}))).toThrow();
  });

  it('reads the secrets from configuration', () => {
    const config = configFor({
      JWT_ACCESS_SECRET_KEY: 'access-from-config',
      JWT_REFRESH_SECRET_KEY: 'refresh-from-config',
    });

    expect(jwtConfig.accessSecret(config)).toBe('access-from-config');
    expect(jwtConfig.refreshSecret(config)).toBe('refresh-from-config');
  });

  it('keeps sensible lifetime defaults', () => {
    const config = configFor({});

    // Lifetimes are safe to default; secrets are not.
    expect(jwtConfig.accessExpiresIn(config)).toBe('5m');
    expect(jwtConfig.refreshExpiresIn(config)).toBe('15d');
  });

  it('no longer reads configuration at module load time', () => {
    // The original constant.ts built a `new ConfigService()` at import time and
    // captured the secrets into a frozen object, so ConfigModule.forRoot()
    // loading .env afterwards had no effect. Nothing in the auth module may
    // construct a ConfigService at module scope again.
    const authDir = join(__dirname);
    for (const file of ['constant.ts', 'jwt.config.ts']) {
      const source = readFileSync(join(authDir, file), 'utf8');
      expect(source).not.toMatch(/^const\s+\w+\s*=\s*new ConfigService\(/m);
    }
  });
});
