import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Amount in cents (e.g., 1000 = $10.00)',
    example: 1000,
  })
  @IsInt()
  @Min(50) // Stripe minimum is 50 cents
  amount: number;

  @ApiProperty({
    description: 'Currency code (e.g., usd, eur)',
    example: 'usd',
    default: 'usd',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'usd';

  @ApiProperty({
    description: 'Description of the payment',
    example: 'Purchase of Premium Feature',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
