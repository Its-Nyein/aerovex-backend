import { ApiProperty } from '@nestjs/swagger';

export class RefreshResponseDto {
  @ApiProperty({
    example: 'true',
    description: 'Token refreshed success status',
  })
  success: boolean;

  @ApiProperty({
    example: 'Token refreshed successfully',
    description: 'Token refreshed success message',
  })
  message: string;
}
