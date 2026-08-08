import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from 'src/external-service/stripe/stripe.service';
import { USER_ACCOUNT } from 'src/modules/user/contracts/user-account.contract';
import { PrismaService } from 'src/prisma/prisma.service';
import { BillingModule } from './billing.module';
import {
  PAYMENT_RECORDER,
  PaymentRecorderContract,
} from './contracts/payment-recorder.contract';
import { BillingController } from './controllers/billing.controller';
import { BillingRepository } from './repositories/billing.repository';
import { BillingService } from './services/billing.service';

describe('BillingModule', () => {
  let moduleRef: TestingModule;

  const prismaMock = {
    payment: { create: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
  };

  const stripeMock = { createCustomer: jest.fn() };

  const userAccountMock = {
    findAuthCredentialsByEmail: jest.fn(),
    findBillingProfileById: jest.fn(),
    findBillingProfileByStripeCustomerId: jest.fn(),
    setStripeCustomerId: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), BillingModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(StripeService)
      .useValue(stripeMock)
      .overrideProvider(USER_ACCOUNT)
      .useValue(userAccountMock)
      .compile();
  });

  it('wires the module graph after the move to src/modules/billing', () => {
    expect(moduleRef.get(BillingController)).toBeInstanceOf(BillingController);
    expect(moduleRef.get(BillingService)).toBeInstanceOf(BillingService);
    expect(moduleRef.get(BillingRepository)).toBeInstanceOf(BillingRepository);
  });

  it('exports only the public contract, not the concrete providers', () => {
    const exports = Reflect.getMetadata('exports', BillingModule) as unknown[];

    expect(exports).toEqual([PAYMENT_RECORDER]);
    expect(exports).not.toContain(BillingService);
    expect(exports).not.toContain(BillingRepository);
  });

  it('resolves PAYMENT_RECORDER to the same instance as BillingService', () => {
    expect(moduleRef.get<PaymentRecorderContract>(PAYMENT_RECORDER)).toBe(
      moduleRef.get(BillingService),
    );
  });

  it('records a successful one-time payment through the contract', async () => {
    const payment = { id: 'payment-1' };
    prismaMock.payment.create.mockResolvedValue(payment);

    const recorder = moduleRef.get<PaymentRecorderContract>(PAYMENT_RECORDER);
    await expect(
      recorder.saveSuccessfulPayment(
        'user-1',
        'pi_123',
        2000,
        'usd',
        'ONE_TIME',
        'a description',
      ),
    ).resolves.toBe(payment);

    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        stripePaymentIntentId: 'pi_123',
        stripeSubscriptionId: undefined,
        stripePriceId: undefined,
        amount: 2000,
        // the repository upper-cases the currency before persisting
        currency: 'USD',
        paymentType: 'ONE_TIME',
        description: 'a description',
      },
    });
  });

  it('records a subscription payment through the contract', async () => {
    const payment = { id: 'payment-2' };
    prismaMock.payment.create.mockResolvedValue(payment);

    const recorder = moduleRef.get<PaymentRecorderContract>(PAYMENT_RECORDER);
    await expect(
      recorder.saveSubscriptionPayment(
        'user-1',
        'sub_123',
        'price_123',
        500,
        'eur',
      ),
    ).resolves.toBe(payment);

    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        stripePaymentIntentId: undefined,
        stripeSubscriptionId: 'sub_123',
        stripePriceId: 'price_123',
        amount: 500,
        currency: 'EUR',
        paymentType: 'RECURRING',
        description: undefined,
      },
    });
  });
  describe('user data ownership', () => {
    it('reads the stripe customer id through the user contract', async () => {
      userAccountMock.findBillingProfileById.mockResolvedValue({
        id: 'user-1',
        email: 'john.doe@example.com',
        name: 'John Doe',
        stripeCustomerId: 'cus_existing',
      });

      const service = moduleRef.get(BillingService);
      await expect(service.getOrCreateStripeCustomer('user-1')).resolves.toBe(
        'cus_existing',
      );

      expect(userAccountMock.findBillingProfileById).toHaveBeenCalledWith(
        'user-1',
      );
      // Billing must not query the user table itself.
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      expect(stripeMock.createCustomer).not.toHaveBeenCalled();
    });

    it('writes a new stripe customer id through the user contract', async () => {
      userAccountMock.findBillingProfileById.mockResolvedValue({
        id: 'user-1',
        email: 'john.doe@example.com',
        name: 'John Doe',
        stripeCustomerId: null,
      });
      stripeMock.createCustomer.mockResolvedValue({ id: 'cus_new' });

      const service = moduleRef.get(BillingService);
      await expect(service.getOrCreateStripeCustomer('user-1')).resolves.toBe(
        'cus_new',
      );

      expect(stripeMock.createCustomer).toHaveBeenCalledWith(
        'john.doe@example.com',
        'John Doe',
      );
      expect(userAccountMock.setStripeCustomerId).toHaveBeenCalledWith(
        'user-1',
        'cus_new',
      );
      // The user table write goes through the contract, not Prisma.
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('throws when the user contract knows no such user', async () => {
      userAccountMock.findBillingProfileById.mockResolvedValue(null);

      const service = moduleRef.get(BillingService);
      await expect(
        service.getOrCreateStripeCustomer('missing'),
      ).rejects.toThrow('User with id missing not found');
    });
  });
});
