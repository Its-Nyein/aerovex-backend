import { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-test-app';

/**
 * End-to-end coverage of the authorization path.
 *
 * PermissionsGuard now reads permissions through the user module's
 * USER_ACCOUNT contract rather than through PrismaService. The unit tests
 * cover its branches with mocks; this suite is the only place the guard runs
 * against a real request, a real JWT and a real database.
 */
describe('Authentication and permissions (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL as string;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD as string;

  const limitedRoleName = 'e2e-no-permissions';
  const limitedEmail = 'e2e-no-permissions@example.com';
  const limitedPassword = 'e2e-password-123';

  let superAdminCookies: string[];
  let limitedCookies: string[];

  const login = async (email: string, password: string) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });
    return response;
  };

  const cookiesOf = (response: request.Response): string[] => {
    const raw = response.headers['set-cookie'];
    return Array.isArray(raw) ? raw : [raw].filter(Boolean);
  };

  // Permissions hold a foreign key to their role, so they have to go first.
  // Doing this defensively rather than assuming the role has none keeps the
  // suite repeatable even if a previous run died midway.
  const removeFixtures = async () => {
    await prisma.user.deleteMany({ where: { email: limitedEmail } });
    const roles = await prisma.role.findMany({
      where: { name: limitedRoleName },
      select: { id: true },
    });
    if (roles.length > 0) {
      await prisma.permission.deleteMany({
        where: { roleId: { in: roles.map((role) => role.id) } },
      });
      await prisma.role.deleteMany({ where: { name: limitedRoleName } });
    }
  };

  beforeAll(async () => {
    ({ app } = await createTestApp());
    prisma = app.get(PrismaService);

    expect(superAdminEmail).toBeTruthy();
    expect(superAdminPassword).toBeTruthy();

    // Remove leftovers from a previous run so the suite is repeatable.
    await removeFixtures();

    const superAdminLogin = await login(superAdminEmail, superAdminPassword);
    expect(superAdminLogin.status).toBe(201);
    superAdminCookies = cookiesOf(superAdminLogin);

    // A role with no permissions at all, created through the real API.
    const role = await prisma.role.create({
      data: { name: limitedRoleName },
    });

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Cookie', superAdminCookies)
      .send({
        name: 'E2E No Permissions',
        email: limitedEmail,
        password: limitedPassword,
        accountStatus: 'ACTIVE',
        isActive: true,
        roleId: role.id,
      })
      .expect(201);

    const limitedLogin = await login(limitedEmail, limitedPassword);
    expect(limitedLogin.status).toBe(201);
    limitedCookies = cookiesOf(limitedLogin);
  });

  afterAll(async () => {
    if (prisma) {
      await removeFixtures();
    }
    await app?.close();
  });

  describe('login', () => {
    it('sets httpOnly access and refresh cookies', () => {
      expect(superAdminCookies.join(';')).toContain('access_token=');
      expect(superAdminCookies.join(';')).toContain('refresh_token=');
      expect(superAdminCookies.join(';')).toContain('HttpOnly');
    });

    it('rejects a wrong password', async () => {
      // Deliberately a throwaway account: failed attempts are tracked in Redis
      // and would lock the super admin for later tests.
      const response = await login(limitedEmail, 'definitely-not-the-password');
      expect(response.status).toBe(401);
    });
  });

  describe('PermissionsGuard against a real request', () => {
    it('rejects an unauthenticated request to a guarded route', () => {
      return request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('allows a user whose role grants the required permission', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Cookie', superAdminCookies);

      expect(response.status).toBe(200);
    });

    it('rejects a user whose role grants no permissions', async () => {
      // The path that regressed most easily in the refactor: the guard has to
      // resolve permissions through USER_ACCOUNT and deny on an empty list,
      // rather than erroring or defaulting to allow.
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Cookie', limitedCookies);

      expect(response.status).toBe(401);
    });

    it('allows a route guarded by authentication only', async () => {
      // /users/me uses JwtAuthGuard without PermissionsGuard, so the
      // permission-less user must still get through.
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Cookie', limitedCookies);

      expect(response.status).toBe(200);
    });
  });
});
