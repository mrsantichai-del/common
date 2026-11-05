import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Group Operations
  async findAllGroups() {
    return this.prisma.group.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createGroup(dto: CreateGroupDto) {
    const existing = await this.prisma.group.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Group with name '${dto.name}' already exists`);
    }

    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });

    if (dto.permissions && dto.permissions.length > 0) {
      const perms = await this.prisma.permission.findMany({
        where: { code: { in: dto.permissions } },
      });

      for (const p of perms) {
        await this.prisma.groupPermission.create({
          data: { groupId: group.id, permissionId: p.id },
        });
      }
    }

    return this.findGroupById(group.id);
  }

  async updateGroup(id: string, dto: UpdateGroupDto) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (dto.description !== undefined) {
      await this.prisma.group.update({
        where: { id },
        data: { description: dto.description },
      });
    }

    if (dto.permissions !== undefined) {
      // Clear old permissions and assign new set
      await this.prisma.groupPermission.deleteMany({
        where: { groupId: id },
      });

      const perms = await this.prisma.permission.findMany({
        where: { code: { in: dto.permissions } },
      });

      for (const p of perms) {
        await this.prisma.groupPermission.create({
          data: { groupId: id, permissionId: p.id },
        });
      }
    }

    return this.findGroupById(id);
  }

  async deleteGroup(id: string) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    if (group.name === 'SUPER_ADMIN') {
      throw new ConflictException('SUPER_ADMIN core group cannot be deleted');
    }
    await this.prisma.group.delete({ where: { id } });
    return { message: `Group '${group.name}' successfully deleted` };
  }

  private async findGroupById(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  // 2. Permission Operations
  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async createPermission(dto: CreatePermissionDto) {
    const existing = await this.prisma.permission.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Permission '${dto.code}' already exists`);
    }

    return this.prisma.permission.create({
      data: {
        code: dto.code,
        description: dto.description,
      },
    });
  }

  // 3. User Directory & Group Assignment Operations
  async findAllUsers() {
    const users = await this.prisma.user.findMany({
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
      orderBy: { username: 'asc' },
    });

    return users.map((u) => {
      const perms = new Set<string>();
      u.groups.forEach((g) => {
        g.group.permissions.forEach((gp) => {
          perms.add(gp.permission.code);
        });
      });

      return {
        id: u.id,
        username: u.username,
        groups: u.groups.map((g) => g.group.name),
        permissions: Array.from(perms),
        createdAt: u.createdAt,
      };
    });
  }

  async assignUserGroups(userId: string, groupNames: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.userGroup.deleteMany({ where: { userId } });

    const groups = await this.prisma.group.findMany({
      where: { name: { in: groupNames } },
    });

    for (const g of groups) {
      await this.prisma.userGroup.create({
        data: {
          userId,
          groupId: g.id,
        },
      });
    }

    return {
      message: `User '${user.username}' successfully assigned to groups: [${groupNames.join(', ')}]`,
      assignedGroups: groups.map((g) => g.name),
    };
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.username === 'root_admin') {
      throw new ConflictException('Protected root_admin identity cannot be deleted');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { message: `User '${user.username}' purged from directory` };
  }
}
