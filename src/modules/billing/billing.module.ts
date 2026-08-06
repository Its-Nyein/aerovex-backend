import { Module } from '@nestjs/common';
import { ExternalServiceModule } from 'src/external-service/external-service.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PAYMENT_RECORDER } from './contracts/payment-recorder.contract';
import { BillingController } from './controllers/billing.controller';
import { BillingRepository } from './repositories/billing.repository';
import { BillingService } from './services/billing.service';

@Module({
  imports: [PrismaModule, ExternalServiceModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingRepository,
    {
      provide: PAYMENT_RECORDER,
      useExisting: BillingService,
    },
  ],
  // Only the public contract crosses the module boundary. BillingService and
  // BillingRepository stay internal so their surface can change freely.
  exports: [PAYMENT_RECORDER],
})
export class BillingModule {}
