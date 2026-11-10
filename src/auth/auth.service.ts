import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async getAvailableGroups() {
    return this.prisma.group.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async getDemoAccounts() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        username: true,
        employeeId: true,
        groups: {
          select: {
            group: {
              select: {
                name: true,
                description: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => {
      const primaryGroup = u.groups[0]?.group;
      return {
        id: u.id,
        username: u.username,
        employeeId: u.employeeId,
        groupName: primaryGroup?.name || 'GENERAL_USER',
        groupDescription: primaryGroup?.description || 'ผู้ใช้งานระบบ',
      };
    });
  }

  async getSystemMenus() {
    const menus = await this.prisma.menu.findMany({
      where: { parentId: null, isActive: true },
      include: {
        permission: true,
        submenus: {
          where: { isActive: true },
          include: { permission: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return menus.map((m) => ({
      id: m.code,
      label: m.label,
      icon: m.icon,
      order: m.order,
      adminOnly: m.adminOnly,
      requiredPermission: m.permission ? m.permission.code : null,
      submenus: m.submenus.map((s) => ({
        id: s.code,
        label: s.label,
        order: s.order,
        adminOnly: s.adminOnly,
        requiredPermission: s.permission ? s.permission.code : null,
      })),
    }));
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: registerDto.username },
    });

    if (existing) {
      throw new ConflictException('Username is already taken');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        username: registerDto.username,
        password: hashedPassword,
      },
    });

    const targetGroupNames =
      registerDto.groups && registerDto.groups.length > 0
        ? registerDto.groups
        : ['GENERAL_USER'];

    const groups = await this.prisma.group.findMany({
      where: { name: { in: targetGroupNames } },
    });

    for (const group of groups) {
      await this.prisma.userGroup.create({
        data: {
          userId: user.id,
          groupId: group.id,
        },
      });
    }

    return {
      message: 'User created successfully with assigned group memberships',
      user: {
        id: user.id,
        username: user.username,
        assignedGroups: groups.map((g) => g.name),
      },
    };
  }

  async getPublicCompanyInfo() {
    const company = await this.prisma.company.findFirst({
      where: { isDefault: true, isActive: true },
      select: {
        id: true,
        nameTh: true,
        nameEn: true,
        shortName: true,
        taxId: true,
        branchName: true,
        logoUrl: true,
        docFooterNotice: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company profile not configured in database table');
    }
    return company;
  }

  async login(loginDto: LoginDto) {
    const identifier = (loginDto.username || '').trim();
    if (!identifier || !loginDto.password) {
      throw new UnauthorizedException('Username/Employee ID and password are required');
    }

    // รองรับการเข้าสู่ระบบด้วยชื่อผู้ใช้ (Username) หรือ รหัสพนักงาน (Employee ID) แบบ Case-Insensitive
    const rawMatches = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT id FROM User WHERE LOWER(username) = LOWER(?) OR LOWER(employeeId) = LOWER(?) LIMIT 1',
      identifier,
      identifier,
    );

    if (!rawMatches || rawMatches.length === 0) {
      throw new UnauthorizedException('ชื่อผู้ใช้/รหัสพนักงาน หรือรหัสผ่านไม่ถูกต้อง');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: rawMatches[0].id },
      include: {
        groups: {
          include: {
            group: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('ชื่อผู้ใช้/รหัสพนักงาน หรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('บัญชีผู้ใช้งานนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('ชื่อผู้ใช้/รหัสพนักงาน หรือรหัสผ่านไม่ถูกต้อง');
    }

    const groupNames = user.groups.map((ug) => ug.group.name);
    const permissionSet = new Set<string>();
    for (const ug of user.groups) {
      for (const gp of ug.group.permissions) {
        permissionSet.add(gp.permission.code);
      }
    }

    const payload = {
      sub: user.id,
      username: user.username,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    // ดึงข้อมูลบริษัทหลักสำหรับแสดงผล
    const defaultCompany = await this.prisma.company.findFirst({
      where: { isDefault: true },
      select: {
        nameTh: true,
        nameEn: true,
        logoUrl: true,
      },
    });

    // บันทึก AuditLog การเข้าสู่ระบบ
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'USER_LOGIN',
          target: 'User',
          targetId: user.id,
          userId: user.id,
          details: `User '${user.username}' (Employee ID: ${user.employeeId || '-'}) logged in successfully`,
          ipAddress: '127.0.0.1',
        },
      });
    } catch (e) {
      console.warn('[AuditLog] Failed to record login audit:', e.message);
    }

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        employeeId: user.employeeId,
        groups: groupNames,
        permissions: Array.from(permissionSet),
      },
      company: defaultCompany || null,
    };
  }
}
