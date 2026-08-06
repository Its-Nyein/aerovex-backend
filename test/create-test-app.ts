import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { AppModule } from '../src/app.module';

/**
 * Boots the real AppModule with the same middleware main.ts applies.
 *
 * Without this the test app would differ from production in ways that hide
 * bugs: no global api/v1 prefix, no cookie parsing (so the JWT cookie
 * extractor never fires) and no validation pipe.
 *
 * Helmet, CORS and Swagger are left out; they do not affect the behaviour
 * these suites assert.
 */
export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  moduleFixture: TestingModule;
}> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<INestApplication<App>>({
    rawBody: true,
  });

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api/v1');

  await app.init();

  return { app, moduleFixture };
}
