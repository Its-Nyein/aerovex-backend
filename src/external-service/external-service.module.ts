import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailPohService } from './email-poh';
import { StripeService } from './stripe/stripe.service';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST'),
          port: configService.get('MAIL_PORT'),
          secure: false,
          auth: {
            user: configService.get('MAIL_USERNAME'),
            pass: configService.get('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: configService.get<string>('MAIL_SENDER'),
        },
        template: {
          dir: join(__dirname, '../templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [EmailPohService, StripeService],
  exports: [EmailPohService, StripeService],
})
export class ExternalServiceModule {}
