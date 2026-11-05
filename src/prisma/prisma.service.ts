import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../../prisma/seed';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    const groupCount = await this.group.count();
    if (groupCount === 0) {
      await seedDatabase(this);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
