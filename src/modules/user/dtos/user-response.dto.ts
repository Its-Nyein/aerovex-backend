import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';
import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({
    example: true,
    description: 'Operation success status',
  })
  @IsBoolean()
  @IsNotEmpty()
  success: boolean;

  @ApiProperty({
    example: 'User created successfully',
    description: 'Success message',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    type: UserDto,
    description: 'User data',
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => UserDto)
  user: UserDto;
}

export class UsersResponseDto {
  @ApiProperty({
    example: true,
    description: 'Operation success status',
  })
  @IsBoolean()
  @IsNotEmpty()
  success: boolean;

  @ApiProperty({
    example: 'All users fetched successfully',
    description: 'Success message',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    type: [UserDto],
    description: 'Array of users',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserDto)
  users: UserDto[];
}
