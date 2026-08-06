import type { Payment, PaymentType, User } from '@prisma/client';

/**
 * Public contract of the billing module.
 *
 * TypeScript interfaces do not exist at runtime, so this Symbol is the
 * injection token consumers use to depend on the contract rather than on
 * BillingService itself.
 *
 * The surface is limited to what the Stripe webhook needs to record the
 * outcome of a payment. Everything the billing HTTP API offers (creating
 * intents, subscriptions, setup intents) stays internal.
 */
export const PAYMENT_RECORDER = Symbol('PAYMENT_RECORDER');

export interface PaymentRecorderContract {
  saveSuccessfulPayment(
    userId: string,
    paymentIntentId: string,
    amount: number,
    currency: string,
    paymentType: PaymentType,
    description?: string,
  ): Promise<Payment>;

  saveSubscriptionPayment(
    userId: string,
    subscriptionId: string,
    priceId: string,
    amount: number,
    currency: string,
    description?: string,
  ): Promise<Payment>;

  /**
   * Resolve the account behind a Stripe customer id.
   *
   * This reads the user table, which the billing module does not own. See the
   * ownership note in BillingRepository.
   */
  findUserByStripeCustomerId(stripeCustomerId: string): Promise<User | null>;
}
