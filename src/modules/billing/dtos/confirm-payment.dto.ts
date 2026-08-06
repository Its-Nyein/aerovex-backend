import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({
    description: 'Stripe Payment Intent ID',
    example: 'pi_1234567890',
  })
  @IsString()
  paymentIntentId: string;

  @ApiProperty({
    description: 'Stripe Payment Method ID (from frontend)',
    example: 'pm_1234567890',
  })
  @IsString()
  paymentMethodId: string;
}
