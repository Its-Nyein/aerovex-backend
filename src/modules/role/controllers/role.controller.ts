import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { RoleResponseDto } from '../dtos/role-response.dto';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { UpdateRoleDto } from '../dtos/update-role.dto';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post('')
  @Permissions({ action: 'create', subject: 'role' })
  @ApiOperation({ summary: 'Create role' })
  @ApiResponse({
    status: 201,
    description: 'Role created successfully',
    type: RoleResponseDto,
  })
  async createRole(@Body() payload: CreateRoleDto): Promise<RoleResponseDto> {
    const result = await this.roleService.createRole(payload);
    return {
      success: true,
      message: 'Role created successfully',
      role: result,
    };
  }

  @Put(':id')
  @Permissions({ action: 'update', subject: 'role' })
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({
    status: 200,
    description: 'Role updated successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async updateRole(
    @Param('id') id: string,
    @Body() payload: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const result = await this.roleService.updateRole(id, payload);
    return {
      success: true,
      message: 'Role updated successfully',
      role: result,
    };
  }

  @Get(':id')
  @Permissions({ action: 'view', subject: 'role' })
  @ApiOperation({ summary: 'Get role by id' })
  @ApiResponse({
    status: 200,
    description: 'Role fetched successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Role not found',
  })
  async getRoleById(@Param('id') id: string): Promise<RoleResponseDto> {
    const result = await this.roleService.findRoleById(id);

    if (!result) {
      throw new NotFoundException('Role not found');
    }

    return {
      success: true,
      message: 'Role fetched successfully',
      role: result,
    };
  }
}
