import { readdirSync, readFileSync } from 'fs';
import { join, relative, sep } from 'path';
import { PermissionDto, RoleDto } from './role.contract';

const SRC_DIR = join(__dirname, '..', '..', '..');
const ROLE_DIR = join(SRC_DIR, 'modules', 'role');

function typescriptFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return typescriptFilesUnder(full);
    return entry.isFile() && full.endsWith('.ts') ? [full] : [];
  });
}

describe('role public contract', () => {
  it('re-exports the shapes other modules embed', () => {
    expect(RoleDto).toBeDefined();
    expect(PermissionDto).toBeDefined();
  });

  it('is the only role path other modules import from', () => {
    // Any import of src/modules/role/... that is not the contract is a reach
    // into role's internals. Keeping this mechanical means the boundary holds
    // as new modules are added, rather than relying on reviewer memory.
    const offenders: string[] = [];

    for (const file of typescriptFilesUnder(SRC_DIR)) {
      if (file.startsWith(ROLE_DIR + sep)) continue;

      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          // Absolute (src/modules/role/x) and relative (../../role/x) forms.
          const match =
            /['"](?:src\/modules\/|(?:\.\.\/)+)role\/([^'"]+)['"]/.exec(line);
          // role.module is the class the composition root wires up; the
          // contract is the published surface. Anything else is internal.
          const allowed = ['contracts/role.contract', 'role.module'];
          if (match && !allowed.includes(match[1])) {
            offenders.push(
              `${relative(SRC_DIR, file)}:${index + 1} -> ${match[1]}`,
            );
          }
        });
    }

    expect(offenders).toEqual([]);
  });
});
