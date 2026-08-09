import { ApiProperty } from '@nestjs/swagger';
import { RoleDto } from 'src/modules/role/contracts/role.contract';

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
  // Declared here rather than picked from the user module's UserDto. This is
  // auth's own response shape, and UserDto is internal to the user module; the
  // fields are the ones login already returned.
  User: {
    id: string;
    email: string;
    name: string;
    role: RoleDto;
  };
}
