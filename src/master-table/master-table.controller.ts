import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MasterTableService } from './master-table.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('master-table')
@UseGuards(JwtAuthGuard)
export class MasterTableController {
  constructor(private readonly masterTableService: MasterTableService) {}

  // 1. List / Search / Filter Records
  @Get(':table')
  findAll(
    @Param('table') table: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.masterTableService.findAll(table, {
      search,
      status,
      category,
      page,
      limit,
    });
  }

  // 2. Export Table Data (CSV / JSON)
  @Get(':table/export/file')
  exportData(@Param('table') table: string, @Query('format') format?: 'json' | 'csv') {
    return this.masterTableService.exportData(table, format || 'json');
  }

  // 3. Confirm Document Action
  @Post('documents/:id/confirm')
  confirmDocument(@Param('id') id: string, @Req() req: any) {
    return this.masterTableService.confirmDocument(id, req.user?.id);
  }

  // 4. Cancel Document Action
  @Post('documents/:id/cancel')
  cancelDocument(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.masterTableService.cancelDocument(id, reason, req.user?.id);
  }

  // 5. Bulk Import Data
  @Post(':table/import')
  bulkImport(
    @Param('table') table: string,
    @Body('items') items: any[],
    @Req() req: any,
  ) {
    return this.masterTableService.bulkImport(table, items, req.user?.id);
  }

  // 6. Get Single Record
  @Get(':table/:id')
  findOne(@Param('table') table: string, @Param('id') id: string) {
    return this.masterTableService.findOne(table, id);
  }

  // 7. Create New Record
  @Post(':table')
  create(@Param('table') table: string, @Body() data: any, @Req() req: any) {
    return this.masterTableService.create(table, data, req.user?.id);
  }

  // 8. Update Record
  @Patch(':table/:id')
  update(
    @Param('table') table: string,
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.masterTableService.update(table, id, data, req.user?.id);
  }

  // 9. Delete Record
  @Delete(':table/:id')
  delete(
    @Param('table') table: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.masterTableService.delete(table, id, req.user?.id);
  }
}
