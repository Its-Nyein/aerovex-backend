import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { AuthModule } from './auth.module';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategies';

// RedisModule is @Global in the application, so the stub has to be global too
// for AuthService to resolve RedisService.
@Global()
@Module({
  providers: [{ provide: RedisService, useValue: { get: jest.fn() } }],
  exports: [RedisService],
})
class RedisStubModule {}

describe('AuthModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisStubModule,
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({ user: { findUnique: jest.fn() } })
      .compile();
  });

  it('wires the module graph after the move to src/modules/auth', () => {
    expect(moduleRef.get(AuthController)).toBeInstanceOf(AuthController);
    expect(moduleRef.get(AuthService)).toBeInstanceOf(AuthService);
    expect(moduleRef.get(JwtStrategy)).toBeInstanceOf(JwtStrategy);
  });

  it('exports AuthService and nothing else', () => {
    expect(Reflect.getMetadata('exports', AuthModule)).toEqual([AuthService]);
  });

  it('still couples PermissionsGuard to PrismaService', () => {
    // Current state, not the target one. PermissionsGuard takes PrismaService
    // as a constructor dependency, which is why every module with a guarded
    // controller has to import PrismaModule. The follow-up commit replaces
    // this with an auth-owned contract and this assertion changes with it.
    const dependencies = Reflect.getMetadata(
      'design:paramtypes',
      PermissionsGuard,
    ) as unknown[];

    expect(dependencies).toContain(PrismaService);
  });

  it('provides JwtAuthGuard without extra dependencies', () => {
    expect(new JwtAuthGuard()).toBeInstanceOf(JwtAuthGuard);
  });
});
