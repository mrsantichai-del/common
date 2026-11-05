import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
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

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
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
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
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

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        employeeId: user.employeeId,
        groups: groupNames,
        permissions: Array.from(permissionSet),
      },
    };
  }
}
