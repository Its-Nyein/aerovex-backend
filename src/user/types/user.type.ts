import { Permission, Role, User as UserModel } from '@prisma/client';

export type User = UserModel;

export type UserWithRoleAndPermission = User & {
  role: Role & {
    permissions: Permission[];
  };
};

export type SafeUser = Omit<User, 'password'>;

export type SafeUserWithRole = User & {
  role: Role;
};

export type SafeUserWithRoleAndPermission = SafeUser & {
  role: Role & {
    permissions: Permission[];
  };
};
