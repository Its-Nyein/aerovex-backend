import { ApiProperty } from '@nestjs/swagger';
import { type AccountStatus, accountStatus } from '../enums/enum';
import { Exclude, Expose } from 'class-transformer';
import { RoleDto } from 'src/modules/role/dtos/role.dto';
export class UserDto {
  @ApiProperty({
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    example: 'John Doe',
  })
  @Expose()
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    example: true,
  })
  @Expose()
  isActive: boolean;

  @ApiProperty({
    enum: accountStatus,
    example: accountStatus.ACTIVE,
  })
  @Expose()
  accountStatus: AccountStatus;

  @ApiProperty({
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  roleId: string;

  @ApiProperty({
    type: RoleDto,
  })
  @Expose()
  role: RoleDto;

  @ApiProperty({
    example: '2021-01-01T00:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    example: '2021-01-01T00:00:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserDto>) {
    Object.assign(this, partial);
  }
}
