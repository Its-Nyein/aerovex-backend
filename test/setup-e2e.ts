import { config } from 'dotenv';

// Runs before the test files are imported.
//
// Order matters. dotenv never overwrites a variable that is already present in
// process.env, so DATABASE_URL is pinned to the test database *before* .env is
// loaded. That is what keeps e2e runs off the development database: the suites
// boot the real AppModule, AppService.onModuleInit writes a super admin on
// startup, and the permission suite creates and deletes users and roles.
//
// Without this, the env would only be populated as a side effect of AppModule
// importing ConfigModule.forRoot(), which is too fragile to rely on.
config({ path: '.env.test' });

process.env.DATABASE_URL ??=
  'postgresql://postgres@localhost:5432/aerovex_test?schema=public';
process.env.NODE_ENV ??= 'test';

config();

const databaseName = /\/([^/?]+)(\?|$)/.exec(
  process.env.DATABASE_URL ?? '',
)?.[1];

if (!databaseName?.endsWith('_test')) {
  throw new Error(
    `Refusing to run e2e tests against database "${databaseName ?? 'unknown'}". ` +
      'These suites write to the database. Point DATABASE_URL at a database ' +
      'whose name ends in _test, either in .env.test or in the environment.',
  );
}
