import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({
    example: true,
    description: 'Logout success status',
  })
  success: boolean;

  @ApiProperty({
    example: 'Logged out successfully',
    description: 'Success message',
  })
  message: string;
}
