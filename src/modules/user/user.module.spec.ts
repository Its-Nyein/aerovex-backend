import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  USER_ACCOUNT,
  UserAccountContract,
} from './contracts/user-account.contract';
import { UserController } from './controllers/user.controller';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { UserModule } from './user.module';

describe('UserModule', () => {
  let moduleRef: TestingModule;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    moduleRef = await Test.createTestingModule({
      imports: [UserModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
  });

  it('wires the module graph after the move to src/modules/user', () => {
    expect(moduleRef.get(UserController)).toBeInstanceOf(UserController);
    expect(moduleRef.get(UserService)).toBeInstanceOf(UserService);
    expect(moduleRef.get(UserRepository)).toBeInstanceOf(UserRepository);
  });

  it('exports only the public contract, not the concrete providers', () => {
    const exports = Reflect.getMetadata('exports', UserModule) as unknown[];

    expect(exports).toEqual([USER_ACCOUNT]);
    expect(exports).not.toContain(UserService);
    expect(exports).not.toContain(UserRepository);
  });

  it('resolves USER_ACCOUNT to the same instance as UserService', () => {
    // useExisting, so consumers of the contract share the service singleton
    // rather than getting a second instance.
    expect(moduleRef.get<UserAccountContract>(USER_ACCOUNT)).toBe(
      moduleRef.get(UserService),
    );
  });

  it('serves findUserByEmail through the contract', async () => {
    const user = {
      id: 'user-1',
      email: 'john.doe@example.com',
      password: 'hashed',
      role: { id: 'role-1', name: 'admin', permissions: [] },
    };
    prismaMock.user.findUnique.mockResolvedValue(user);

    const account = moduleRef.get<UserAccountContract>(USER_ACCOUNT);
    const result = await account.findUserByEmail(user.email, true);

    // includePasswordField keeps the hash, which is what credential
    // verification in the auth module relies on.
    expect(result).toHaveProperty('password', 'hashed');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: user.email, deletedAt: { equals: null } },
      }),
    );
  });

  it('strips the password when includePasswordField is not set', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'john.doe@example.com',
      password: 'hashed',
      role: { id: 'role-1', name: 'admin', permissions: [] },
    });

    const account = moduleRef.get<UserAccountContract>(USER_ACCOUNT);
    const result = await account.findUserByEmail('john.doe@example.com');

    // UserDto declares password with @Exclude(), so the key survives
    // plainToInstance but the hash is dropped.
    expect(result.password).toBeUndefined();
  });
  describe('billing profile access', () => {
    const record = {
      id: 'user-1',
      email: 'john.doe@example.com',
      name: 'John Doe',
      password: 'hashed',
      stripeCustomerId: 'cus_123',
    };

    it('exposes only the billing fields, never the password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(record);

      const account = moduleRef.get<UserAccountContract>(USER_ACCOUNT);
      const profile = await account.findBillingProfileById('user-1');

      expect(profile).toEqual({
        id: 'user-1',
        email: 'john.doe@example.com',
        name: 'John Doe',
        stripeCustomerId: 'cus_123',
      });
    });

    it('does not filter out soft-deleted users', async () => {
      prismaMock.user.findUnique.mockResolvedValue(record);

      const account = moduleRef.get<UserAccountContract>(USER_ACCOUNT);
      await account.findBillingProfileById('user-1');

      // Payment events can arrive after deactivation, so this lookup must
      // match the query billing previously ran: no deletedAt filter.
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('resolves a profile from a stripe customer id', async () => {
      prismaMock.user.findUnique.mockResolvedValue(record);

      const account = moduleRef.get<UserAccountContract>(USER_ACCOUNT);
      const profile =
        await account.findBillingProfileByStripeCustomerId('cus_123');

      expect(profile?.id).toBe('user-1');
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_123' },
      });
    });

    it('returns null when no user matches', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const account = moduleRef.get<UserAccountContract>(USER_ACCOUNT);
      await expect(
        account.findBillingProfileById('missing'),
      ).resolves.toBeNull();
    });

    it('writes the stripe customer id', async () => {
      const account = moduleRef.get<UserAccountContract>(USER_ACCOUNT);
      await account.setStripeCustomerId('user-1', 'cus_new');

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { stripeCustomerId: 'cus_new' },
      });
    });
  });
});
