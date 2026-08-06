import { Module } from '@nestjs/common';
import { StripeWebhookController } from './stripe-webhook.controller';
import { ExternalServiceModule } from 'src/external-service/external-service.module';
import { BillingModule } from 'src/modules/billing/billing.module';

@Module({
  imports: [ExternalServiceModule, BillingModule],
  controllers: [StripeWebhookController],
})
export class StripeWebhookModule {}
