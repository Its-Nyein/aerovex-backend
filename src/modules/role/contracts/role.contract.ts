/**
 * Public contract of the role module.
 *
 * Modules that embed a role in their own responses, such as user and auth,
 * import these shapes from here. Everything else under role/ is internal and
 * must not be imported from outside the module; role.contract.spec.ts enforces
 * that.
 *
 * Unlike USER_ACCOUNT and PAYMENT_RECORDER this contract carries no injection
 * token. Nothing outside the role module calls role behaviour, only describes
 * role data, so there is no provider to expose.
 */
export { PermissionDto, RoleDto } from '../dtos/role.dto';
