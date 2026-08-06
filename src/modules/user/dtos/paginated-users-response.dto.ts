import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';

export class PaginatedUsersResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Users fetched successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Array of users',
    type: [UserDto],
  })
  users: UserDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 50,
      page: 1,
      limit: 10,
      totalPages: 5,
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
