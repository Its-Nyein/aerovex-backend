import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingRepository } from './billing.repository';
import { ExternalServiceModule } from 'src/external-service/external-service.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ExternalServiceModule],
  controllers: [BillingController],
  providers: [BillingService, BillingRepository],
  exports: [BillingService],
})
export class BillingModule {}
