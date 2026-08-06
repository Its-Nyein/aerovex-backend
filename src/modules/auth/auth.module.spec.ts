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

  it('exports nothing', () => {
    // Auth's public surface is its guards and decorators, which consumers
    // import directly. Nothing outside auth injects AuthService.
    expect(Reflect.getMetadata('exports', AuthModule)).toBeUndefined();
  });

  it('no longer couples PermissionsGuard to PrismaService', () => {
    const dependencies = Reflect.getMetadata(
      'design:paramtypes',
      PermissionsGuard,
    ) as unknown[];

    expect(dependencies).not.toContain(PrismaService);
  });

  it('provides JwtAuthGuard without extra dependencies', () => {
    expect(new JwtAuthGuard()).toBeInstanceOf(JwtAuthGuard);
  });
});
