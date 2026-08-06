import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
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

  it('keeps PrismaService resolvable for the controller guards', () => {
    // Upload owns no tables, but PermissionsGuard injects PrismaService and is
    // resolved from this module's injector. Dropping PrismaModule breaks every
    // guarded route at boot, so the import must stay until the guard depends on
    // an auth-owned contract instead.
    expect(moduleRef.get(PrismaService)).toBeDefined();
  });

  it('does not leak internals outside the module boundary', () => {
    expect(Reflect.getMetadata('exports', UploadModule)).toBeUndefined();
  });
});
