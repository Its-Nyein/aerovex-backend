import { UserDto } from '../dtos/user.dto';

/**
 * Public contract of the user module.
 *
 * TypeScript interfaces do not exist at runtime, so this Symbol is the
 * injection token other modules use to depend on the contract rather than on
 * UserService itself.
 */
export const USER_ACCOUNT = Symbol('USER_ACCOUNT');

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
}
