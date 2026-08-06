import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoleController } from './controllers/role.controller';
import { RoleRepository } from './repositories/role.repository';
import { RoleModule } from './role.module';
import { RoleService } from './services/role.service';

describe('RoleModule', () => {
  let moduleRef: TestingModule;

  const prismaMock = {
    role: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    moduleRef = await Test.createTestingModule({
      imports: [RoleModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
  });

  it('wires the module graph after the move to src/modules/role', () => {
    expect(moduleRef.get(RoleController)).toBeInstanceOf(RoleController);
    expect(moduleRef.get(RoleService)).toBeInstanceOf(RoleService);
    expect(moduleRef.get(RoleRepository)).toBeInstanceOf(RoleRepository);
  });

  it('keeps the repository wired to Prisma through the service', async () => {
    const role = { id: 'role-1', name: 'admin role', permissions: [] };
    prismaMock.role.findUnique.mockResolvedValue(role);

    await expect(
      moduleRef.get(RoleService).findRoleById('role-1'),
    ).resolves.toBe(role);

    expect(prismaMock.role.findUnique).toHaveBeenCalledWith({
      where: { id: 'role-1' },
      include: { permissions: true },
    });
  });

  it('does not leak internals outside the module boundary', () => {
    // RoleModule has no cross-module consumers yet, so it exports nothing.
    expect(Reflect.getMetadata('exports', RoleModule)).toBeUndefined();
  });
});
