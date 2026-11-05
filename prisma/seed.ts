import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedDatabase(client: PrismaClient = prisma) {
  // 1. Seed Permissions
  const permissionsData = [
    { code: 'users:read', description: 'View user accounts and profiles' },
    { code: 'users:write', description: 'Create and update user accounts' },
    { code: 'users:delete', description: 'Delete user accounts' },
    { code: 'reports:view', description: 'View system analytics and reports' },
    { code: 'reports:export', description: 'Export analytical data reports' },
    { code: 'system:configure', description: 'Configure core system parameters' },
  ];

  for (const perm of permissionsData) {
    await client.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }

  const allPerms = await client.permission.findMany();
  const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

  // 2. Seed Groups
  const groupsData = [
    {
      name: 'SUPER_ADMIN',
      description: 'Full unconstrained system authority',
      permissions: [
        'users:read',
        'users:write',
        'users:delete',
        'reports:view',
        'reports:export',
        'system:configure',
      ],
    },
    {
      name: 'OPERATIONS_MANAGER',
      description: 'User operations and report management',
      permissions: ['users:read', 'users:write', 'reports:view', 'reports:export'],
    },
    {
      name: 'AUDIT_TEAM',
      description: 'Auditing and compliance read-only authority',
      permissions: ['users:read', 'reports:view'],
    },
    {
      name: 'GENERAL_USER',
      description: 'Standard access for ordinary operations',
      permissions: ['reports:view'],
    },
  ];

  for (const g of groupsData) {
    const group = await client.group.upsert({
      where: { name: g.name },
      update: { description: g.description },
      create: { name: g.name, description: g.description },
    });

    // Link permissions
    for (const code of g.permissions) {
      const permId = permMap.get(code);
      if (permId) {
        await client.groupPermission.upsert({
          where: {
            groupId_permissionId: {
              groupId: group.id,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            groupId: group.id,
            permissionId: permId,
          },
        });
      }
    }
  }

  // 3. Seed Demo Users to demonstrate Multiple Groups
  const passwordHash = await bcrypt.hash('123456', 10);

  const groupSuperAdmin = await client.group.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const groupOps = await client.group.findUnique({ where: { name: 'OPERATIONS_MANAGER' } });
  const groupAudit = await client.group.findUnique({ where: { name: 'AUDIT_TEAM' } });
  const groupGeneral = await client.group.findUnique({ where: { name: 'GENERAL_USER' } });

  // User 1: Multi-group user (Operations + Audit)
  const multiUser = await client.user.upsert({
    where: { username: 'alex_ops_audit' },
    update: {},
    create: {
      username: 'alex_ops_audit',
      password: passwordHash,
    },
  });

  if (groupOps && groupAudit) {
    await client.userGroup.upsert({
      where: { userId_groupId: { userId: multiUser.id, groupId: groupOps.id } },
      update: {},
      create: { userId: multiUser.id, groupId: groupOps.id },
    });
    await client.userGroup.upsert({
      where: { userId_groupId: { userId: multiUser.id, groupId: groupAudit.id } },
      update: {},
      create: { userId: multiUser.id, groupId: groupAudit.id },
    });
  }

  // User 2: Super Admin
  const adminUser = await client.user.upsert({
    where: { username: 'root_admin' },
    update: {},
    create: {
      username: 'root_admin',
      password: passwordHash,
    },
  });

  if (groupSuperAdmin) {
    await client.userGroup.upsert({
      where: { userId_groupId: { userId: adminUser.id, groupId: groupSuperAdmin.id } },
      update: {},
      create: { userId: adminUser.id, groupId: groupSuperAdmin.id },
    });
  }

  console.log('[Seed] Database seeded with Groups, Permissions, and Multi-Group Users.');
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
