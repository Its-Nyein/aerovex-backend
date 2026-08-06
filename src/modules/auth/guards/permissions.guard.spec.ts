import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserAccountContract } from 'src/modules/user/contracts/user-account.contract';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let reflector: { get: jest.Mock };
  let userAccount: { findPermissionsByUserId: jest.Mock };
  let guard: PermissionsGuard;

  const contextFor = (user?: { id: string; email: string }) =>
    ({
      getHandler: () => () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const jwtUser = { id: 'user-1', email: 'john.doe@example.com' };

  beforeEach(() => {
    reflector = { get: jest.fn() };
    userAccount = { findPermissionsByUserId: jest.fn() };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      userAccount as unknown as UserAccountContract,
    );
  });

  it('allows a handler that requires no permissions', async () => {
    reflector.get.mockReturnValue(undefined);

    await expect(guard.canActivate(contextFor(jwtUser))).resolves.toBe(true);
    // No permission metadata means no lookup at all.
    expect(userAccount.findPermissionsByUserId).not.toHaveBeenCalled();
  });

  it('allows a handler whose required permission list is empty', async () => {
    reflector.get.mockReturnValue([]);

    await expect(guard.canActivate(contextFor(jwtUser))).resolves.toBe(true);
    expect(userAccount.findPermissionsByUserId).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    reflector.get.mockReturnValue([{ action: 'view', subject: 'user' }]);

    await expect(guard.canActivate(contextFor(undefined))).rejects.toThrow(
      new UnauthorizedException('User not authenticated'),
    );
  });

  it('rejects when the user contract knows no such user', async () => {
    reflector.get.mockReturnValue([{ action: 'view', subject: 'user' }]);
    userAccount.findPermissionsByUserId.mockResolvedValue(null);

    await expect(guard.canActivate(contextFor(jwtUser))).rejects.toThrow(
      new UnauthorizedException('User not found'),
    );
    expect(userAccount.findPermissionsByUserId).toHaveBeenCalledWith('user-1');
  });

  it('allows when the user holds a required permission', async () => {
    reflector.get.mockReturnValue([{ action: 'view', subject: 'user' }]);
    userAccount.findPermissionsByUserId.mockResolvedValue([
      { action: 'create', subject: 'role' },
      { action: 'view', subject: 'user' },
    ]);

    await expect(guard.canActivate(contextFor(jwtUser))).resolves.toBe(true);
  });

  it('allows when the user holds any one of several required permissions', async () => {
    reflector.get.mockReturnValue([
      { action: 'delete', subject: 'user' },
      { action: 'view', subject: 'user' },
    ]);
    userAccount.findPermissionsByUserId.mockResolvedValue([
      { action: 'view', subject: 'user' },
    ]);

    await expect(guard.canActivate(contextFor(jwtUser))).resolves.toBe(true);
  });

  it('rejects when the user holds none of the required permissions', async () => {
    reflector.get.mockReturnValue([{ action: 'delete', subject: 'user' }]);
    userAccount.findPermissionsByUserId.mockResolvedValue([
      { action: 'view', subject: 'user' },
    ]);

    await expect(guard.canActivate(contextFor(jwtUser))).rejects.toThrow(
      new UnauthorizedException('User does not have the required permissions'),
    );
  });

  it('rejects when a user has no permissions at all', async () => {
    reflector.get.mockReturnValue([{ action: 'view', subject: 'user' }]);
    // An existing user with an empty permission list is not the same as a
    // missing user, and must not be treated as one.
    userAccount.findPermissionsByUserId.mockResolvedValue([]);

    await expect(guard.canActivate(contextFor(jwtUser))).rejects.toThrow(
      new UnauthorizedException('User does not have the required permissions'),
    );
  });

  it('does not match on action alone across different subjects', async () => {
    reflector.get.mockReturnValue([{ action: 'view', subject: 'user' }]);
    userAccount.findPermissionsByUserId.mockResolvedValue([
      { action: 'view', subject: 'role' },
    ]);

    await expect(guard.canActivate(contextFor(jwtUser))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
