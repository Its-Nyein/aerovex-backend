import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { CronService } from './cron/cron.service';
import { ExternalServiceModule } from './external-service/external-service.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueuesModule } from './queues/queues.module';
import { RedisModule } from './redis/redis.module';
import { RoleModule } from './modules/role/role.module';
import { UploadModule } from './upload/upload.module';
import { UserModule } from './user/user.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          // 20 requests per minute for testing purposes
          limit: 20,
        },
      ],
    }),
    UserModule,
    PrismaModule,
    AuthModule,
    RoleModule,
    RedisModule,
    UploadModule,
    ExternalServiceModule,
    QueuesModule,
    BillingModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CronService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*path');
  }
}
