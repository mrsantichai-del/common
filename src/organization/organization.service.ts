import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Audit Logger Helper
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
          oldValue: oldValue ? JSON.stringify(oldValue) : null,
          newValue: newValue ? JSON.stringify(newValue) : null,
          userId: userId || null,
          ipAddress: '127.0.0.1',
        },
      });
    } catch (e) {
      console.warn('[AuditLog] Failed to persist organization audit:', e.message);
    }
  }

  // --------------------------------------------------------------------------
  // 1. Org Chart Hierarchy Tree (ผังโครงสร้างองค์กร)
  // --------------------------------------------------------------------------
  async getOrgChart(companyId?: string) {
    let targetCompany: any = null;
    if (companyId) {
      targetCompany = await this.prisma.company.findUnique({ where: { id: companyId } });
    } else {
      targetCompany = await this.prisma.company.findFirst({ where: { isDefault: true, isActive: true } });
      if (!targetCompany) {
        targetCompany = await this.prisma.company.findFirst({ where: { isActive: true } });
      }
    }

    if (!targetCompany) {
      throw new NotFoundException('Company profile not configured in database');
    }

    // ดึง OrgUnits ทั้งหมดในบริษัท พร้อมตำแหน่งและพนักงาน
    const units = await this.prisma.orgUnit.findMany({
      where: { companyId: targetCompany.id, isActive: true },
      include: {
        positions: {
          where: { isActive: true },
          include: {
            job: true,
            users: { select: { id: true, username: true, employeeId: true } },
            reportsTo: { select: { id: true, title: true, code: true } },
          },
          orderBy: [{ isUnitHead: 'desc' }, { title: 'asc' }],
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    // ดึงตำแหน่งระดับบริษัท (Company Level เช่น CEO/กรรมการผู้จัดการ ที่ orgUnitId = null)
    const companyPositions = await this.prisma.position.findMany({
      where: { companyId: targetCompany.id, orgUnitId: null, isActive: true },
      include: {
        job: true,
        users: { select: { id: true, username: true, employeeId: true } },
        reportsTo: { select: { id: true, title: true, code: true } },
      },
      orderBy: [{ isUnitHead: 'desc' }, { title: 'asc' }],
    });

    // สร้าง Tree โครงสร้างองค์กร
    const unitMap = new Map<string, any>();
    units.forEach((u) => {
      unitMap.set(u.id, {
        id: u.id,
        code: u.code,
        name: u.name,
        nameEn: u.nameEn,
        type: u.type,
        order: u.order,
        parentId: u.parentId,
        positions: u.positions.map((p) => {
          const actualCount = p.users ? p.users.length : 0;
          let headcountStatus = 'OPTIMAL';
          let headcountDiff = 0;
          if (actualCount < p.minHeadcount) {
            headcountStatus = 'UNDER_STAFFED';
            headcountDiff = p.minHeadcount - actualCount;
          } else if (actualCount > p.maxHeadcount) {
            headcountStatus = 'OVER_STAFFED';
            headcountDiff = actualCount - p.maxHeadcount;
          }

          return {
            id: p.id,
            code: p.code,
            title: p.title,
            isUnitHead: p.isUnitHead,
            minHeadcount: p.minHeadcount,
            maxHeadcount: p.maxHeadcount,
            actualCount,
            headcountStatus,
            headcountDiff,
            job: p.job,
            reportsTo: p.reportsTo,
            users: p.users,
          };
        }),
        children: [],
      });
    });

    const rootUnits: any[] = [];
    units.forEach((u) => {
      const node = unitMap.get(u.id);
      if (u.parentId && unitMap.has(u.parentId)) {
        unitMap.get(u.parentId).children.push(node);
      } else {
        rootUnits.push(node);
      }
    });

    return {
      company: {
        id: targetCompany.id,
        nameTh: targetCompany.nameTh,
        nameEn: targetCompany.nameEn,
        taxId: targetCompany.taxId,
        logoUrl: targetCompany.logoUrl,
      },
      companyPositions: companyPositions.map((p) => {
        const actualCount = p.users ? p.users.length : 0;
        let headcountStatus = 'OPTIMAL';
        let headcountDiff = 0;
        if (actualCount < p.minHeadcount) {
          headcountStatus = 'UNDER_STAFFED';
          headcountDiff = p.minHeadcount - actualCount;
        } else if (actualCount > p.maxHeadcount) {
          headcountStatus = 'OVER_STAFFED';
          headcountDiff = actualCount - p.maxHeadcount;
        }

        return {
          id: p.id,
          code: p.code,
          title: p.title,
          isUnitHead: p.isUnitHead,
          minHeadcount: p.minHeadcount,
          maxHeadcount: p.maxHeadcount,
          actualCount,
          headcountStatus,
          headcountDiff,
          job: p.job,
          reportsTo: p.reportsTo,
          users: p.users,
        };
      }),
      tree: rootUnits,
      totalUnits: units.length,
      totalPositions: units.reduce((acc, u) => acc + u.positions.length, 0) + companyPositions.length,
    };
  }

  // --------------------------------------------------------------------------
  // 2. OrgUnit (สาขา, ฝ่าย, แผนก, ส่วน) CRUD
  // --------------------------------------------------------------------------
  async findAllUnits(query: { search?: string; type?: string; companyId?: string }) {
    const where: any = {};
    if (query.search?.trim()) {
      where.OR = [
        { code: { contains: query.search.trim() } },
        { name: { contains: query.search.trim() } },
        { nameEn: { contains: query.search.trim() } },
      ];
    }
    if (query.type) where.type = query.type;
    if (query.companyId) where.companyId = query.companyId;

    const units = await this.prisma.orgUnit.findMany({
      where,
      include: {
        company: { select: { id: true, nameTh: true, shortName: true } },
        parent: { select: { id: true, code: true, name: true, type: true } },
        _count: { select: { children: true, positions: true } },
      },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
    });

    return units.map((u) => ({
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
      parentType: u.parent ? u.parent.type : null,
      childCount: u._count.children,
      positionCount: u._count.positions,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  async findOneUnit(id: string) {
    const unit = await this.prisma.orgUnit.findUnique({
      where: { id },
      include: {
        company: true,
        parent: true,
        children: { orderBy: { order: 'asc' } },
        positions: { include: { job: true, users: true } },
      },
    });
    if (!unit) throw new NotFoundException('Organization unit not found');
    return unit;
  }

  async createUnit(payload: any, userId?: string) {
    const { code, name, nameEn = null, type, order = 0, companyId, parentId = null, isActive = true } = payload;
    if (!code || !name || !type) {
      throw new BadRequestException('code, name, and type are required');
    }

    const existing = await this.prisma.orgUnit.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`OrgUnit with code '${code}' already exists`);
    }

    // Resolve companyId
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

    await this.logAudit('ORG_UNIT_CREATE', 'OrgUnit', `Created OrgUnit ${name} (${code}) [${type}]`, userId, unit.id, null, { code, name, type });
    return { message: `OrgUnit '${name}' successfully created`, id: unit.id };
  }

  async updateUnit(id: string, payload: any, userId?: string) {
    const unit = await this.prisma.orgUnit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException('Organization unit not found');

    const updateData: any = { updatedById: userId || null };
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.nameEn !== undefined) updateData.nameEn = payload.nameEn || null;
    if (payload.type !== undefined) updateData.type = payload.type.toUpperCase();
    if (payload.order !== undefined) updateData.order = Number(payload.order) || 0;
    if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);
    if (payload.parentId !== undefined) updateData.parentId = payload.parentId || null;

    // Prevent cyclic parent assignment
    if (updateData.parentId === id) {
      throw new BadRequestException('Cannot set OrgUnit as its own parent');
    }

    await this.prisma.orgUnit.update({ where: { id }, data: updateData });
    await this.logAudit('ORG_UNIT_UPDATE', 'OrgUnit', `Updated OrgUnit ${unit.name} (${unit.code})`, userId, id, { name: unit.name }, updateData);
    return { message: `OrgUnit '${unit.name}' successfully updated` };
  }

  async deleteUnit(id: string, userId?: string) {
    const unit = await this.prisma.orgUnit.findUnique({
      where: { id },
      include: { _count: { select: { children: true, positions: true } } },
    });
    if (!unit) throw new NotFoundException('Organization unit not found');

    if (unit._count.children > 0) {
      throw new ConflictException(`Cannot delete unit '${unit.name}' because it contains ${unit._count.children} child units`);
    }
    if (unit._count.positions > 0) {
      throw new ConflictException(`Cannot delete unit '${unit.name}' because it has ${unit._count.positions} positions assigned`);
    }

    await this.prisma.orgUnit.delete({ where: { id } });
    await this.logAudit('ORG_UNIT_DELETE', 'OrgUnit', `Deleted OrgUnit ${unit.name} (${unit.code})`, userId);
    return { message: `OrgUnit '${unit.name}' deleted` };
  }

  // --------------------------------------------------------------------------
  // 3. Job Description (ต้นแบบลักษณะงาน) CRUD
  // --------------------------------------------------------------------------
  async findAllJobs(query: { search?: string; level?: number }) {
    const where: any = {};
    if (query.search?.trim()) {
      where.OR = [
        { code: { contains: query.search.trim() } },
        { title: { contains: query.search.trim() } },
        { titleEn: { contains: query.search.trim() } },
      ];
    }
    if (query.level !== undefined) where.level = Number(query.level);

    const jobs = await this.prisma.job.findMany({
      where,
      include: {
        _count: { select: { positions: true } },
      },
      orderBy: [{ level: 'desc' }, { code: 'asc' }],
    });

    return jobs.map((j) => ({
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
    }));
  }

  async findOneJob(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        positions: { include: { orgUnit: true, users: true } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!job) throw new NotFoundException('Job description not found');
    return job;
  }

  async createJob(payload: any, userId?: string) {
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

    await this.logAudit('JOB_CREATE', 'Job', `Created Job Description ${title} (${code})`, userId, job.id, null, { code, title, level });
    return { message: `Job '${title}' successfully created`, id: job.id };
  }

  async updateJob(id: string, payload: any, userId?: string) {
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
    await this.logAudit('JOB_UPDATE', 'Job', `Updated Job Description ${job.title} (${job.code})`, userId, id, { title: job.title }, updateData);
    return { message: `Job '${job.title}' successfully updated` };
  }

  async deleteJob(id: string, userId?: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { _count: { select: { positions: true } } },
    });
    if (!job) throw new NotFoundException('Job description not found');

    if (job._count.positions > 0) {
      throw new ConflictException(`Cannot delete Job '${job.title}' because it is assigned to ${job._count.positions} positions`);
    }

    await this.prisma.job.delete({ where: { id } });
    await this.logAudit('JOB_DELETE', 'Job', `Deleted Job Description ${job.title} (${job.code})`, userId);
    return { message: `Job '${job.title}' deleted` };
  }

  // --------------------------------------------------------------------------
  // 3.1 Job Documents & Revisions (เอกสารฉบับลงนาม & ประวัติเวอร์ชัน ISO 9001)
  // --------------------------------------------------------------------------
  async getJobDocuments(jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job description not found');

    return this.prisma.jobDocument.findMany({
      where: { jobId },
      orderBy: [{ revisionNo: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async uploadJobDocument(
    jobId: string,
    file: any,
    meta: { revisionNo?: string; effectiveDate?: string; note?: string },
    userId?: string,
  ) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job description not found');

    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Default revision: if not provided, find latest revision and auto increment
    let revisionNo = meta.revisionNo?.trim();
    if (!revisionNo) {
      const latest = await this.prisma.jobDocument.findFirst({
        where: { jobId },
        orderBy: { createdAt: 'desc' },
      });
      if (latest && !isNaN(Number(latest.revisionNo))) {
        const nextRev = Number(latest.revisionNo) + 1;
        revisionNo = String(nextRev).padStart(2, '0');
      } else {
        revisionNo = '00';
      }
    }

    // Decode original filename if needed
    let originalName = file.originalname;
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch {
      originalName = file.originalname;
    }

    const doc = await this.prisma.jobDocument.create({
      data: {
        jobId,
        revisionNo,
        fileName: originalName,
        filePath: file.path.replace(/\\/g, '/'),
        fileSize: file.size,
        mimeType: file.mimetype,
        effectiveDate: meta.effectiveDate ? new Date(meta.effectiveDate) : null,
        note: meta.note?.trim() || null,
        uploadedById: userId || null,
      },
    });

    await this.logAudit(
      'JOB_DOCUMENT_UPLOAD',
      'JobDocument',
      `Uploaded signed document Rev. ${revisionNo} (${doc.fileName}) for Job ${job.title} (${job.code})`,
      userId,
      doc.id,
      null,
      { revisionNo, fileName: doc.fileName, fileSize: doc.fileSize },
    );

    return {
      message: `บันทึกเอกสารฉบับลงนาม Rev. ${revisionNo} เรียบร้อยแล้ว`,
      document: doc,
    };
  }

  async getJobDocument(docId: string) {
    const doc = await this.prisma.jobDocument.findUnique({
      where: { id: docId },
      include: { job: true },
    });
    if (!doc) throw new NotFoundException('Job document not found');
    return doc;
  }

  async deleteJobDocument(docId: string, userId?: string) {
    const doc = await this.prisma.jobDocument.findUnique({
      where: { id: docId },
      include: { job: true },
    });
    if (!doc) throw new NotFoundException('Job document not found');

    try {
      const fs = await import('fs');
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    } catch (e) {
      console.warn(`[DeleteJobDocument] Failed to unlink file ${doc.filePath}:`, e.message);
    }

    await this.prisma.jobDocument.delete({ where: { id: docId } });
    await this.logAudit(
      'JOB_DOCUMENT_DELETE',
      'JobDocument',
      `Deleted document Rev. ${doc.revisionNo} (${doc.fileName}) of Job ${doc.job?.title}`,
      userId,
      docId,
      { fileName: doc.fileName, revisionNo: doc.revisionNo },
    );

    return { message: `ลบเอกสาร Rev. ${doc.revisionNo} เรียบร้อยแล้ว` };
  }

  // --------------------------------------------------------------------------
  // 4. Position (ตำแหน่งงาน / อัตรากำลัง) CRUD
  // --------------------------------------------------------------------------
  async findAllPositions(query: { search?: string; orgUnitId?: string; jobId?: string; companyId?: string }) {
    const where: any = {};
    if (query.search?.trim()) {
      where.OR = [
        { code: { contains: query.search.trim() } },
        { title: { contains: query.search.trim() } },
      ];
    }
    if (query.orgUnitId) where.orgUnitId = query.orgUnitId;
    if (query.jobId) where.jobId = query.jobId;
    if (query.companyId) where.companyId = query.companyId;

    const positions = await this.prisma.position.findMany({
      where,
      include: {
        company: { select: { id: true, nameTh: true } },
        orgUnit: { select: { id: true, code: true, name: true, type: true } },
        job: { select: { id: true, code: true, title: true, level: true } },
        reportsTo: { select: { id: true, code: true, title: true } },
        users: { select: { id: true, username: true, employeeId: true } },
      },
      orderBy: [{ orgUnitId: 'asc' }, { isUnitHead: 'desc' }, { title: 'asc' }],
    });

    return positions.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      isUnitHead: p.isUnitHead,
      isActive: p.isActive,
      companyId: p.companyId,
      companyName: p.company ? p.company.nameTh : null,
      orgUnitId: p.orgUnitId,
      orgUnitCode: p.orgUnit ? p.orgUnit.code : null,
      orgUnitName: p.orgUnit ? p.orgUnit.name : 'ส่วนกลาง / ระดับบริษัท (Company Level)',
      orgUnitType: p.orgUnit ? p.orgUnit.type : null,
      jobId: p.jobId,
      jobCode: p.job ? p.job.code : null,
      jobTitle: p.job ? p.job.title : null,
      jobLevel: p.job ? p.job.level : 0,
      reportsToId: p.reportsToId,
      reportsToCode: p.reportsTo ? p.reportsTo.code : null,
      reportsToTitle: p.reportsTo ? p.reportsTo.title : null,
      occupantCount: p.users.length,
      occupants: p.users.map((u) => u.username + (u.employeeId ? ` (${u.employeeId})` : '')).join(', '),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async findOnePosition(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        company: true,
        orgUnit: true,
        job: true,
        reportsTo: true,
        subordinates: { include: { job: true, users: true } },
        users: true,
      },
    });
    if (!position) throw new NotFoundException('Position not found');
    return position;
  }

  async createPosition(payload: any, userId?: string) {
    const { code, title, isUnitHead = false, minHeadcount = 1, maxHeadcount = 1, companyId, orgUnitId = null, jobId, reportsToId = null, isActive = true } = payload;
    if (!code || !title || !jobId) {
      throw new BadRequestException('code, title, and jobId are required');
    }

    const existing = await this.prisma.position.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`Position with code '${code}' already exists`);

    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId) {
      const defComp = await this.prisma.company.findFirst({ where: { isDefault: true } });
      if (!defComp) throw new BadRequestException('No company configured in system');
      resolvedCompanyId = defComp.id;
    }

    const parsedMin = Math.max(1, parseInt(minHeadcount, 10) || 1);
    const parsedMax = Math.max(parsedMin, parseInt(maxHeadcount, 10) || parsedMin);

    const position = await this.prisma.position.create({
      data: {
        code,
        title,
        isUnitHead: Boolean(isUnitHead),
        minHeadcount: parsedMin,
        maxHeadcount: parsedMax,
        companyId: resolvedCompanyId,
        orgUnitId: orgUnitId || null,
        jobId,
        reportsToId: reportsToId || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdById: userId || null,
        updatedById: userId || null,
      },
    });

    await this.logAudit('POSITION_CREATE', 'Position', `Created Position ${title} (${code}) [Quota: ${parsedMin}-${parsedMax}]`, userId, position.id, null, { code, title, jobId });
    return { message: `Position '${title}' successfully created`, id: position.id };
  }

  async updatePosition(id: string, payload: any, userId?: string) {
    const position = await this.prisma.position.findUnique({ where: { id } });
    if (!position) throw new NotFoundException('Position not found');

    const updateData: any = { updatedById: userId || null };
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.isUnitHead !== undefined) updateData.isUnitHead = Boolean(payload.isUnitHead);
    if (payload.minHeadcount !== undefined) {
      updateData.minHeadcount = Math.max(1, parseInt(payload.minHeadcount, 10) || 1);
    }
    if (payload.maxHeadcount !== undefined) {
      const minVal = updateData.minHeadcount !== undefined ? updateData.minHeadcount : position.minHeadcount;
      updateData.maxHeadcount = Math.max(minVal, parseInt(payload.maxHeadcount, 10) || minVal);
    }
    if (payload.orgUnitId !== undefined) updateData.orgUnitId = payload.orgUnitId || null;
    if (payload.jobId !== undefined) updateData.jobId = payload.jobId;
    if (payload.reportsToId !== undefined) updateData.reportsToId = payload.reportsToId || null;
    if (payload.isActive !== undefined) updateData.isActive = Boolean(payload.isActive);

    if (updateData.reportsToId === id) {
      throw new BadRequestException('Cannot set Position to report to itself');
    }

    await this.prisma.position.update({ where: { id }, data: updateData });
    await this.logAudit('POSITION_UPDATE', 'Position', `Updated Position ${position.title} (${position.code})`, userId, id, { title: position.title }, updateData);
    return { message: `Position '${position.title}' successfully updated` };
  }

  async deletePosition(id: string, userId?: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, subordinates: true } },
      },
    });
    if (!position) throw new NotFoundException('Position not found');

    if (position._count.users > 0) {
      throw new ConflictException(`Cannot delete Position '${position.title}' because ${position._count.users} user(s) currently occupy it`);
    }
    if (position._count.subordinates > 0) {
      throw new ConflictException(`Cannot delete Position '${position.title}' because ${position._count.subordinates} position(s) report to it`);
    }

    await this.prisma.position.delete({ where: { id } });
    await this.logAudit('POSITION_DELETE', 'Position', `Deleted Position ${position.title} (${position.code})`, userId);
    return { message: `Position '${position.title}' deleted` };
  }
}
