import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
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
    private readonly prismaService: PrismaService,
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

    const dbUser = await this.prismaService.user.findUnique({
      where: {
        id: user.id,
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!dbUser) throw new UnauthorizedException('User not found');

    const userPermissions = dbUser.role.permissions.map((permission) => ({
      action: permission.action,
      subject: permission.subject,
    }));

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
