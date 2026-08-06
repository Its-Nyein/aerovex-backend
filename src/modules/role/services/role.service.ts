import { Injectable } from '@nestjs/common';
import { RoleRepository } from '../repositories/role.repository';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { RoleDto } from '../dtos/role.dto';
import { UpdateRoleDto } from '../dtos/update-role.dto';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async createRole(data: CreateRoleDto): Promise<RoleDto> {
    return this.roleRepository.createRole(data);
  }

  async updateRole(id: string, data: UpdateRoleDto): Promise<RoleDto> {
    return this.roleRepository.updateRole(id, data);
  }

  async findRoleById(id: string): Promise<RoleDto | null> {
    return this.roleRepository.findRoleById(id);
  }
}
