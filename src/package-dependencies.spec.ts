import { readFileSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  packageManager?: string;
}

const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
) as PackageJson;

const dependencies = pkg.dependencies ?? {};
const devDependencies = pkg.devDependencies ?? {};

describe('package.json', () => {
  // These are imported by code that runs in production. Declaring them under
  // devDependencies means `pnpm install --prod && node dist/src/main` crashes,
  // which is exactly what happened before.
  const runtimePackages = [
    '@nestjs/jwt',
    '@nestjs/passport',
    'passport',
    'passport-jwt',
    'cookie-parser',
  ];

  it.each(runtimePackages)('declares %s as a dependency', (name) => {
    expect(dependencies).toHaveProperty(name);
    expect(devDependencies).not.toHaveProperty(name);
  });

  it('does not depend on uuid', () => {
    // uuid was imported but never declared, silently resolved through a
    // transitive copy. Node's crypto.randomUUID() produces the same v4 value,
    // so the dependency is gone rather than pinned; recent uuid releases are
    // ESM-only and break the CommonJS test runner.
    expect(dependencies).not.toHaveProperty('uuid');
  });

  it('keeps type-only packages out of dependencies', () => {
    for (const name of Object.keys(dependencies)) {
      expect(name.startsWith('@types/')).toBe(false);
    }
  });

  it('points start:prod at the emitted entrypoint', () => {
    // nest build emits dist/src/main.js, so the original "node dist/main"
    // could never start.
    expect(pkg.scripts?.['start:prod']).toBe('node dist/src/main');
  });

  it('pins pnpm as the package manager', () => {
    expect(pkg.packageManager).toMatch(/^pnpm@/);
  });
});
