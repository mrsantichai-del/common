import { Module } from '@nestjs/common';
import { MasterTableService } from './master-table.service';
import { MasterTableController } from './master-table.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MasterTableController],
  providers: [MasterTableService],
  exports: [MasterTableService],
})
export class MasterTableModule {}
