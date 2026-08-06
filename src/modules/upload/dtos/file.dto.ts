import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class FileDto {
  @ApiProperty({
    format: 'string',
    example: 'file.png',
  })
  @Expose()
  key: string;

  @ApiProperty({
    example: 'https://file.png',
  })
  @Expose()
  url: string;
}
