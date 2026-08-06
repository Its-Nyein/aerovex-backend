import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { USER_ACCOUNT } from 'src/modules/user/contracts/user-account.contract';
import type { UserAccountContract } from 'src/modules/user/contracts/user-account.contract';
import { UserModule } from 'src/modules/user/user.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadController } from './controllers/upload.controller';
import { UploadService } from './services/upload.service';
import { UploadModule } from './upload.module';

describe('UploadModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), UploadModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ user: { findUnique: jest.fn() } })
      .compile();
  });

  it('wires the module graph after the move to src/modules/upload', () => {
    expect(moduleRef.get(UploadController)).toBeInstanceOf(UploadController);
    expect(moduleRef.get(UploadService)).toBeInstanceOf(UploadService);
  });

  it('no longer imports PrismaModule', () => {
    // PermissionsGuard now depends on USER_ACCOUNT rather than PrismaService,
    // so upload, which owns no tables, imports UserModule instead.
    const imports = Reflect.getMetadata('imports', UploadModule) as unknown[];

    expect(imports).toEqual([UserModule]);
  });

  it('resolves the guard dependency through the user contract', () => {
    expect(moduleRef.get<UserAccountContract>(USER_ACCOUNT)).toBeDefined();
  });

  it('does not leak internals outside the module boundary', () => {
    expect(Reflect.getMetadata('exports', UploadModule)).toBeUndefined();
  });
});
