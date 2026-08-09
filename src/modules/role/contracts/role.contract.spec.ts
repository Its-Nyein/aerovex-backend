import { PermissionDto, RoleDto } from './role.contract';

describe('role public contract', () => {
  it('re-exports the shapes other modules embed', () => {
    // Enforcement that nothing imports role's internals now lives in
    // module-boundaries.spec.ts, which covers every module rather than only
    // this one.
    expect(RoleDto).toBeDefined();
    expect(PermissionDto).toBeDefined();
  });
});
