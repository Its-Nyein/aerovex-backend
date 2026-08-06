import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { RoleDto } from '../dtos/role.dto';
import { UpdateRoleDto } from '../dtos/update-role.dto';

@Injectable()
export class RoleRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createRole(data: CreateRoleDto): Promise<RoleDto> {
    return this.prismaService.role.create({
      data: {
        name: data.name,
        permissions: {
          createMany: {
            data: data.permissions.map((permission) => ({
              action: permission.action,
              subject: permission.subject,
            })),
          },
        },
      },
      include: {
        permissions: true,
      },
    });
  }

  async updateRole(id: string, data: UpdateRoleDto): Promise<RoleDto> {
    return this.prismaService.role.update({
      where: { id },
      data: {
        name: data.name,
        ...(data.permissions && {
          permissions: {
            deleteMany: {},
            createMany: {
              data: data.permissions.map((permission) => ({
                action: permission.action,
                subject: permission.subject,
              })),
            },
          },
        }),
      },
      include: {
        permissions: true,
      },
    });
  }

  async findRoleById(id: string): Promise<RoleDto | null> {
    return this.prismaService.role.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });
  }
}
