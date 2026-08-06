import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { accountStatus, type AccountStatus } from '../enums/enum';

export class CreateUserDto {
  @ApiProperty({
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    enum: accountStatus,
    example: accountStatus.ACTIVE,
  })
  @IsEnum(accountStatus)
  @IsNotEmpty()
  accountStatus: AccountStatus;

  @ApiProperty({
    example: true,
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  roleId: string;
}
