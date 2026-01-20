import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { JwtUser } from 'src/auth/decorators/current-user.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { ConfirmPaymentDto } from './dtos/confirm-payment.dto';
import { CreatePaymentIntentDto } from './dtos/create-payment-intent.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('one-time/create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a payment intent for one-time payment' })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
  })
  async createOneTimePaymentIntent(
    @CurrentUser() user: JwtUser | undefined,
    @Body() payload: CreatePaymentIntentDto,
  ): Promise<{ success: boolean; message: string; data: object }> {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    const result = await this.billingService.createOneTimePaymentIntent(
      user.id,
      payload,
    );
    return {
      success: true,
      message: 'Payment intent created successfully',
      data: result,
    };
  }

  @Post('one-time/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirm a payment (for testing without frontend)' })
  @ApiResponse({
    status: 200,
    description: 'Payment confirmed',
  })
  async confirmPayment(
    @Body() payload: ConfirmPaymentDto,
  ): Promise<{ success: boolean; message: string; data: object }> {
    const result = await this.billingService.confirmPayment(
      payload.paymentIntentId,
      payload.paymentMethodId,
    );
    return {
      success: true,
      message: 'Payment confirmation processed',
      data: result,
    };
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payment history for current user' })
  @ApiResponse({
    status: 200,
    description: 'Payment history retrieved successfully',
  })
  async getPaymentHistory(
    @CurrentUser() user: JwtUser | undefined,
  ): Promise<{ success: boolean; message: string; data: object }> {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    const payments = await this.billingService.getPaymentHistory(user.id);
    return {
      success: true,
      message: 'Payment history retrieved successfully',
      data: payments,
    };
  }

  @Get('payments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a specific payment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment retrieved successfully',
  })
  async getPaymentById(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string; data: object }> {
    const payment = await this.billingService.getPaymentById(id);
    return {
      success: true,
      message: 'Payment retrieved successfully',
      data: payment,
    };
  }
}
