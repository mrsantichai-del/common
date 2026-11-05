import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: {
        groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      groups: u.groups.map((g) => g.group.name),
      createdAt: u.createdAt,
    }));
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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
      throw new NotFoundException('User not found');
    }

    const groupNames = user.groups.map((ug) => ug.group.name);
    const permissions = new Set<string>();
    user.groups.forEach((ug) => {
      ug.group.permissions.forEach((gp) => {
        permissions.add(gp.permission.code);
      });
    });

    return {
      id: user.id,
      username: user.username,
      groups: groupNames,
      permissions: Array.from(permissions),
      createdAt: user.createdAt,
    };
  }
}
