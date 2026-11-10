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
  // Audit Helper with Full Change Tracking (Old Value vs New Value)
  // --------------------------------------------------------------------------
  private async logAudit(
    action: string,
    target: string,
    details: string,
    userId?: string,
    targetId?: string,
    oldValue?: any,
    newValue?: any,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          target,
          targetId: targetId || null,
          details,
          oldValue: oldValue ? (typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue)) : null,
          newValue: newValue ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue)) : null,
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
      case 'companies':
      case 'company': {
        const where: any = search
          ? {
              OR: [
                { nameTh: { contains: search } },
                { nameEn: { contains: search } },
                { taxId: { contains: search } },
                { branchCode: { contains: search } },
              ],
            }
          : {};

        const [total, records] = await Promise.all([
          this.prisma.company.count({ where }),
          this.prisma.company.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
          }),
        ]);

        return {
          table: 'Company',
          total,
          page,
          limit,
          data: records,
        };
      }

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
              position: {
                select: { id: true, code: true, title: true, isUnitHead: true },
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
            positionId: u.positionId || null,
            position: u.position || null,
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
            targetId: a.targetId,
            details: a.details,
            oldValue: a.oldValue,
            newValue: a.newValue,
            ipAddress: a.ipAddress,
            username: a.user ? a.user.username : 'SYSTEM',
            createdAt: a.createdAt,
          })),
        };
      }

      case 'menus':
      case 'menu': {
        const where: any = search
          ? {
              OR: [
                { code: { contains: search } },
                { label: { contains: search } },
              ],
            }
          : {};

        const [total, records] = await Promise.all([
          this.prisma.menu.count({ where }),
          this.prisma.menu.findMany({
            where,
            include: {
              permission: { select: { id: true, code: true, description: true } },
              parent: { select: { id: true, code: true, label: true } },
            },
            skip,
            take: limit,
            orderBy: [{ order: 'asc' }],
          }),
        ]);

        return {
          table: 'Menu',
          total,
          page,
          limit,
          data: records.map((m) => ({
            id: m.id,
            code: m.code,
            label: m.label,
            icon: m.icon,
            order: m.order,
            adminOnly: m.adminOnly,
            isActive: m.isActive,
            parentId: m.parentId,
            parentCode: m.parent ? m.parent.code : null,
            parentLabel: m.parent ? m.parent.label : null,
            permissionId: m.permissionId,
            permissionCode: m.permission ? m.permission.code : null,
            permissionDesc: m.permission ? m.permission.description : null,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          })),
        };
      }

      case 'orgunits':
      case 'orgunit':
      case 'org-unit': {
        const where: any = search
          ? {
              OR: [
                { code: { contains: search } },
                { name: { contains: search } },
                { nameEn: { contains: search } },
              ],
            }
          : {};
        if (query.category) where.type = query.category;

        const [total, records] = await Promise.all([
          this.prisma.orgUnit.count({ where }),
          this.prisma.orgUnit.findMany({
            where,
            include: {
              company: { select: { id: true, nameTh: true } },
              parent: { select: { id: true, code: true, name: true, type: true } },
              _count: { select: { children: true, positions: true } },
            },
            skip,
            take: limit,
            orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
          }),
        ]);

        return {
          table: 'OrgUnit',
          total,
          page,
          limit,
          data: records.map((u) => ({
            id: u.id,
            code: u.code,
            name: u.name,
            nameEn: u.nameEn,
            type: u.type,
            order: u.order,
            isActive: u.isActive,
            companyId: u.companyId,
            companyName: u.company ? u.company.nameTh : null,
            parentId: u.parentId,
            parentCode: u.parent ? u.parent.code : null,
            parentName: u.parent ? u.parent.name : null,
            childCount: u._count.children,
            positionCount: u._count.positions,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          })),
        };
      }

      case 'jobs':
      case 'job': {
        const where: any = search
          ? {
              OR: [
                { code: { contains: search } },
                { title: { contains: search } },
                { titleEn: { contains: search } },
              ],
            }
          : {};

        const [total, records] = await Promise.all([
          this.prisma.job.count({ where }),
          this.prisma.job.findMany({
            where,
            include: {
              _count: { select: { positions: true } },
            },
            skip,
            take: limit,
            orderBy: [{ level: 'desc' }, { code: 'asc' }],
          }),
        ]);

        return {
          table: 'Job',
          total,
          page,
          limit,
          data: records.map((j) => ({
            id: j.id,
            code: j.code,
            title: j.title,
            titleEn: j.titleEn,
            level: j.level,
            summary: j.summary,
            responsibilities: j.responsibilities,
            qualifications: j.qualifications,
            isActive: j.isActive,
            positionCount: j._count.positions,
            createdAt: j.createdAt,
            updatedAt: j.updatedAt,
          })),
        };
      }

      case 'positions':
      case 'position': {
        const where: any = search
          ? {
              OR: [
                { code: { contains: search } },
                { title: { contains: search } },
              ],
            }
          : {};

        const [total, records] = await Promise.all([
          this.prisma.position.count({ where }),
          this.prisma.position.findMany({
            where,
            include: {
              company: { select: { id: true, nameTh: true } },
              orgUnit: { select: { id: true, code: true, name: true, type: true } },
              job: { select: { id: true, code: true, title: true, level: true } },
              reportsTo: { select: { id: true, code: true, title: true } },
              users: { select: { id: true, username: true, employeeId: true } },
            },
            skip,
            take: limit,
            orderBy: [{ orgUnitId: 'asc' }, { isUnitHead: 'desc' }, { title: 'asc' }],
          }),
        ]);

        return {
          table: 'Position',
          total,
          page,
          limit,
          data: records.map((p) => ({
            id: p.id,
            code: p.code,
            title: p.title,
            isUnitHead: p.isUnitHead,
            isActive: p.isActive,
            companyId: p.companyId,
            companyName: p.company ? p.company.nameTh : null,
            orgUnitId: p.orgUnitId,
            orgUnitCode: p.orgUnit ? p.orgUnit.code : null,
            orgUnitName: p.orgUnit ? p.orgUnit.name : 'ระดับบริษัท (Company Level)',
            orgUnitType: p.orgUnit ? p.orgUnit.type : null,
            jobId: p.jobId,
            jobCode: p.job ? p.job.code : null,
            jobTitle: p.job ? p.job.title : null,
            reportsToId: p.reportsToId,
            reportsToCode: p.reportsTo ? p.reportsTo.code : null,
            reportsToTitle: p.reportsTo ? p.reportsTo.title : null,
            occupants: p.users.map((u) => u.username).join(', '),
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
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
      case 'companies':
      case 'company':
        return this.prisma.company.findUnique({ where: { id } });
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
      case 'menus':
      case 'menu':
        return this.prisma.menu.findUnique({
          where: { id },
          include: { permission: true, parent: true },
        });
      case 'orgunits':
      case 'orgunit':
      case 'org-unit':
        return this.prisma.orgUnit.findUnique({
          where: { id },
          include: { company: true, parent: true, children: true, positions: true },
        });
      case 'jobs':
      case 'job':
        return this.prisma.job.findUnique({
          where: { id },
          include: { positions: true },
        });
      case 'positions':
      case 'position':
        return this.prisma.position.findUnique({
          where: { id },
          include: { company: true, orgUnit: true, job: true, reportsTo: true, users: true },
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
      case 'companies':
      case 'company': {
        const {
          taxId,
          nameTh,
          nameEn,
          branchType = 'HEAD_OFFICE',
          branchCode = '00000',
          branchName = 'สำนักงานใหญ่',
          commercialRegNo,
          shortName,
          addressTh,
          addressEn,
          postalCode,
          telephone,
          fax,
          email,
          website,
          bankName,
          bankBranch,
          accountType,
          accountName,
          accountNumber,
          logoUrl = '/assets/logo/logo.jpg',
          stampUrl,
          docFooterNotice,
          isDefault = false,
          isActive = true,
        } = payload;

        if (!taxId || !nameTh || !nameEn || !addressTh) {
          throw new BadRequestException('taxId, nameTh, nameEn, and addressTh are required');
        }

        const existing = await this.prisma.company.findUnique({ where: { taxId } });
        if (existing) {
          throw new ConflictException(`Company with Tax ID '${taxId}' already exists`);
        }

        if (isDefault) {
          await this.prisma.company.updateMany({
            where: { isDefault: true },
            data: { isDefault: false },
          });
        }

        const company = await this.prisma.company.create({
          data: {
            taxId,
            branchType,
            branchCode,
            branchName,
            commercialRegNo,
            nameTh,
            nameEn,
            shortName,
            addressTh,
            addressEn,
            postalCode,
            telephone,
            fax,
            email,
            website,
            bankName,
            bankBranch,
            accountType,
            accountName,
            accountNumber,
            logoUrl,
            stampUrl,
            docFooterNotice,
            isDefault: Boolean(isDefault),
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            createdById: userId || null,
            updatedById: userId || null,
          },
        });

        await this.logAudit(
          'COMPANY_CREATE',
          'Company',
          `Created company profile: ${nameTh} (${taxId})`,
          userId,
          company.id,
          null,
          { taxId, nameTh, branchCode },
        );

        return { message: `Company '${nameTh}' successfully created`, id: company.id };
      }

      case 'users':
      case 'user': {
        const { username, password, employeeId, positionId, groups = ['GENERAL_USER'] } = payload;
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
            positionId: positionId || null,
            isActive: true,
            createdById: userId || null,
            updatedById: userId || null,
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

        await this.logAudit('USER_CREATE', 'User', `Created user account: ${username}`, userId, user.id, null, { username, employeeId });
        return { message: `User '${username}' successfully created`, id: user.id };
      }

      case 'groups':
      case 'group': {
        const { name, description = '', permissions = [] } = payload;
        if (!name) throw new BadRequestException('Group name is required');
        const existing = await this.prisma.group.findUnique({ where: { name } });
        if (existing) throw new ConflictException(`Group '${name}' already exists`);

        const group = await this.prisma.group.create({
          data: {
            name,
            description,
            isActive: true,
            createdById: userId || null,
            updatedById: userId || null,
          },
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

        await this.logAudit('GROUP_CREATE', 'Group', `Created role group: ${name}`, userId, group.id, null, { name, description });
        return { message: `Group '${name}' successfully created`, id: group.id };
      }

      case 'permissions':
      case 'permission': {
        const { code, description = '' } = payload;
        if (!code) throw new BadRequestException('Permission code is required');
        const existing = await this.prisma.permission.findUnique({ where: { code } });
        if (existing) throw new ConflictException(`Permission '${code}' already exists`);

        const perm = await this.prisma.permission.create({
          data: {
            code,
            description,
            createdById: userId || null,
            updatedById: userId || null,
          },
        });

        await this.logAudit('PERM_CREATE', 'Permission', `Created permission: ${code}`, userId, perm.id, null, { code, description });
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
            authorId: payload.authorId || userId || null,
            createdById: userId || null,
            updatedById: userId || null,
          },
        });

        await this.logAudit('DOC_CREATE', 'Document', `Created document ${docNumber}: ${title}`, userId, doc.id, null, { docNumber, title, category });
        return { message: `Document '${docNumber}' created as DRAFT`, id: doc.id };
      }

      case 'menus':
      case 'menu': {
        const {
          code,
          label,
          icon = null,
          order = 0,
          adminOnly = false,
          isActive = true,
          parentId = null,
          permissionId = null,
        } = payload;

        if (!code || !label) {
          throw new BadRequestException('Menu code and label are required');
        }

        const existing = await this.prisma.menu.findUnique({ where: { code } });
        if (existing) {
          throw new ConflictException(`Menu with code '${code}' already exists`);
        }

        const menu = await this.prisma.menu.create({
          data: {
            code,
            label,
            icon: icon || null,
            order: Number(order) || 0,
            adminOnly: Boolean(adminOnly),
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            parentId: parentId || null,
            permissionId: permissionId || null,
          },
        });

        await this.logAudit(
          'MENU_CREATE',
          'Menu',
          `Created menu: ${label} (${code})`,
          userId,
          menu.id,
          null,
          { code, label, order },
        );

        return { message: `Menu '${label}' successfully created`, id: menu.id };
      }

      case 'orgunits':
      case 'orgunit':
      case 'org-unit': {
        const { code, name, nameEn = null, type, order = 0, companyId, parentId = null, isActive = true } = payload;
        if (!code || !name || !type) {
          throw new BadRequestException('code, name, and type are required');
        }
        const existing = await this.prisma.orgUnit.findUnique({ where: { code } });
        if (existing) throw new ConflictException(`OrgUnit with code '${code}' already exists`);

        let resolvedCompanyId = companyId;
        if (!resolvedCompanyId) {
          const defComp = await this.prisma.company.findFirst({ where: { isDefault: true } });
          if (!defComp) throw new BadRequestException('No company configured in system');
          resolvedCompanyId = defComp.id;
        }

        const unit = await this.prisma.orgUnit.create({
          data: {
            code,
            name,
            nameEn,
            type: type.toUpperCase(),
            order: Number(order) || 0,
            companyId: resolvedCompanyId,
            parentId: parentId || null,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            createdById: userId || null,
            updatedById: userId || null,
          },
        });
        await this.logAudit('ORG_UNIT_CREATE', 'OrgUnit', `Created OrgUnit ${name} (${code})`, userId, unit.id);
        return { message: `OrgUnit '${name}' successfully created`, id: unit.id };
      }

      case 'jobs':
      case 'job': {
        const { code, title, titleEn = null, level = 0, summary = null, responsibilities = null, qualifications = null, isActive = true } = payload;
        if (!code || !title) throw new BadRequestException('code and title are required');
        const existing = await this.prisma.job.findUnique({ where: { code } });
        if (existing) throw new ConflictException(`Job with code '${code}' already exists`);

        const job = await this.prisma.job.create({
          data: {
            code,
            title,
            titleEn,
            level: Number(level) || 0,
            summary,
            responsibilities,
            qualifications,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            createdById: userId || null,
            updatedById: userId || null,
          },
        });
        await this.logAudit('JOB_CREATE', 'Job', `Created Job Description ${title} (${code})`, userId, job.id);
        return { message: `Job '${title}' successfully created`, id: job.id };
      }

      case 'positions':
      case 'position': {
        const { code, title, isUnitHead = false, companyId, orgUnitId = null, jobId, reportsToId = null, isActive = true } = payload;
        if (!code || !title || !jobId) throw new BadRequestException('code, title, and jobId are required');
        const existing = await this.prisma.position.findUnique({ where: { code } });
        if (existing) throw new ConflictException(`Position with code '${code}' already exists`);

        let resolvedCompanyId = companyId;
        if (!resolvedCompanyId) {
          const defComp = await this.prisma.company.findFirst({ where: { isDefault: true } });
          if (!defComp) throw new BadRequestException('No company configured in system');
          resolvedCompanyId = defComp.id;
        }

        const position = await this.prisma.position.create({
          data: {
            code,
            title,
            isUnitHead: Boolean(isUnitHead),
            companyId: resolvedCompanyId,
            orgUnitId: orgUnitId || null,
            jobId,
            reportsToId: reportsToId || null,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            createdById: userId || null,
            updatedById: userId || null,
          },
        });
        await this.logAudit('POSITION_CREATE', 'Position', `Created Position ${title} (${code})`, userId, position.id);
        return { message: `Position '${title}' successfully created`, id: position.id };
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
      case 'companies':
      case 'company': {
        const company = await this.prisma.company.findUnique({ where: { id } });
        if (!company) throw new NotFoundException('Company not found');

        const updateData: any = { updatedById: userId || null };
        const fields = [
          'taxId',
          'branchType',
          'branchCode',
          'branchName',
          'commercialRegNo',
          'nameTh',
          'nameEn',
          'shortName',
          'addressTh',
          'addressEn',
          'postalCode',
          'telephone',
          'fax',
          'email',
          'website',
          'bankName',
          'bankBranch',
          'accountType',
          'accountName',
          'accountNumber',
          'logoUrl',
          'stampUrl',
          'docFooterNotice',
        ];

        for (const f of fields) {
          if (payload[f] !== undefined) updateData[f] = payload[f];
        }

        if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);
        if (payload.isDefault !== undefined) {
          updateData.isDefault = Boolean(payload.isDefault);
          if (updateData.isDefault) {
            await this.prisma.company.updateMany({
              where: { id: { not: id }, isDefault: true },
              data: { isDefault: false },
            });
          }
        }

        await this.prisma.company.update({
          where: { id },
          data: updateData,
        });

        await this.logAudit(
          'COMPANY_UPDATE',
          'Company',
          `Updated company: ${company.nameTh}`,
          userId,
          id,
          { nameTh: company.nameTh, taxId: company.taxId },
          updateData,
        );

        return { message: `Company '${company.nameTh}' successfully updated` };
      }

      case 'users':
      case 'user': {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('User not found');

        const updateData: any = { updatedById: userId || null };
        if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);
        if (payload.password) updateData.password = await bcrypt.hash(payload.password, 10);
        if (payload.employeeId !== undefined) updateData.employeeId = payload.employeeId ? payload.employeeId.trim() : null;
        if (payload.positionId !== undefined) updateData.positionId = payload.positionId || null;

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

        await this.logAudit('USER_UPDATE', 'User', `Updated user: ${user.username}`, userId, id, { isActive: user.isActive, employeeId: user.employeeId }, updateData);
        return { message: `User '${user.username}' successfully updated` };
      }

      case 'groups':
      case 'group': {
        const group = await this.prisma.group.findUnique({ where: { id } });
        if (!group) throw new NotFoundException('Group not found');

        const updateData: any = { updatedById: userId || null };
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

        await this.logAudit('GROUP_UPDATE', 'Group', `Updated role group: ${group.name}`, userId, id, { description: group.description, isActive: group.isActive }, updateData);
        return { message: `Group '${group.name}' successfully updated` };
      }

      case 'permissions':
      case 'permission': {
        const perm = await this.prisma.permission.findUnique({ where: { id } });
        if (!perm) throw new NotFoundException('Permission not found');

        await this.prisma.permission.update({
          where: { id },
          data: { description: payload.description, updatedById: userId || null },
        });

        await this.logAudit('PERM_UPDATE', 'Permission', `Updated permission: ${perm.code}`, userId, id, { description: perm.description }, { description: payload.description });
        return { message: `Permission '${perm.code}' updated` };
      }

      case 'documents':
      case 'document': {
        const doc = await this.prisma.document.findUnique({ where: { id } });
        if (!doc) throw new NotFoundException('Document not found');
        if (doc.status === 'CONFIRMED') {
          throw new BadRequestException('Cannot modify a CONFIRMED document. Revoke or cancel first.');
        }

        const updateData: any = { updatedById: userId || null };
        if (payload.title) updateData.title = payload.title;
        if (payload.category) updateData.category = payload.category;
        if (payload.content !== undefined) updateData.content = payload.content;
        if (payload.authorId !== undefined) updateData.authorId = payload.authorId || null;

        await this.prisma.document.update({ where: { id }, data: updateData });
        await this.logAudit('DOC_UPDATE', 'Document', `Updated document ${doc.docNumber}`, userId, id, { title: doc.title, category: doc.category }, updateData);
        return { message: `Document '${doc.docNumber}' updated` };
      }

      case 'menus':
      case 'menu': {
        const menu = await this.prisma.menu.findUnique({ where: { id } });
        if (!menu) throw new NotFoundException('Menu not found');

        const updateData: any = {};
        if (payload.label !== undefined) updateData.label = payload.label;
        if (payload.icon !== undefined) updateData.icon = payload.icon || null;
        if (payload.order !== undefined) updateData.order = Number(payload.order) || 0;
        if (payload.adminOnly !== undefined) updateData.adminOnly = Boolean(payload.adminOnly);
        if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);
        if (payload.parentId !== undefined) updateData.parentId = payload.parentId || null;
        if (payload.permissionId !== undefined) updateData.permissionId = payload.permissionId || null;

        await this.prisma.menu.update({
          where: { id },
          data: updateData,
        });

        await this.logAudit(
          'MENU_UPDATE',
          'Menu',
          `Updated menu: ${menu.label} (${menu.code})`,
          userId,
          id,
          { label: menu.label, order: menu.order, permissionId: menu.permissionId },
          updateData,
        );

        return { message: `Menu '${menu.label}' successfully updated` };
      }

      case 'orgunits':
      case 'orgunit':
      case 'org-unit': {
        const unit = await this.prisma.orgUnit.findUnique({ where: { id } });
        if (!unit) throw new NotFoundException('OrgUnit not found');

        const updateData: any = { updatedById: userId || null };
        if (payload.name !== undefined) updateData.name = payload.name;
        if (payload.nameEn !== undefined) updateData.nameEn = payload.nameEn || null;
        if (payload.type !== undefined) updateData.type = payload.type.toUpperCase();
        if (payload.order !== undefined) updateData.order = Number(payload.order) || 0;
        if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);
        if (payload.parentId !== undefined) updateData.parentId = payload.parentId || null;

        if (updateData.parentId === id) {
          throw new BadRequestException('Cannot set OrgUnit as its own parent');
        }

        await this.prisma.orgUnit.update({ where: { id }, data: updateData });
        await this.logAudit('ORG_UNIT_UPDATE', 'OrgUnit', `Updated OrgUnit ${unit.name}`, userId, id, null, updateData);
        return { message: `OrgUnit '${unit.name}' successfully updated` };
      }

      case 'jobs':
      case 'job': {
        const job = await this.prisma.job.findUnique({ where: { id } });
        if (!job) throw new NotFoundException('Job description not found');

        const updateData: any = { updatedById: userId || null };
        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.titleEn !== undefined) updateData.titleEn = payload.titleEn || null;
        if (payload.level !== undefined) updateData.level = Number(payload.level) || 0;
        if (payload.summary !== undefined) updateData.summary = payload.summary || null;
        if (payload.responsibilities !== undefined) updateData.responsibilities = payload.responsibilities || null;
        if (payload.qualifications !== undefined) updateData.qualifications = payload.qualifications || null;
        if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);

        await this.prisma.job.update({ where: { id }, data: updateData });
        await this.logAudit('JOB_UPDATE', 'Job', `Updated Job Description ${job.title}`, userId, id, null, updateData);
        return { message: `Job '${job.title}' successfully updated` };
      }

      case 'positions':
      case 'position': {
        const position = await this.prisma.position.findUnique({ where: { id } });
        if (!position) throw new NotFoundException('Position not found');

        const updateData: any = { updatedById: userId || null };
        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.isUnitHead !== undefined) updateData.isUnitHead = Boolean(payload.isUnitHead);
        if (payload.orgUnitId !== undefined) updateData.orgUnitId = payload.orgUnitId || null;
        if (payload.jobId !== undefined) updateData.jobId = payload.jobId;
        if (payload.reportsToId !== undefined) updateData.reportsToId = payload.reportsToId || null;
        if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);

        if (updateData.reportsToId === id) {
          throw new BadRequestException('Cannot set Position to report to itself');
        }

        await this.prisma.position.update({ where: { id }, data: updateData });
        await this.logAudit('POSITION_UPDATE', 'Position', `Updated Position ${position.title}`, userId, id, null, updateData);
        return { message: `Position '${position.title}' successfully updated` };
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
      case 'companies':
      case 'company': {
        const company = await this.prisma.company.findUnique({ where: { id } });
        if (!company) throw new NotFoundException('Company not found');
        if (company.isDefault) {
          throw new ConflictException('Cannot delete default primary company profile');
        }
        await this.prisma.company.delete({ where: { id } });
        await this.logAudit('COMPANY_DELETE', 'Company', `Deleted company: ${company.nameTh}`, userId);
        return { message: `Company '${company.nameTh}' deleted` };
      }

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

      case 'menus':
      case 'menu': {
        const menu = await this.prisma.menu.findUnique({ where: { id } });
        if (!menu) throw new NotFoundException('Menu not found');
        if (menu.code === 'home') {
          throw new ConflictException('Cannot delete default home menu');
        }
        await this.prisma.menu.delete({ where: { id } });
        await this.logAudit('MENU_DELETE', 'Menu', `Deleted menu: ${menu.label} (${menu.code})`, userId);
        return { message: `Menu '${menu.label}' deleted` };
      }

      case 'orgunits':
      case 'orgunit':
      case 'org-unit': {
        const unit = await this.prisma.orgUnit.findUnique({
          where: { id },
          include: { _count: { select: { children: true, positions: true } } },
        });
        if (!unit) throw new NotFoundException('OrgUnit not found');
        if (unit._count.children > 0) {
          throw new ConflictException(`Cannot delete unit '${unit.name}' because it contains ${unit._count.children} child units`);
        }
        if (unit._count.positions > 0) {
          throw new ConflictException(`Cannot delete unit '${unit.name}' because it has ${unit._count.positions} positions assigned`);
        }
        await this.prisma.orgUnit.delete({ where: { id } });
        await this.logAudit('ORG_UNIT_DELETE', 'OrgUnit', `Deleted OrgUnit ${unit.name}`, userId);
        return { message: `OrgUnit '${unit.name}' deleted` };
      }

      case 'jobs':
      case 'job': {
        const job = await this.prisma.job.findUnique({
          where: { id },
          include: { _count: { select: { positions: true } } },
        });
        if (!job) throw new NotFoundException('Job description not found');
        if (job._count.positions > 0) {
          throw new ConflictException(`Cannot delete Job '${job.title}' because it is assigned to ${job._count.positions} positions`);
        }
        await this.prisma.job.delete({ where: { id } });
        await this.logAudit('JOB_DELETE', 'Job', `Deleted Job Description ${job.title}`, userId);
        return { message: `Job '${job.title}' deleted` };
      }

      case 'positions':
      case 'position': {
        const position = await this.prisma.position.findUnique({
          where: { id },
          include: { _count: { select: { users: true, subordinates: true } } },
        });
        if (!position) throw new NotFoundException('Position not found');
        if (position._count.users > 0) {
          throw new ConflictException(`Cannot delete Position '${position.title}' because ${position._count.users} user(s) occupy it`);
        }
        if (position._count.subordinates > 0) {
          throw new ConflictException(`Cannot delete Position '${position.title}' because ${position._count.subordinates} position(s) report to it`);
        }
        await this.prisma.position.delete({ where: { id } });
        await this.logAudit('POSITION_DELETE', 'Position', `Deleted Position ${position.title}`, userId);
        return { message: `Position '${position.title}' deleted` };
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

    const fieldHeaderMaps: Record<string, Record<string, string>> = {
      company: {
        taxId: 'เลขประจำตัวผู้เสียภาษี (Tax ID)',
        nameTh: 'ชื่อบริษัท (ภาษาไทย)',
        nameEn: 'ชื่อบริษัท (ภาษาอังกฤษ)',
        shortName: 'ชื่อย่อ',
        branchType: 'ประเภทสาขา',
        branchCode: 'รหัสสาขา',
        branchName: 'ชื่อสาขา',
        commercialRegNo: 'เลขทะเบียนพาณิชย์',
        addressTh: 'ที่อยู่จดทะเบียน (ภาษาไทย)',
        addressEn: 'ที่อยู่ (ภาษาอังกฤษ)',
        postalCode: 'รหัสไปรษณีย์',
        telephone: 'เบอร์โทรศัพท์',
        fax: 'เบอร์โทรสาร',
        email: 'อีเมลติดต่อ',
        website: 'เว็บไซต์',
        bankName: 'ชื่อธนาคาร',
        bankBranch: 'สาขาธนาคาร',
        accountType: 'ประเภทบัญชี',
        accountName: 'ชื่อบัญชี',
        accountNumber: 'เลขที่บัญชี',
        isDefault: 'สำนักงานหลัก',
        isActive: 'สถานะเปิดใช้งาน',
        createdAt: 'วันที่สร้างในระบบ',
        updatedAt: 'วันที่ปรับปรุงล่าสุด',
      },
      menu: {
        code: 'รหัสเมนู (Code)',
        label: 'ชื่อเมนู (Label)',
        order: 'ลำดับการแสดงผล (Order)',
        adminOnly: 'เฉพาะแอดมิน (Admin Only)',
        isActive: 'สถานะเปิดใช้งาน (Active)',
        parentCode: 'เมนูหลัก (Parent Code)',
        parentLabel: 'ชื่อเมนูหลัก (Parent Label)',
        permissionCode: 'สิทธิ์ที่จำเป็น (Permission Code)',
        permissionDesc: 'คำอธิบายสิทธิ์ (Permission Description)',
        createdAt: 'วันที่สร้างในระบบ',
        updatedAt: 'วันที่ปรับปรุงล่าสุด',
      },
      orgunit: {
        code: 'รหัสหน่วยงาน (Code)',
        name: 'ชื่อหน่วยงาน (Name)',
        nameEn: 'ชื่อภาษาอังกฤษ (Name EN)',
        type: 'ประเภท (Type: BRANCH/DIVISION/DEPARTMENT/SECTION)',
        order: 'ลำดับ (Order)',
        isActive: 'สถานะเปิดใช้งาน (Active)',
        companyName: 'บริษัทที่สังกัด (Company)',
        parentCode: 'รหัสสังกัดหลัก (Parent Code)',
        parentName: 'ชื่อสังกัดหลัก (Parent Name)',
        childCount: 'จำนวนหน่วยงานย่อย',
        positionCount: 'จำนวนตำแหน่งงาน',
        createdAt: 'วันที่สร้างในระบบ',
        updatedAt: 'วันที่ปรับปรุงล่าสุด',
      },
      job: {
        code: 'รหัสลักษณะงาน (Job Code)',
        title: 'ชื่อลักษณะงาน (Title)',
        titleEn: 'ชื่อภาษาอังกฤษ (Title EN)',
        level: 'ระดับงาน (Level / Grade)',
        summary: 'วัตถุประสงค์ของงาน (Summary)',
        responsibilities: 'หน้าที่ความรับผิดชอบ (Responsibilities)',
        qualifications: 'คุณสมบัติ (Qualifications)',
        isActive: 'สถานะเปิดใช้งาน (Active)',
        positionCount: 'จำนวนอัตราตำแหน่งงาน',
        createdAt: 'วันที่สร้างในระบบ',
        updatedAt: 'วันที่ปรับปรุงล่าสุด',
      },
      position: {
        code: 'รหัสตำแหน่ง (Position Code)',
        title: 'ชื่อตำแหน่ง (Position Title)',
        isUnitHead: 'เป็นหัวหน้าหน่วยงาน',
        isActive: 'สถานะเปิดใช้งาน (Active)',
        companyName: 'บริษัทที่สังกัด (Company)',
        orgUnitName: 'หน่วยงานสังกัด (OrgUnit)',
        orgUnitType: 'ประเภทหน่วยงาน',
        jobTitle: 'ลักษณะงาน (Job / JD)',
        jobLevel: 'ระดับงาน (Level)',
        reportsToTitle: 'ขึ้นตรงต่อตำแหน่ง (Reports To)',
        occupants: 'ผู้ครองตำแหน่งปัจจุบัน',
        createdAt: 'วันที่สร้างในระบบ',
        updatedAt: 'วันที่ปรับปรุงล่าสุด',
      },
    };

    const map = fieldHeaderMaps[tableName.toLowerCase()] || {};
    const rawKeys = Object.keys(records[0]);
    const headers = rawKeys.map((k) => `"${map[k] || k}"`);
    const csvRows = [
      headers.join(','),
      ...records.map((row) =>
        rawKeys
          .map((h) => {
            let val = row[h];
            if (val === true) val = 'ใช่ (Active/Default)';
            if (val === false) val = 'ไม่ใช่';
            if (val === null || val === undefined) return '""';
            const strVal = Array.isArray(val) ? val.join('; ') : String(val);
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
