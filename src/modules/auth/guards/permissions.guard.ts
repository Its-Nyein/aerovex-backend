import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_ACCOUNT } from 'src/modules/user/contracts/user-account.contract';
import type { UserAccountContract } from 'src/modules/user/contracts/user-account.contract';
import {
  PERMISSION_METADATA_KEY,
  RequiredPermissions,
} from '../decorators/permissions.decorator';
import { Request } from 'express';
import { JwtUser } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    // The user module owns the user, role and permission tables, so the guard
    // reads them through its contract rather than through PrismaService. That
    // is what lets modules with guarded controllers depend on UserModule
    // instead of PrismaModule.
    @Inject(USER_ACCOUNT)
    private readonly userAccount: UserAccountContract,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<RequiredPermissions[]>(
      PERMISSION_METADATA_KEY,
      context.getHandler(),
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const httpRequest = context.switchToHttp().getRequest<Request>();
    const user = httpRequest.user as JwtUser | undefined;
    if (!user) throw new UnauthorizedException('User not authenticated');

    const userPermissions = await this.userAccount.findPermissionsByUserId(
      user.id,
    );

    if (!userPermissions) throw new UnauthorizedException('User not found');

    // check if user has at least one of the required permissions
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.some(
        (userPermission) =>
          userPermission.action === permission.action &&
          userPermission.subject === permission.subject,
      ),
    );

    if (!hasPermission)
      throw new UnauthorizedException(
        'User does not have the required permissions',
      );
    return true;
  }
}
