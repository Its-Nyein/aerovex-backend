import { UserDto } from '../dtos/user.dto';

/**
 * Public contract of the user module.
 *
 * TypeScript interfaces do not exist at runtime, so this Symbol is the
 * injection token other modules use to depend on the contract rather than on
 * UserService itself.
 */
export const USER_ACCOUNT = Symbol('USER_ACCOUNT');

/**
 * The slice of a user that the billing module needs.
 *
 * The user module owns the user table, so billing reaches this data through
 * the contract instead of querying or updating that table itself. Only the
 * fields billing actually consumes are exposed.
 */
export interface UserBillingProfile {
  id: string;
  email: string;
  name: string;
  stripeCustomerId: string | null;
}

export interface UserAccountContract {
  /**
   * Look a user up by email.
   *
   * @param includePasswordField when true the raw user record is returned with
   * its password hash, which credential verification needs. Callers must not
   * expose that value outside their own module.
   */
  findUserByEmail(
    email: string,
    includePasswordField?: boolean,
  ): Promise<UserDto>;

  /**
   * Billing profile for a user id, or null when no such user exists.
   *
   * Unlike findUserById this does not filter out soft-deleted users, because
   * payment events can arrive for an account after it has been deactivated.
   */
  findBillingProfileById(userId: string): Promise<UserBillingProfile | null>;

  /** Billing profile behind a Stripe customer id, or null when unmapped. */
  findBillingProfileByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<UserBillingProfile | null>;

  /** Attach a Stripe customer id to a user. */
  setStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void>;
}
