import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'create',
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({
    example: 'user',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;
}

export class CreateRoleDto {
  @ApiProperty({
    example: 'admin role',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: [CreatePermissionDto],
    description: 'List of permissions to create for this role',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePermissionDto)
  permissions: CreatePermissionDto[];
}
