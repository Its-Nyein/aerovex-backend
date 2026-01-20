import type { RawBodyRequest } from '@nestjs/common';
import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaymentType } from '@prisma/client';
import type { Request } from 'express';
import { BillingService } from 'src/billing/billing.service';
import { StripeService } from 'src/external-service/stripe/stripe.service';
import type Stripe from 'stripe';

const VALID_PAYMENT_TYPES = [
  'ONE_TIME',
  'RECURRING',
  'SUBSCRIPTION',
  'USAGE_BASED',
] as const;

function isValidPaymentType(value: string): value is PaymentType {
  return (VALID_PAYMENT_TYPES as readonly string[]).includes(value);
}

@ApiTags('webhooks')
@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly billingService: BillingService,
  ) {}

  @Post()
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body is missing');
    }

    let event: Stripe.Event;

    try {
      event = this.stripeService.constructWebhookEvent(rawBody, signature);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Webhook signature verification failed: ${message}`,
      );
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        this.handlePaymentIntentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const { metadata, id, amount, currency } = paymentIntent;

    if (!metadata.userId) {
      console.log('No userId in payment intent metadata, skipping...');
      return;
    }

    const paymentTypeFromMeta: string | undefined = metadata.paymentType;
    const paymentType: PaymentType =
      paymentTypeFromMeta && isValidPaymentType(paymentTypeFromMeta)
        ? paymentTypeFromMeta
        : 'ONE_TIME';

    await this.billingService.saveSuccessfulPayment(
      metadata.userId,
      id,
      amount,
      currency,
      paymentType,
      metadata.description,
    );

    console.log(
      `Payment ${id} succeeded and saved for user ${metadata.userId}`,
    );
  }

  private handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): void {
    const { metadata, id } = paymentIntent;
    console.log(
      `Payment ${id} failed for user ${metadata.userId ?? 'unknown'}`,
    );
    // You can add additional logic here (e.g., send email notification)
  }
}
