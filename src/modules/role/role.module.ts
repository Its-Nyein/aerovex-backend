import { Module } from '@nestjs/common';
import { RoleService } from './services/role.service';
import { RoleController } from './controllers/role.controller';
import { RoleRepository } from './repositories/role.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository],
})
export class RoleModule {}
