import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';
import { createTestApp } from './create-test-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  // Booting the real AppModule is the point of this suite: it resolves the
  // whole dependency graph against a live Postgres and Redis, which the unit
  // specs cannot do.
  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves the health check under the global prefix', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect('Our aerovex backend is running');
  });

  it('does not serve routes without the prefix', () => {
    return request(app.getHttpServer()).get('/health').expect(404);
  });
});
