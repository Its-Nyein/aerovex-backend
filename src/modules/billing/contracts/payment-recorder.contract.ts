import type { Payment, PaymentType } from '@prisma/client';
import type { UserBillingProfile } from 'src/modules/user/contracts/user-account.contract';

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
   * Billing does not own the user table, so this is served through the user
   * module's contract.
   */
  findUserByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<UserBillingProfile | null>;
}
