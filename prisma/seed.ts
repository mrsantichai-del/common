import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppPermission } from '../src/auth/constants/permissions';

const prisma = new PrismaClient();

export async function seedDatabase(client: PrismaClient = prisma) {
  console.log('[Seed] Beginning Comprehensive Enterprise Permission Matrix Seeding...');

  // 1. Comprehensive Permissions Catalog
  const permissionsData = [
    // Users
    { code: AppPermission.USERS_READ, description: 'Read user account information and profiles' },
    { code: AppPermission.USERS_CREATE, description: 'Create and provision new user accounts' },
    { code: AppPermission.USERS_UPDATE, description: 'Update user profiles and group memberships' },
    { code: AppPermission.USERS_DELETE, description: 'Delete or purge user accounts' },
    { code: AppPermission.USERS_CONFIRM, description: 'Confirm and activate user accounts' },
    { code: AppPermission.USERS_CANCEL, description: 'Cancel, suspend or deactivate user accounts' },

    // Documents & File I/O
    { code: AppPermission.DOCUMENTS_READ, description: 'Read and view document records' },
    { code: AppPermission.DOCUMENTS_UPLOAD, description: 'Upload attachments and files into storage' },
    { code: AppPermission.DOCUMENTS_DOWNLOAD, description: 'Download documents and binary attachments' },
    { code: AppPermission.DOCUMENTS_CONFIRM, description: 'Confirm and officially approve documents' },
    { code: AppPermission.DOCUMENTS_CANCEL, description: 'Cancel, reject or revoke documents' },
    { code: AppPermission.DOCUMENTS_DELETE, description: 'Delete documents and archived files' },

    // Reports & Data I/O
    { code: AppPermission.REPORTS_VIEW, description: 'View system analytics and operational reports' },
    { code: AppPermission.REPORTS_DOWNLOAD, description: 'Download or export reports (PDF/Excel)' },
    { code: AppPermission.DATA_IMPORT, description: 'Import batch datasets into system storage' },

    // Governance & Security
    { code: AppPermission.AUDIT_READ, description: 'Inspect audit trail and forensic activity logs' },
    { code: AppPermission.AUDIT_DOWNLOAD, description: 'Download compliance audit logs for reporting' },
    { code: AppPermission.SYSTEM_CONFIGURE, description: 'Configure core kernel parameters and security' },
  ];

  for (const perm of permissionsData) {
    await client.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
  }

  const allPerms = await client.permission.findMany();
  const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

  // 2. Enterprise Groups (Role Bundles)
  const groupsData = [
    {
      name: 'SUPER_ADMIN',
      description: 'Complete unconstrained administrative authority across all modules',
      permissions: Object.values(AppPermission),
    },
    {
      name: 'OPERATIONS_MANAGER',
      description: 'Operational user management, document processing, and report analytics',
      permissions: [
        AppPermission.USERS_READ,
        AppPermission.USERS_CREATE,
        AppPermission.USERS_UPDATE,
        AppPermission.DOCUMENTS_READ,
        AppPermission.DOCUMENTS_UPLOAD,
        AppPermission.DOCUMENTS_DOWNLOAD,
        AppPermission.DOCUMENTS_CONFIRM,
        AppPermission.DOCUMENTS_CANCEL,
        AppPermission.REPORTS_VIEW,
        AppPermission.REPORTS_DOWNLOAD,
      ],
    },
    {
      name: 'EXECUTIVE_APPROVER',
      description: 'Senior review authority with confirm/cancel and download privileges',
      permissions: [
        AppPermission.DOCUMENTS_READ,
        AppPermission.DOCUMENTS_DOWNLOAD,
        AppPermission.DOCUMENTS_CONFIRM,
        AppPermission.DOCUMENTS_CANCEL,
        AppPermission.REPORTS_VIEW,
        AppPermission.REPORTS_DOWNLOAD,
      ],
    },
    {
      name: 'COMPLIANCE_AUDITOR',
      description: 'Read-only regulatory oversight and audit trail inspection',
      permissions: [
        AppPermission.USERS_READ,
        AppPermission.DOCUMENTS_READ,
        AppPermission.DOCUMENTS_DOWNLOAD,
        AppPermission.REPORTS_VIEW,
        AppPermission.REPORTS_DOWNLOAD,
        AppPermission.AUDIT_READ,
        AppPermission.AUDIT_DOWNLOAD,
      ],
    },
    {
      name: 'STANDARD_OPERATOR',
      description: 'Frontline data entry with upload, read, and report viewing',
      permissions: [
        AppPermission.DOCUMENTS_READ,
        AppPermission.DOCUMENTS_UPLOAD,
        AppPermission.DOCUMENTS_DOWNLOAD,
        AppPermission.REPORTS_VIEW,
      ],
    },
    {
      name: 'GENERAL_USER',
      description: 'Baseline authenticated identity with read-only visibility',
      permissions: [AppPermission.DOCUMENTS_READ, AppPermission.REPORTS_VIEW],
    },
  ];

  for (const g of groupsData) {
    const group = await client.group.upsert({
      where: { name: g.name },
      update: { description: g.description },
      create: { name: g.name, description: g.description },
    });

    // Delete existing mappings and re-map for cleanliness
    await client.groupPermission.deleteMany({
      where: { groupId: group.id },
    });

    for (const code of g.permissions) {
      const permId = permMap.get(code);
      if (permId) {
        await client.groupPermission.create({
          data: {
            groupId: group.id,
            permissionId: permId,
          },
        });
      }
    }
  }

  // 3. Pre-seeded Test Users
  const passwordHash = await bcrypt.hash('123456', 10);

  const groupSuperAdmin = await client.group.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const groupApprover = await client.group.findUnique({ where: { name: 'EXECUTIVE_APPROVER' } });
  const groupAuditor = await client.group.findUnique({ where: { name: 'COMPLIANCE_AUDITOR' } });
  const groupOperator = await client.group.findUnique({ where: { name: 'STANDARD_OPERATOR' } });

  // User 1: Super Admin
  const adminUser = await client.user.upsert({
    where: { username: 'root_admin' },
    update: {},
    create: { username: 'root_admin', password: passwordHash },
  });
  if (groupSuperAdmin) {
    await client.userGroup.deleteMany({ where: { userId: adminUser.id } });
    await client.userGroup.create({ data: { userId: adminUser.id, groupId: groupSuperAdmin.id } });
  }

  // User 2: Executive Approver
  const approverUser = await client.user.upsert({
    where: { username: 'approver_ellen' },
    update: {},
    create: { username: 'approver_ellen', password: passwordHash },
  });
  if (groupApprover) {
    await client.userGroup.deleteMany({ where: { userId: approverUser.id } });
    await client.userGroup.create({ data: { userId: approverUser.id, groupId: groupApprover.id } });
  }

  // User 3: Compliance Auditor
  const auditorUser = await client.user.upsert({
    where: { username: 'auditor_arthur' },
    update: {},
    create: { username: 'auditor_arthur', password: passwordHash },
  });
  if (groupAuditor) {
    await client.userGroup.deleteMany({ where: { userId: auditorUser.id } });
    await client.userGroup.create({ data: { userId: auditorUser.id, groupId: groupAuditor.id } });
  }

  // User 4: Multi-Group Hybrid (Operator + Auditor)
  const hybridUser = await client.user.upsert({
    where: { username: 'hybrid_harry' },
    update: {},
    create: { username: 'hybrid_harry', password: passwordHash },
  });
  if (groupOperator && groupAuditor) {
    await client.userGroup.deleteMany({ where: { userId: hybridUser.id } });
    await client.userGroup.create({ data: { userId: hybridUser.id, groupId: groupOperator.id } });
    await client.userGroup.create({ data: { userId: hybridUser.id, groupId: groupAuditor.id } });
  }

  console.log('[Seed] Enterprise Permission Matrix & Identities seeded successfully.');
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
