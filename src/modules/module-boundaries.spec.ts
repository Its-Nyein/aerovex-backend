import { readdirSync, readFileSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * The published surface of each module, mirroring MODULE_PUBLIC_SURFACE in
 * eslint.config.mjs.
 *
 * The lint rule is the primary guard and gives feedback in the editor, but its
 * patterns only match absolute specifiers such as
 * 'src/modules/user/services/user.service'. A relative cross-module import like
 * '../../user/services/user.service' slips straight past it. This test closes
 * that gap by reading the source, so both forms are covered.
 */
const MODULE_PUBLIC_SURFACE: Record<string, string[]> = {
  auth: ['guards', 'decorators'],
  billing: ['contracts'],
  role: ['contracts'],
  upload: [],
  user: ['contracts'],
};

const SRC_DIR = join(__dirname, '..');
const MODULES_DIR = join(SRC_DIR, 'modules');

function typescriptFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return typescriptFilesUnder(full);
    return entry.isFile() && full.endsWith('.ts') ? [full] : [];
  });
}

function isPublic(moduleName: string, importedPath: string): boolean {
  if (importedPath === `${moduleName}.module`) return true;

  const [firstSegment] = importedPath.split('/');
  return MODULE_PUBLIC_SURFACE[moduleName].includes(firstSegment);
}

describe('module boundaries', () => {
  const moduleNames = Object.keys(MODULE_PUBLIC_SURFACE);

  it('covers every module that exists on disk', () => {
    // A new module must be given a surface here, otherwise it would be
    // unguarded and this suite would quietly pass.
    const onDisk = readdirSync(MODULES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect(onDisk).toEqual([...moduleNames].sort());
  });

  it.each(moduleNames)(
    'lets nothing outside %s import its internals',
    (moduleName) => {
      const moduleDir = join(MODULES_DIR, moduleName);
      const offenders: string[] = [];

      for (const file of typescriptFilesUnder(SRC_DIR)) {
        if (file.startsWith(moduleDir + sep)) continue;
        // This file quotes example paths in its own documentation.
        if (file === __filename) continue;

        readFileSync(file, 'utf8')
          .split('\n')
          .forEach((line, index) => {
            // Absolute (src/modules/user/x) and relative (../../user/x).
            const match = new RegExp(
              `['"](?:src/modules/|(?:\\.\\./)+)${moduleName}/([^'"]+)['"]`,
            ).exec(line);

            if (match && !isPublic(moduleName, match[1])) {
              offenders.push(
                `${relative(SRC_DIR, file)}:${index + 1} -> ${match[1]}`,
              );
            }
          });
      }

      expect(offenders).toEqual([]);
    },
  );
});
