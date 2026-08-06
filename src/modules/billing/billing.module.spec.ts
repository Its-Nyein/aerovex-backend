import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from 'src/external-service/stripe/stripe.service';
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
    user: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), BillingModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(StripeService)
      .useValue({})
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
});
