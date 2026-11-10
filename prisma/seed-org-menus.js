const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding Organization Permissions and Menus...');

  // 1. Ensure permissions exist
  const permRead = await prisma.permission.upsert({
    where: { code: 'org:read' },
    update: { description: 'Read organization structure, units, and job positions' },
    create: { code: 'org:read', description: 'Read organization structure, units, and job positions' },
  });

  const permManage = await prisma.permission.upsert({
    where: { code: 'org:manage' },
    update: { description: 'Manage organization units, job descriptions, and positions' },
    create: { code: 'org:manage', description: 'Manage organization units, job descriptions, and positions' },
  });

  // 2. Link permissions to SUPER_ADMIN and OPERATIONS_MANAGER
  const superAdminGroup = await prisma.group.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (superAdminGroup) {
    for (const p of [permRead, permManage]) {
      const existing = await prisma.groupPermission.findUnique({
        where: { groupId_permissionId: { groupId: superAdminGroup.id, permissionId: p.id } },
      });
      if (!existing) {
        await prisma.groupPermission.create({
          data: { groupId: superAdminGroup.id, permissionId: p.id },
        });
      }
    }
  }

  const opsManagerGroup = await prisma.group.findUnique({ where: { name: 'OPERATIONS_MANAGER' } });
  if (opsManagerGroup) {
    const existing = await prisma.groupPermission.findUnique({
      where: { groupId_permissionId: { groupId: opsManagerGroup.id, permissionId: permRead.id } },
    });
    if (!existing) {
      await prisma.groupPermission.create({
        data: { groupId: opsManagerGroup.id, permissionId: permRead.id },
      });
    }
  }

  // 3. Upsert Organization Menu (Top-level)
  const orgIcon = `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>`;

  const orgMenu = await prisma.menu.upsert({
    where: { code: 'organization' },
    update: {
      label: 'โครงสร้างองค์กร (Organization)',
      icon: orgIcon,
      order: 3,
      permissionId: permRead.id,
      adminOnly: false,
      isActive: true,
    },
    create: {
      code: 'organization',
      label: 'โครงสร้างองค์กร (Organization)',
      icon: orgIcon,
      order: 3,
      permissionId: permRead.id,
      adminOnly: false,
      isActive: true,
    },
  });

  // 4. Submenus under Organization
  const submenus = [
    { code: 'orgChart', label: 'ผังองค์กร (Org Chart)', order: 1 },
    { code: 'orgUnit', label: 'สาขา ฝ่าย แผนก (Org Units)', order: 2 },
    { code: 'job', label: 'ลักษณะงาน (Job / JD)', order: 3 },
    { code: 'position', label: 'ตำแหน่งงาน (Positions)', order: 4 },
  ];

  for (const sub of submenus) {
    await prisma.menu.upsert({
      where: { code: sub.code },
      update: {
        label: sub.label,
        order: sub.order,
        parentId: orgMenu.id,
        permissionId: permRead.id,
        adminOnly: false,
        isActive: true,
      },
      create: {
        code: sub.code,
        label: sub.label,
        order: sub.order,
        parentId: orgMenu.id,
        permissionId: permRead.id,
        adminOnly: false,
        isActive: true,
      },
    });
  }

  // Shift orders of other top-level menus if needed
  const topMenusToShift = [
    { code: 'users', order: 4 },
    { code: 'roles', order: 5 },
    { code: 'documents', order: 6 },
    { code: 'reports', order: 7 },
    { code: 'audit', order: 8 },
  ];

  for (const m of topMenusToShift) {
    await prisma.menu.updateMany({
      where: { code: m.code, parentId: null },
      data: { order: m.order },
    });
  }

  console.log('[Seed] Organization Permissions and Menus successfully configured in SQLite!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
