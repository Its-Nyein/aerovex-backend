import { Module } from '@nestjs/common';
import { UserModule } from 'src/modules/user/user.module';
import { UploadController } from './controllers/upload.controller';
import { UploadService } from './services/upload.service';

@Module({
  // Upload owns no tables, so it no longer imports PrismaModule. UserModule
  // is here only to supply USER_ACCOUNT to the controller's PermissionsGuard.
  imports: [UserModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
