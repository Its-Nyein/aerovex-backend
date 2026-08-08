import { PATH_METADATA } from '@nestjs/common/constants';
import { AppController } from './app.controller';

/**
 * The root controller used to expose unauthenticated Redis administration
 * routes: POST /redis/set, GET /redis/get/:key, DELETE /redis/delete/:key and
 * bulk variants, none of them guarded.
 *
 * Anonymous callers could read, overwrite and delete arbitrary keys. That
 * included account_lock:* entries, so anyone could clear their own lockout and
 * defeat the brute-force protection in AuthService, and BullMQ job state.
 *
 * These tests keep them gone.
 */
describe('AppController', () => {
  const prototype = AppController.prototype as unknown as Record<
    string,
    unknown
  >;
  const methodNames = Object.getOwnPropertyNames(prototype).filter(
    (name) => name !== 'constructor',
  );

  it('exposes only the health check', () => {
    expect(methodNames).toEqual(['getHealth']);
  });

  it('serves the health check from the health path', () => {
    const path = Reflect.getMetadata(
      PATH_METADATA,
      prototype.getHealth,
    ) as string;

    expect(path).toBe('health');
  });

  it('has no route handling redis keys', () => {
    for (const name of methodNames) {
      const path = Reflect.getMetadata(PATH_METADATA, prototype[name]) as
        | string
        | undefined;

      expect(path ?? '').not.toContain('redis');
    }
  });

  it('injects nothing, so it cannot reach infrastructure directly', () => {
    // The controller previously injected RedisService. Nothing at the
    // composition root should be reaching into infrastructure like that.
    const dependencies = Reflect.getMetadata(
      'design:paramtypes',
      AppController,
    ) as unknown[] | undefined;

    expect(dependencies ?? []).toEqual([]);
  });
});
