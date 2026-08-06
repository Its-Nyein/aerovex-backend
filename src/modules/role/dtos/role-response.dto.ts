import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoleDto } from './role.dto';

export class RoleResponseDto {
  @ApiProperty({
    example: true,
    description: 'Operation success status',
  })
  @IsBoolean()
  @IsNotEmpty()
  success: boolean;

  @ApiProperty({
    example: 'Role created successfully',
    description: 'Success message',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    type: RoleDto,
    description: 'Role data',
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => RoleDto)
  role: RoleDto;
}

export class RolesResponseDto {
  @ApiProperty({
    example: true,
    description: 'Operation success status',
  })
  @IsBoolean()
  @IsNotEmpty()
  success: boolean;

  @ApiProperty({
    example: 'All roles fetched successfully',
    description: 'Success message',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    type: [RoleDto],
    description: 'Array of roles',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles: RoleDto[];
}
