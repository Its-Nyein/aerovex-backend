import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Payment, PaymentType } from '@prisma/client';
import type { PaymentRecorderContract } from '../contracts/payment-recorder.contract';
import { USER_ACCOUNT } from 'src/modules/user/contracts/user-account.contract';
import type {
  UserAccountContract,
  UserBillingProfile,
} from 'src/modules/user/contracts/user-account.contract';
import { BillingRepository } from '../repositories/billing.repository';
import type { CreatePaymentData } from '../repositories/billing.repository';
import { StripeService } from 'src/external-service/stripe/stripe.service';
import { CreatePaymentIntentDto } from '../dtos/create-payment-intent.dto';
import type Stripe from 'stripe';

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

interface SubscriptionResponse {
  subscriptionId: string;
  clientSecret: string | null;
  status: string;
}

interface ExpandedInvoice {
  payment_intent?:
    | {
        client_secret: string | null;
      }
    | string;
}

@Injectable()
export class BillingService implements PaymentRecorderContract {
  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly stripeService: StripeService,
    @Inject(USER_ACCOUNT)
    private readonly userAccount: UserAccountContract,
  ) {}

  async getOrCreateStripeCustomer(userId: string): Promise<string> {
    const user = await this.userAccount.findBillingProfileById(userId);

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
    await this.userAccount.setStripeCustomerId(userId, stripeCustomer.id);

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
    userId: string,
  ): Promise<PaymentConfirmResponse> {
    const stripeCustomerId = await this.requireStripeCustomerId(userId);
    const existing =
      await this.stripeService.retrievePaymentIntent(paymentIntentId);

    if (customerIdOf(existing.customer) !== stripeCustomerId) {
      throw new NotFoundException(
        `Payment intent with id ${paymentIntentId} not found`,
      );
    }

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
    // Stripe redelivers a webhook until it gets a 2xx, so this has to be
    // idempotent. Without the check the retry violated the unique constraint
    // on stripePaymentIntentId, returned 500, and Stripe kept retrying.
    const existing =
      await this.billingRepository.findPaymentByStripePaymentIntentId(
        paymentIntentId,
      );

    if (existing) {
      return existing;
    }

    return this.createPaymentIgnoringDuplicates(
      {
        userId,
        stripePaymentIntentId: paymentIntentId,
        amount,
        currency,
        paymentType,
        description,
      },
      () =>
        this.billingRepository.findPaymentByStripePaymentIntentId(
          paymentIntentId,
        ),
    );
  }

  async getPaymentHistory(userId: string): Promise<Payment[]> {
    return this.billingRepository.findPaymentsByUserId(userId);
  }

  async getPaymentById(paymentId: string, userId: string): Promise<Payment> {
    const payment = await this.billingRepository.findPaymentByIdForUser(
      paymentId,
      userId,
    );

    // Not found rather than forbidden on purpose: a distinct 403 would confirm
    // that someone else's payment exists under this id.
    if (!payment) {
      throw new NotFoundException(`Payment with id ${paymentId} not found`);
    }

    return payment;
  }

  async createSubscription(
    userId: string,
    priceId: string,
  ): Promise<SubscriptionResponse> {
    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId);

    const subscription = await this.stripeService.createSubscription(
      stripeCustomerId,
      priceId,
    );

    let clientSecret: string | null = null;

    if (subscription.latest_invoice) {
      const latestInvoice =
        subscription.latest_invoice as unknown as ExpandedInvoice;
      if (
        latestInvoice.payment_intent &&
        typeof latestInvoice.payment_intent === 'object'
      ) {
        clientSecret = latestInvoice.payment_intent.client_secret || null;
      }
    }

    return {
      subscriptionId: subscription.id,
      clientSecret,
      status: subscription.status,
    };
  }

  async cancelSubscription(
    subscriptionId: string,
    userId: string,
  ): Promise<void> {
    const stripeCustomerId = await this.requireStripeCustomerId(userId);
    const subscription = await this.stripeService
      .getClient()
      .subscriptions.retrieve(subscriptionId);

    if (customerIdOf(subscription.customer) !== stripeCustomerId) {
      throw new NotFoundException(
        `Subscription with id ${subscriptionId} not found`,
      );
    }

    await this.stripeService.cancelSubscription(subscriptionId);
  }

  /**
   * The caller's Stripe customer id, for ownership checks.
   *
   * Unlike getOrCreateStripeCustomer this never creates one: a user with no
   * customer id cannot own any intent or subscription, and a verification path
   * should not have side effects.
   */
  private async requireStripeCustomerId(userId: string): Promise<string> {
    const profile = await this.userAccount.findBillingProfileById(userId);

    if (!profile?.stripeCustomerId) {
      throw new NotFoundException('No billing account for this user');
    }

    return profile.stripeCustomerId;
  }

  async getUserSubscriptions(userId: string): Promise<Stripe.Subscription[]> {
    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId);
    const subscriptions =
      await this.stripeService.listCustomerSubscriptions(stripeCustomerId);
    return subscriptions.data;
  }

  async listPrices(): Promise<Stripe.Price[]> {
    const prices = await this.stripeService.listPrices();
    return prices.data;
  }

  async saveSubscriptionPayment(
    userId: string,
    subscriptionId: string,
    priceId: string,
    amount: number,
    currency: string,
    description?: string,
    invoiceId?: string,
  ): Promise<Payment> {
    // A subscription bills repeatedly, so the subscription id cannot identify
    // one payment. The invoice id can, and it is what makes redelivery of
    // invoice.payment_succeeded safe.
    if (invoiceId) {
      const existing =
        await this.billingRepository.findPaymentByStripeInvoiceId(invoiceId);

      if (existing) {
        return existing;
      }
    }

    return this.createPaymentIgnoringDuplicates(
      {
        userId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        stripeInvoiceId: invoiceId,
        amount,
        currency,
        paymentType: 'RECURRING',
        description,
      },
      () =>
        invoiceId
          ? this.billingRepository.findPaymentByStripeInvoiceId(invoiceId)
          : Promise.resolve(null),
    );
  }

  /**
   * Insert a payment, tolerating a concurrent insert of the same one.
   *
   * The pre-check above closes the common case, but two redeliveries handled
   * at the same time can both pass it. Postgres still rejects the second with
   * a unique violation, so that is treated as "already recorded" and the
   * winning row is returned rather than surfacing a 500 to Stripe.
   */
  private async createPaymentIgnoringDuplicates(
    data: CreatePaymentData,
    reload: () => Promise<Payment | null>,
  ): Promise<Payment> {
    try {
      return await this.billingRepository.createPayment(data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await reload();
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  async findUserByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<UserBillingProfile | null> {
    return this.userAccount.findBillingProfileByStripeCustomerId(
      stripeCustomerId,
    );
  }

  async createSetupIntent(userId: string): Promise<{ clientSecret: string }> {
    const stripeCustomerId = await this.getOrCreateStripeCustomer(userId);
    const setupIntent =
      await this.stripeService.createSetupIntent(stripeCustomerId);

    return {
      clientSecret: setupIntent.client_secret || '',
    };
  }
}

/**
 * Stripe returns the customer either as an id or as an expanded object, and as
 * null when the resource has no customer.
 */
function customerIdOf(
  customer: string | { id: string } | null | undefined,
): string | null {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
}
