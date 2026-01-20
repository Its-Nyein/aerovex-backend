import { Injectable, NotFoundException } from '@nestjs/common';
import type { Payment, PaymentType } from '@prisma/client';
import { BillingRepository } from './billing.repository';
import { StripeService } from 'src/external-service/stripe/stripe.service';
import { CreatePaymentIntentDto } from './dtos/create-payment-intent.dto';

interface PaymentIntentResponse {
  clientSecret: string | null;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

interface PaymentConfirmResponse {
  status: string;
  paymentIntentId: string;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly stripeService: StripeService,
  ) {}

  async getOrCreateStripeCustomer(userId: string): Promise<string> {
    const user = await this.billingRepository.findUserById(userId);

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // If user already has a Stripe customer ID, return it
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    // Create new Stripe customer
    const stripeCustomer = await this.stripeService.createCustomer(
      user.email,
      user.name,
    );

    // Save Stripe customer ID to user
    await this.billingRepository.updateUserStripeCustomerId(
      userId,
      stripeCustomer.id,
    );

    return stripeCustomer.id;
  }

  async createOneTimePaymentIntent(
    userId: string,
    payload: CreatePaymentIntentDto,
  ): Promise<PaymentIntentResponse> {
    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId);

    const paymentIntent = await this.stripeService.createPaymentIntent(
      payload.amount,
      payload.currency ?? 'usd',
      stripeCustomerId,
      {
        userId,
        paymentType: 'ONE_TIME',
        description: payload.description ?? '',
      },
    );

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  }

  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string,
  ): Promise<PaymentConfirmResponse> {
    const paymentIntent = await this.stripeService.confirmPaymentIntent(
      paymentIntentId,
      paymentMethodId,
    );

    return {
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
    };
  }

  async saveSuccessfulPayment(
    userId: string,
    paymentIntentId: string,
    amount: number,
    currency: string,
    paymentType: PaymentType,
    description?: string,
  ): Promise<Payment> {
    return this.billingRepository.createPayment({
      userId,
      stripePaymentIntentId: paymentIntentId,
      amount,
      currency,
      paymentType,
      description,
    });
  }

  async getPaymentHistory(userId: string): Promise<Payment[]> {
    return this.billingRepository.findPaymentsByUserId(userId);
  }

  async getPaymentById(paymentId: string): Promise<Payment> {
    const payment = await this.billingRepository.findPaymentById(paymentId);

    if (!payment) {
      throw new NotFoundException(`Payment with id ${paymentId} not found`);
    }

    return payment;
  }
}
