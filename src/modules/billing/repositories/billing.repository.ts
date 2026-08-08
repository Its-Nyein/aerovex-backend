import { Injectable } from '@nestjs/common';
import type { Payment, PaymentType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export interface CreatePaymentData {
  userId: string;
  stripePaymentIntentId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  amount: number;
  currency: string;
  paymentType: PaymentType;
  description?: string;
}

@Injectable()
export class BillingRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createPayment(data: CreatePaymentData): Promise<Payment> {
    return this.prismaService.payment.create({
      data: {
        userId: data.userId,
        stripePaymentIntentId: data.stripePaymentIntentId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        paymentType: data.paymentType,
        description: data.description,
      },
    });
  }

  async findPaymentById(id: string): Promise<Payment | null> {
    return this.prismaService.payment.findUnique({
      where: { id },
    });
  }

  /**
   * A payment, but only if it belongs to the given user.
   *
   * Scoping in the query rather than fetching by id and comparing afterwards
   * means a caller cannot accidentally leak another user's payment by
   * forgetting the check.
   */
  async findPaymentByIdForUser(
    id: string,
    userId: string,
  ): Promise<Payment | null> {
    return this.prismaService.payment.findFirst({
      where: { id, userId },
    });
  }

  async findPaymentByStripePaymentIntentId(
    stripePaymentIntentId: string,
  ): Promise<Payment | null> {
    return this.prismaService.payment.findUnique({
      where: { stripePaymentIntentId },
    });
  }

  async findPaymentsByUserId(userId: string): Promise<Payment[]> {
    return this.prismaService.payment.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
