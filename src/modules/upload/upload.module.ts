import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadController } from './controllers/upload.controller';
import { UploadService } from './services/upload.service';

@Module({
  // Upload owns no tables. PrismaModule is required only because the
  // controller's PermissionsGuard injects PrismaService, so the guard is
  // resolved from this module's injector. See the auth module refactor.
  imports: [PrismaModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
