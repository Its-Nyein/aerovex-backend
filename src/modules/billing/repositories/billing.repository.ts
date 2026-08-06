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

  // Ownership note: billing owns the payment table. The three methods below
  // read and write the user table, which the user module owns, so they breach
  // the module boundary. They are left in place here to keep this commit a
  // behaviour-preserving move; fixing them means either widening the user
  // module's public contract or giving billing its own customer mapping table,
  // which is a schema migration.
  async findUserById(userId: string) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
    });
  }

  async updateUserStripeCustomerId(
    userId: string,
    stripeCustomerId: string,
  ): Promise<void> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  }

  async findUserByStripeCustomerId(stripeCustomerId: string) {
    return this.prismaService.user.findUnique({
      where: { stripeCustomerId },
    });
  }
}
