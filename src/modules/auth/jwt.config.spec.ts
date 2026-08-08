import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { jwtConfig } from './jwt.config';

describe('jwtConfig', () => {
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
