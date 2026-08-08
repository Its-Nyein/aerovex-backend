import type { RawBodyRequest } from '@nestjs/common';
import {
  BadRequestException,
  Controller,
  Headers,
  Inject,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaymentType } from '@prisma/client';
import type { Request } from 'express';
import { PAYMENT_RECORDER } from 'src/modules/billing/contracts/payment-recorder.contract';
import type { PaymentRecorderContract } from 'src/modules/billing/contracts/payment-recorder.contract';
import { StripeService } from 'src/external-service/stripe/stripe.service';
import type Stripe from 'stripe';

const VALID_PAYMENT_TYPES = ['ONE_TIME', 'RECURRING', 'USAGE_BASED'] as const;

function isValidPaymentType(value: string): value is PaymentType {
  return (VALID_PAYMENT_TYPES as readonly string[]).includes(value);
}

interface InvoiceWithPayment {
  subscription: string | { id: string };
  customer: string | { id: string };
  amount_paid: number;
  currency: string;
}

@ApiTags('webhooks')
// The global ThrottlerGuard allows 20 requests a minute. Stripe delivers events
// in bursts and redelivers anything it cannot deliver, so throttling this route
// turns a spike into 429s and silently delays payments. The signature check is
// what protects this endpoint.
@SkipThrottle()
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    @Inject(PAYMENT_RECORDER)
    private readonly billingService: PaymentRecorderContract,
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

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object);
        break;

      default:
        this.logger.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const { metadata, id, amount, currency } = paymentIntent;

    if (!metadata.userId) {
      this.logger.log('No userId in payment intent metadata, skipping...');
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

    this.logger.log(
      `Payment ${id} succeeded and saved for user ${metadata.userId}`,
    );
  }

  private handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): void {
    const { metadata, id } = paymentIntent;
    this.logger.log(
      `Payment ${id} failed for user ${metadata.userId ?? 'unknown'}`,
    );
  }

  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const invoiceData = invoice as unknown as InvoiceWithPayment;

    if (!invoiceData.subscription || !invoiceData.customer) {
      this.logger.log('⚠️ No subscription or customer in invoice, skipping...');
      return;
    }

    const subscriptionId =
      typeof invoiceData.subscription === 'string'
        ? invoiceData.subscription
        : invoiceData.subscription.id;
    const customerId =
      typeof invoiceData.customer === 'string'
        ? invoiceData.customer
        : invoiceData.customer.id;

    // Find user by Stripe customer ID
    const user =
      await this.billingService.findUserByStripeCustomerId(customerId);

    if (!user) {
      this.logger.log(
        `❌ No user found for Stripe customer ${customerId}, skipping...`,
      );
      return;
    }

    const subscriptionDetails = await this.stripeService
      .getClient()
      .subscriptions.retrieve(subscriptionId);
    const priceId = subscriptionDetails.items.data[0]?.price.id;

    await this.billingService.saveSubscriptionPayment(
      user.id,
      subscriptionId,
      priceId || '',
      invoiceData.amount_paid,
      invoiceData.currency,
      `Subscription payment for ${subscriptionId}`,
      invoice.id,
    );
  }
}
