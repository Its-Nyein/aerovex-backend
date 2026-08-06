import { Module } from '@nestjs/common';
import { RoleService } from './services/role.service';
import { RoleController } from './controllers/role.controller';
import { RoleRepository } from './repositories/role.repository';
import { UserModule } from 'src/modules/user/user.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  // PrismaModule for this module's own repository; UserModule supplies
  // USER_ACCOUNT, which the controller's PermissionsGuard depends on.
  imports: [PrismaModule, UserModule],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository],
})
export class RoleModule {}
