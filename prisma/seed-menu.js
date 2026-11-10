const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Menu table and binding with permissions...');

  // 1. Fetch existing permissions
  const perms = await prisma.permission.findMany();
  const permMap = new Map(perms.map((p) => [p.code, p.id]));

  // Menu specifications
  const menuData = [
    {
      code: 'home',
      label: 'หน้าหลัก (Home)',
      icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
      order: 1,
      adminOnly: false,
      permissionCode: null,
    },
    {
      code: 'masterData',
      label: 'MasterData (จัดการตาราง)',
      icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
      order: 2,
      adminOnly: true,
      permissionCode: 'system:configure',
      submenus: [
        { code: 'company', label: 'บริษัท (Company)', order: 1 },
        { code: 'user', label: 'ผู้ใช้งาน (User)', order: 2 },
        { code: 'group', label: 'กลุ่มสิทธิ์ (Group)', order: 3 },
        { code: 'permission', label: 'สิทธิ์การใช้งาน (Permission)', order: 4 },
        { code: 'menu', label: 'เมนูระบบ (Menu)', order: 5 },
        { code: 'document', label: 'เอกสาร (Document)', order: 6 },
        { code: 'auditlog', label: 'ประวัติ (AuditLog)', order: 7 },
      ],
    },
    {
      code: 'users',
      label: 'จัดการผู้ใช้งาน (Users)',
      icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>',
      order: 3,
      adminOnly: false,
      permissionCode: 'users:read',
    },
    {
      code: 'roles',
      label: 'จัดการกลุ่มและสิทธิ์ (Roles)',
      icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>',
      order: 4,
      adminOnly: false,
      permissionCode: 'system:configure',
    },
    {
      code: 'documents',
      label: 'จัดการเอกสาร (Documents)',
      icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
      order: 5,
      adminOnly: false,
      permissionCode: 'documents:read',
    },
    {
      code: 'reports',
      label: 'รายงานระบบ (Reports)',
      icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
      order: 6,
      adminOnly: false,
      permissionCode: 'reports:view',
    },
    {
      code: 'audit',
      label: 'บันทึกการทำงาน (Audit Trail)',
      icon: '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      order: 7,
      adminOnly: false,
      permissionCode: 'audit:read',
    },
  ];

  for (const m of menuData) {
    const permId = m.permissionCode ? permMap.get(m.permissionCode) || null : null;

    const parent = await prisma.menu.upsert({
      where: { code: m.code },
      update: {
        label: m.label,
        icon: m.icon,
        order: m.order,
        adminOnly: m.adminOnly,
        permissionId: permId,
      },
      create: {
        code: m.code,
        label: m.label,
        icon: m.icon,
        order: m.order,
        adminOnly: m.adminOnly,
        permissionId: permId,
      },
    });

    if (m.submenus && m.submenus.length > 0) {
      for (const sub of m.submenus) {
        await prisma.menu.upsert({
          where: { code: sub.code },
          update: {
            label: sub.label,
            order: sub.order,
            parentId: parent.id,
            adminOnly: m.adminOnly,
            permissionId: permId,
          },
          create: {
            code: sub.code,
            label: sub.label,
            order: sub.order,
            parentId: parent.id,
            adminOnly: m.adminOnly,
            permissionId: permId,
          },
        });
      }
    }
  }

  const count = await prisma.menu.count();
  console.log(`Successfully seeded ${count} menus in database!`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
