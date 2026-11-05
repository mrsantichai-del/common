import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class MasterTableService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Audit Helper
  // --------------------------------------------------------------------------
  private async logAudit(action: string, target: string, details: string, userId?: string) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          target,
          details,
          userId: userId || null,
          ipAddress: '127.0.0.1',
        },
      });
    } catch (e) {
      console.warn('[AuditLog] Failed to persist audit entry:', e.message);
    }
  }

  // --------------------------------------------------------------------------
  // 1. Unified Find All (Read / Search / Filter / Pagination)
  // --------------------------------------------------------------------------
  async findAll(
    tableName: string,
    query: { search?: string; status?: string; category?: string; page?: number; limit?: number },
  ) {
    const search = query.search?.trim() || '';
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    switch (tableName.toLowerCase()) {
      case 'users':
      case 'user': {
        const where: any = search
          ? {
              OR: [{ username: { contains: search } }, { employeeId: { contains: search } }],
            }
          : {};

        const [total, records] = await Promise.all([
          this.prisma.user.count({ where }),
          this.prisma.user.findMany({
            where,
            include: {
              groups: {
                include: { group: true },
              },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        return {
          table: 'User',
          total,
          page,
          limit,
          data: records.map((u) => ({
            id: u.id,
            username: u.username,
            employeeId: u.employeeId || null,
            isActive: u.isActive,
            groups: u.groups.map((g) => g.group.name),
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          })),
        };
      }

      case 'groups':
      case 'group': {
        const where: any = search
          ? {
              OR: [{ name: { contains: search } }, { description: { contains: search } }],
            }
          : {};

        const [total, records] = await Promise.all([
          this.prisma.group.count({ where }),
          this.prisma.group.findMany({
            where,
            include: {
              permissions: { include: { permission: true } },
              _count: { select: { users: true } },
            },
            skip,
            take: limit,
            orderBy: { name: 'asc' },
          }),
        ]);

        return {
          table: 'Group',
          total,
          page,
          limit,
          data: records.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            isActive: g.isActive,
            userCount: g._count.users,
            permissions: g.permissions.map((gp) => gp.permission.code),
            createdAt: g.createdAt,
            updatedAt: g.updatedAt,
          })),
        };
      }

      case 'permissions':
      case 'permission': {
        const where: any = search
          ? {
              OR: [{ code: { contains: search } }, { description: { contains: search } }],
            }
          : {};

        const [total, records] = await Promise.all([
          this.prisma.permission.count({ where }),
          this.prisma.permission.findMany({
            where,
            include: {
              groups: { include: { group: true } },
            },
            skip,
            take: limit,
            orderBy: { code: 'asc' },
          }),
        ]);

        return {
          table: 'Permission',
          total,
          page,
          limit,
          data: records.map((p) => ({
            id: p.id,
            code: p.code,
            description: p.description,
            attachedGroups: p.groups.map((gp) => gp.group.name),
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })),
        };
      }

      case 'documents':
      case 'document': {
        const where: any = {};
        if (search) {
          where.OR = [
            { docNumber: { contains: search } },
            { title: { contains: search } },
            { content: { contains: search } },
          ];
        }
        if (query.status && query.status !== 'ALL') {
          where.status = query.status;
        }
        if (query.category && query.category !== 'ALL') {
          where.category = query.category;
        }

        const [total, records] = await Promise.all([
          this.prisma.document.count({ where }),
          this.prisma.document.findMany({
            where,
            include: {
              author: { select: { id: true, username: true } },
              confirmedBy: { select: { id: true, username: true } },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        return {
          table: 'Document',
          total,
          page,
          limit,
          data: records.map((d) => ({
            id: d.id,
            docNumber: d.docNumber,
            title: d.title,
            category: d.category,
            status: d.status,
            content: d.content,
            author: d.author ? d.author.username : 'System',
            confirmedBy: d.confirmedBy ? d.confirmedBy.username : null,
            confirmedAt: d.confirmedAt,
            cancelledAt: d.cancelledAt,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          })),
        };
      }

      case 'auditlogs':
      case 'auditlog':
      case 'audit-logs': {
        const where: any = search
          ? {
              OR: [
                { action: { contains: search } },
                { target: { contains: search } },
                { details: { contains: search } },
              ],
            }
          : {};

        const [total, records] = await Promise.all([
          this.prisma.auditLog.count({ where }),
          this.prisma.auditLog.findMany({
            where,
            include: {
              user: { select: { username: true } },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
          }),
        ]);

        return {
          table: 'AuditLog',
          total,
          page,
          limit,
          data: records.map((a) => ({
            id: a.id,
            action: a.action,
            target: a.target,
            details: a.details,
            ipAddress: a.ipAddress,
            username: a.user ? a.user.username : 'SYSTEM',
            createdAt: a.createdAt,
          })),
        };
      }

      default:
        throw new BadRequestException(`Unknown master table '${tableName}'`);
    }
  }

  // --------------------------------------------------------------------------
  // 2. Find Single Record
  // --------------------------------------------------------------------------
  async findOne(tableName: string, id: string) {
    switch (tableName.toLowerCase()) {
      case 'users':
      case 'user':
        return this.prisma.user.findUnique({
          where: { id },
          include: { groups: { include: { group: true } } },
        });
      case 'groups':
      case 'group':
        return this.prisma.group.findUnique({
          where: { id },
          include: { permissions: { include: { permission: true } } },
        });
      case 'permissions':
      case 'permission':
        return this.prisma.permission.findUnique({ where: { id } });
      case 'documents':
      case 'document':
        return this.prisma.document.findUnique({
          where: { id },
          include: { author: true, confirmedBy: true },
        });
      case 'auditlogs':
      case 'audit-logs':
        return this.prisma.auditLog.findUnique({ where: { id } });
      default:
        throw new BadRequestException(`Unknown master table '${tableName}'`);
    }
  }

  // --------------------------------------------------------------------------
  // 3. Create Record
  // --------------------------------------------------------------------------
  async create(tableName: string, payload: any, userId?: string) {
    switch (tableName.toLowerCase()) {
      case 'users':
      case 'user': {
        const { username, password, employeeId, groups = ['GENERAL_USER'] } = payload;
        if (!username || !password) {
          throw new BadRequestException('Username and password are required');
        }
        const existing = await this.prisma.user.findUnique({ where: { username } });
        if (existing) {
          throw new ConflictException(`User '${username}' already exists`);
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await this.prisma.user.create({
          data: {
            username,
            password: passwordHash,
            employeeId: employeeId ? employeeId.trim() : null,
            isActive: true,
          },
        });

        if (groups && groups.length > 0) {
          const groupEntities = await this.prisma.group.findMany({
            where: { name: { in: groups } },
          });
          for (const g of groupEntities) {
            await this.prisma.userGroup.create({
              data: { userId: user.id, groupId: g.id },
            });
          }
        }

        await this.logAudit('USER_CREATE', 'User', `Created user account: ${username}`, userId);
        return { message: `User '${username}' successfully created`, id: user.id };
      }

      case 'groups':
      case 'group': {
        const { name, description = '', permissions = [] } = payload;
        if (!name) throw new BadRequestException('Group name is required');
        const existing = await this.prisma.group.findUnique({ where: { name } });
        if (existing) throw new ConflictException(`Group '${name}' already exists`);

        const group = await this.prisma.group.create({
          data: { name, description, isActive: true },
        });

        if (permissions.length > 0) {
          const perms = await this.prisma.permission.findMany({
            where: { code: { in: permissions } },
          });
          for (const p of perms) {
            await this.prisma.groupPermission.create({
              data: { groupId: group.id, permissionId: p.id },
            });
          }
        }

        await this.logAudit('GROUP_CREATE', 'Group', `Created role group: ${name}`, userId);
        return { message: `Group '${name}' successfully created`, id: group.id };
      }

      case 'permissions':
      case 'permission': {
        const { code, description = '' } = payload;
        if (!code) throw new BadRequestException('Permission code is required');
        const existing = await this.prisma.permission.findUnique({ where: { code } });
        if (existing) throw new ConflictException(`Permission '${code}' already exists`);

        const perm = await this.prisma.permission.create({
          data: { code, description },
        });

        await this.logAudit('PERM_CREATE', 'Permission', `Created permission: ${code}`, userId);
        return { message: `Permission '${code}' successfully created`, id: perm.id };
      }

      case 'documents':
      case 'document': {
        const docNumber =
          payload.docNumber || `DOC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
        const { title, category = 'GENERAL', content = '' } = payload;
        if (!title) throw new BadRequestException('Document title is required');

        const doc = await this.prisma.document.create({
          data: {
            docNumber,
            title,
            category,
            content,
            status: 'DRAFT',
            authorId: userId || null,
          },
        });

        await this.logAudit('DOC_CREATE', 'Document', `Created document ${docNumber}: ${title}`, userId);
        return { message: `Document '${docNumber}' created as DRAFT`, id: doc.id };
      }

      default:
        throw new BadRequestException(`Creation not supported on master table '${tableName}'`);
    }
  }

  // --------------------------------------------------------------------------
  // 4. Update Record
  // --------------------------------------------------------------------------
  async update(tableName: string, id: string, payload: any, userId?: string) {
    switch (tableName.toLowerCase()) {
      case 'users':
      case 'user': {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        const updateData: any = {};
        if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);
        if (payload.password) updateData.password = await bcrypt.hash(payload.password, 10);
        if (payload.employeeId !== undefined) updateData.employeeId = payload.employeeId ? payload.employeeId.trim() : null;

        await this.prisma.user.update({ where: { id }, data: updateData });

        if (payload.groups && Array.isArray(payload.groups)) {
          await this.prisma.userGroup.deleteMany({ where: { userId: id } });
          const groupEntities = await this.prisma.group.findMany({
            where: { name: { in: payload.groups } },
          });
          for (const g of groupEntities) {
            await this.prisma.userGroup.create({ data: { userId: id, groupId: g.id } });
          }
        }

        await this.logAudit('USER_UPDATE', 'User', `Updated user: ${user.username}`, userId);
        return { message: `User '${user.username}' successfully updated` };
      }

      case 'groups':
      case 'group': {
        const group = await this.prisma.group.findUnique({ where: { id } });
        if (!group) throw new NotFoundException('Group not found');

        const updateData: any = {};
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);

        await this.prisma.group.update({ where: { id }, data: updateData });

        if (payload.permissions && Array.isArray(payload.permissions)) {
          await this.prisma.groupPermission.deleteMany({ where: { groupId: id } });
          const perms = await this.prisma.permission.findMany({
            where: { code: { in: payload.permissions } },
          });
          for (const p of perms) {
            await this.prisma.groupPermission.create({
              data: { groupId: id, permissionId: p.id },
            });
          }
        }

        await this.logAudit('GROUP_UPDATE', 'Group', `Updated role group: ${group.name}`, userId);
        return { message: `Group '${group.name}' successfully updated` };
      }

      case 'permissions':
      case 'permission': {
        const perm = await this.prisma.permission.findUnique({ where: { id } });
        if (!perm) throw new NotFoundException('Permission not found');

        await this.prisma.permission.update({
          where: { id },
          data: { description: payload.description },
        });

        await this.logAudit('PERM_UPDATE', 'Permission', `Updated permission: ${perm.code}`, userId);
        return { message: `Permission '${perm.code}' updated` };
      }

      case 'documents':
      case 'document': {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc) throw new NotFoundException('Document not found');
        if (doc.status === 'CONFIRMED') {
          throw new BadRequestException('Cannot modify a CONFIRMED document. Revoke or cancel first.');
        }

        const updateData: any = {};
        if (payload.title) updateData.title = payload.title;
        if (payload.category) updateData.category = payload.category;
        if (payload.content !== undefined) updateData.content = payload.content;

        await this.prisma.document.update({ where: { id }, data: updateData });
        await this.logAudit('DOC_UPDATE', 'Document', `Updated document ${doc.docNumber}`, userId);
        return { message: `Document '${doc.docNumber}' updated` };
      }

      default:
        throw new BadRequestException(`Update not supported on master table '${tableName}'`);
    }
  }

  // --------------------------------------------------------------------------
  // 5. Delete Record
  // --------------------------------------------------------------------------
  async delete(tableName: string, id: string, userId?: string) {
    switch (tableName.toLowerCase()) {
      case 'users':
      case 'user': {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        if (user.username === 'root_admin') {
          throw new ConflictException('Protected root_admin identity cannot be deleted');
        }
        await this.prisma.user.delete({ where: { id } });
        await this.logAudit('USER_DELETE', 'User', `Purged user account: ${user.username}`, userId);
        return { message: `User '${user.username}' deleted` };
      }

      case 'groups':
      case 'group': {
        const group = await this.prisma.group.findUnique({ where: { id } });
        if (!group) throw new NotFoundException('Group not found');
        if (group.name === 'SUPER_ADMIN') {
          throw new ConflictException('SUPER_ADMIN group cannot be deleted');
        }
        await this.prisma.group.delete({ where: { id } });
        await this.logAudit('GROUP_DELETE', 'Group', `Deleted group: ${group.name}`, userId);
        return { message: `Group '${group.name}' deleted` };
      }

      case 'permissions':
      case 'permission': {
        const perm = await this.prisma.permission.findUnique({ where: { id } });
        if (!perm) throw new NotFoundException('Permission not found');
        await this.prisma.permission.delete({ where: { id } });
        await this.logAudit('PERM_DELETE', 'Permission', `Deleted permission: ${perm.code}`, userId);
        return { message: `Permission '${perm.code}' deleted` };
      }

      case 'documents':
      case 'document': {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc) throw new NotFoundException('Document not found');
        await this.prisma.document.delete({ where: { id } });
        await this.logAudit('DOC_DELETE', 'Document', `Deleted document ${doc.docNumber}`, userId);
        return { message: `Document '${doc.docNumber}' deleted` };
      }

      default:
        throw new BadRequestException(`Deletion not supported on master table '${tableName}'`);
    }
  }

  // --------------------------------------------------------------------------
  // 6. Confirm Document (Approval Lifecycle)
  // --------------------------------------------------------------------------
  async confirmDocument(id: string, confirmedById: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status === 'CONFIRMED') {
      throw new BadRequestException(`Document '${doc.docNumber}' is already CONFIRMED`);
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedById,
        confirmedAt: new Date(),
        cancelledAt: null,
      },
    });

    await this.logAudit('DOC_CONFIRM', 'Document', `Approved document: ${doc.docNumber}`, confirmedById);
    return {
      message: `Document '${doc.docNumber}' officially CONFIRMED and approved`,
      document: updated,
    };
  }

  // --------------------------------------------------------------------------
  // 7. Cancel Document (Revocation Lifecycle)
  // --------------------------------------------------------------------------
  async cancelDocument(id: string, reason = 'Administrative cancellation', cancelledById?: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status === 'CANCELLED') {
      throw new BadRequestException(`Document '${doc.docNumber}' is already CANCELLED`);
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    await this.logAudit(
      'DOC_CANCEL',
      'Document',
      `Cancelled document ${doc.docNumber}. Reason: ${reason}`,
      cancelledById,
    );
    return {
      message: `Document '${doc.docNumber}' officially CANCELLED`,
      document: updated,
    };
  }

  // --------------------------------------------------------------------------
  // 8. Bulk Import (CSV / JSON Items)
  // --------------------------------------------------------------------------
  async bulkImport(tableName: string, items: any[], userId?: string) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Items must be a non-empty array of records');
    }

    let importedCount = 0;
    const errors: string[] = [];

    for (const [idx, item] of items.entries()) {
      try {
        await this.create(tableName, item, userId);
        importedCount++;
      } catch (err) {
        errors.push(`Row ${idx + 1}: ${err.message}`);
      }
    }

    await this.logAudit(
      'DATA_IMPORT',
      tableName,
      `Imported ${importedCount} items into ${tableName} (${errors.length} errors)`,
      userId,
    );

    return {
      message: `Successfully imported ${importedCount} of ${items.length} records into '${tableName}'`,
      importedCount,
      failedCount: errors.length,
      errors: errors.slice(0, 10),
    };
  }

  // --------------------------------------------------------------------------
  // 9. Export Data (CSV or JSON)
  // --------------------------------------------------------------------------
  async exportData(tableName: string, format: 'json' | 'csv' = 'json') {
    const result = await this.findAll(tableName, { limit: 1000 });
    const records = result.data;

    if (format === 'json') {
      return { format: 'json', data: records };
    }

    // Generate CSV with UTF-8 BOM for Microsoft Excel Thai compatibility
    if (records.length === 0) {
      return { format: 'csv', content: '\uFEFF' };
    }

    const headers = Object.keys(records[0]);
    const csvRows = [
      headers.join(','),
      ...records.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '""';
            const strVal = Array.isArray(val) ? val.join(';') : String(val);
            return `"${strVal.replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ];

    return {
      format: 'csv',
      filename: `${tableName}_export_${Date.now()}.csv`,
      content: '\uFEFF' + csvRows.join('\r\n'),
    };
  }
}
