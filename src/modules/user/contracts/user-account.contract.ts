import { RoleDto } from 'src/modules/role/contracts/role.contract';

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

/**
 * A permission granted to a user through their role.
 *
 * Deliberately a plain shape rather than auth's RequiredPermissions type: the
 * user module owns the role and permission joins and must not depend on auth.
 */
export interface UserPermission {
  action: string;
  subject: string;
}

/**
 * What the auth module needs to verify a sign-in.
 *
 * This replaces a findUserByEmail(email, includePasswordField) method that was
 * declared as returning a UserDto but returned the raw record with the password
 * hash when the flag was set, so callers could not tell from the type what they
 * were holding. Naming the hash makes the sensitive field explicit, and the
 * shape carries only what login needs.
 */
export interface UserAuthCredentials {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: RoleDto;
}

export interface UserAccountContract {
  /**
   * Credentials for an email, or null when no active user has it.
   *
   * Returning null rather than throwing is deliberate: it lets the caller
   * answer an unknown email and a wrong password identically, which is what
   * stops the endpoint from being used to enumerate accounts.
   */
  findAuthCredentialsByEmail(
    email: string,
  ): Promise<UserAuthCredentials | null>;

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

  /**
   * Permissions granted to a user through their role.
   *
   * Returns null when no such user exists, which callers treat differently
   * from a user that exists with no permissions.
   */
  findPermissionsByUserId(userId: string): Promise<UserPermission[] | null>;
}
