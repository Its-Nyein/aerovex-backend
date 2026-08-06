import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { JwtUser } from 'src/modules/auth/decorators/current-user.decorator';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { BillingService } from '../services/billing.service';
import { ConfirmPaymentDto } from '../dtos/confirm-payment.dto';
import { CreatePaymentIntentDto } from '../dtos/create-payment-intent.dto';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';

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

  @Post('subscription/create')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  async createSubscription(
    @CurrentUser() user: JwtUser | undefined,
    @Body() payload: CreateSubscriptionDto,
  ): Promise<{ success: boolean; message: string; data: object }> {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    const result = await this.billingService.createSubscription(
      user.id,
      payload.priceId,
    );
    return {
      success: true,
      message: 'Subscription created successfully',
      data: result,
    };
  }

  @Delete('subscription/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel a subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
  })
  async cancelSubscription(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.billingService.cancelSubscription(id);
    return {
      success: true,
      message: 'Subscription cancelled successfully',
    };
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get subscriptions for current user' })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions retrieved successfully',
  })
  async getUserSubscriptions(
    @CurrentUser() user: JwtUser | undefined,
  ): Promise<{ success: boolean; message: string; data: object }> {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    const subscriptions = await this.billingService.getUserSubscriptions(
      user.id,
    );
    return {
      success: true,
      message: 'Subscriptions retrieved successfully',
      data: subscriptions,
    };
  }

  @Get('prices')
  @ApiOperation({ summary: 'Get all active prices from Stripe' })
  @ApiResponse({
    status: 200,
    description: 'Prices retrieved successfully',
  })
  async getPrices(): Promise<{
    success: boolean;
    message: string;
    data: object;
  }> {
    const prices = await this.billingService.listPrices();
    return {
      success: true,
      message: 'Prices retrieved successfully',
      data: prices,
    };
  }

  @Post('subscription/setup-intent')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create setup intent for subscription payment method',
  })
  @ApiResponse({
    status: 201,
    description: 'Setup intent created successfully',
  })
  async createSetupIntent(
    @CurrentUser() user: JwtUser | undefined,
  ): Promise<{ success: boolean; message: string; data: object }> {
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    const result = await this.billingService.createSetupIntent(user.id);
    return {
      success: true,
      message: 'Setup intent created successfully',
      data: result,
    };
  }
}
