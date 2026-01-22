import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'price_xxxxxxxxxxxxx' })
  @IsString()
  @IsNotEmpty()
  priceId: string;
}
