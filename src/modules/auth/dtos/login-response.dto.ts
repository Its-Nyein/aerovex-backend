import { ApiProperty } from '@nestjs/swagger';
import { RoleDto } from 'src/modules/role/contracts/role.contract';
import { UserDto } from 'src/modules/user/dtos/user.dto';

export class LoginResponseDto {
  @ApiProperty({
    example: true,
    description: 'Login success',
  })
  success: boolean;

  @ApiProperty({
    example: 'Login successful',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'john.doe@example.com',
      name: 'John Doe',
      role: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'admin',
      },
    },
    description: 'User data',
  })
  User: Pick<UserDto, 'id' | 'email' | 'name'> & {
    role: RoleDto;
  };
}
