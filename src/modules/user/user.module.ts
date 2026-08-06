import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { USER_ACCOUNT } from './contracts/user-account.contract';
import { UserController } from './controllers/user.controller';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    {
      provide: USER_ACCOUNT,
      useExisting: UserService,
    },
  ],
  // Only the public contract crosses the module boundary. UserService and
  // UserRepository stay internal so their surface can change freely.
  exports: [USER_ACCOUNT],
})
export class UserModule {}
