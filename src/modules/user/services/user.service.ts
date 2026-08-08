import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  UserAccountContract,
  UserAccountStanding,
  UserAuthCredentials,
  UserBillingProfile,
  UserPermission,
} from '../contracts/user-account.contract';
import { UserRepository } from '../repositories/user.repository';
import { UserDto } from '../dtos/user.dto';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from '../dtos/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { BulkDeleteUserDto } from '../dtos/bulk-delete-user.dto';
import { BulkRestoreUserDto } from '../dtos/bulk-restore-user.dto';

@Injectable()
export class UserService implements UserAccountContract {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(payload: CreateUserDto): Promise<UserDto> {
    const exitsUser = await this.userRepository.findUserByEmail(payload.email);
    if (exitsUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);

    const user = await this.userRepository.createUser({
      ...payload,
      password: hashedPassword,
    });

    return plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async updateUser(id: string, payload: UpdateUserDto): Promise<UserDto> {
    const exitsUser = await this.userRepository.findUserById(id);
    if (!exitsUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    if (payload.email) {
      const exitsUserWithEmail = await this.userRepository.findUserByEmail(
        payload.email,
      );
      if (exitsUserWithEmail) {
        throw new ConflictException('User with email already exists');
      }
    }

    const user = await this.userRepository.updateUser(id, payload);
    return plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async deleteUser(id: string): Promise<UserDto> {
    const user = await this.userRepository.deleteUser(id);
    return plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async findAllUsers(): Promise<UserDto[]> {
    const users = await this.userRepository.findAllUsers();
    return users.map((user) =>
      plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async findUserById(
    id: string,
    includePasswordField = false,
  ): Promise<UserDto> {
    const user = await this.userRepository.findUserById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return !includePasswordField
      ? plainToInstance(UserDto, user, {
          excludeExtraneousValues: true,
        })
      : user;
  }

  async findUserByEmail(
    email: string,
    includePasswordField = false,
  ): Promise<UserDto> {
    const user = await this.userRepository.findUserByEmail(email);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return !includePasswordField
      ? plainToInstance(UserDto, user, {
          excludeExtraneousValues: true,
        })
      : user;
  }

  async getAllUserwithPaginated(
    page: number = 1,
    limit: number = 10,
    query?: string,
  ): Promise<{
    users: UserDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.userRepository.getAllUserwithPaginated(
      page,
      limit,
      query,
    );

    const users = result.users.map((user) =>
      plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      }),
    );

    return {
      ...result,
      users,
    };
  }

  async softDeleteUser(id: string): Promise<UserDto> {
    const user = await this.userRepository.findUserById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const deletedUser = await this.userRepository.softDeleteUser(id);
    return plainToInstance(UserDto, deletedUser, {
      excludeExtraneousValues: true,
    });
  }

  async restoreUser(id: string): Promise<UserDto> {
    const user = await this.userRepository.findSoftDeletedUserById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const restoredUser = await this.userRepository.restoreUser(id);
    return plainToInstance(UserDto, restoredUser, {
      excludeExtraneousValues: true,
    });
  }

  async bulkSoftDeleteUsers(
    payload: BulkDeleteUserDto,
  ): Promise<{ success: boolean; message: string }> {
    if (payload.ids.length === 0) {
      throw new BadRequestException('Ids are required');
    }

    const users = await this.userRepository.findUsersByIds(payload.ids);
    const foundIds = new Set(users.map((user) => user.id));
    const missingIds = payload.ids.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Users not found for ids: ${missingIds.join(', ')}`,
      );
    }

    await this.userRepository.bulkSoftDeleteUsers(payload.ids);
    return { success: true, message: 'Users bulk soft deleted successfully' };
  }

  async bulkRestoreUsers(
    payload: BulkRestoreUserDto,
  ): Promise<{ success: boolean; message: string }> {
    if (payload.ids.length === 0) {
      throw new BadRequestException('Ids are required');
    }

    const users = await this.userRepository.findSoftDeletedUsersByIds(
      payload.ids,
    );
    const foundIds = new Set(users.map((user) => user.id));
    const missingIds = payload.ids.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Users not found for ids: ${missingIds.join(', ')}`,
      );
    }

    await this.userRepository.bulkRestoreUsers(payload.ids);
    return { success: true, message: 'Users bulk restored successfully' };
  }

  async findAuthCredentialsByEmail(
    email: string,
  ): Promise<UserAuthCredentials | null> {
    const user = await this.userRepository.findUserByEmail(email);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.password,
      role: user.role,
      isActive: user.isActive,
      accountStatus: user.accountStatus,
    };
  }

  async findAccountStandingById(
    userId: string,
  ): Promise<UserAccountStanding | null> {
    return this.userRepository.findAccountStandingById(userId);
  }

  async findBillingProfileById(
    userId: string,
  ): Promise<UserBillingProfile | null> {
    const user = await this.userRepository.findBillingProfileById(userId);
    return user && toBillingProfile(user);
  }

  async findBillingProfileByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<UserBillingProfile | null> {
    const user =
      await this.userRepository.findBillingProfileByStripeCustomerId(
        stripeCustomerId,
      );
    return user && toBillingProfile(user);
  }

  async setStripeCustomerId(
    userId: string,
    stripeCustomerId: string,
  ): Promise<void> {
    await this.userRepository.setStripeCustomerId(userId, stripeCustomerId);
  }

  async findPermissionsByUserId(
    userId: string,
  ): Promise<UserPermission[] | null> {
    const user = await this.userRepository.findPermissionsByUserId(userId);

    if (!user) {
      return null;
    }

    return user.role.permissions.map((permission) => ({
      action: permission.action,
      subject: permission.subject,
    }));
  }
}

function toBillingProfile(user: {
  id: string;
  email: string;
  name: string;
  stripeCustomerId: string | null;
}): UserBillingProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    stripeCustomerId: user.stripeCustomerId,
  };
}
