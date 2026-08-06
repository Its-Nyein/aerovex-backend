import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class BulkRestoreUserDto {
  @ApiProperty({
    description: 'The IDs of the users to restore',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
