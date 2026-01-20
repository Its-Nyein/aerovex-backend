import { Module } from '@nestjs/common';
import { StripeWebhookModule } from './stripe/stripe-webhook.module';

@Module({
  imports: [StripeWebhookModule],
})
export class WebhooksModule {}
