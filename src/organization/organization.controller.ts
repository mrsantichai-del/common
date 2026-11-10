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
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('organization')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  // 1. Org Chart Hierarchy
  @Get('chart')
  getOrgChart(@Query('companyId') companyId?: string) {
    return this.orgService.getOrgChart(companyId);
  }

  // 2. OrgUnits (สาขา/ฝ่าย/แผนก)
  @Get('units')
  findAllUnits(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.orgService.findAllUnits({ search, type, companyId });
  }

  @Get('units/:id')
  findOneUnit(@Param('id') id: string) {
    return this.orgService.findOneUnit(id);
  }

  @Post('units')
  createUnit(@Body() body: any, @Req() req: any) {
    return this.orgService.createUnit(body, req.user?.id);
  }

  @Patch('units/:id')
  updateUnit(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.orgService.updateUnit(id, body, req.user?.id);
  }

  @Delete('units/:id')
  deleteUnit(@Param('id') id: string, @Req() req: any) {
    return this.orgService.deleteUnit(id, req.user?.id);
  }

  // 3. Job Descriptions (JD)
  @Get('jobs')
  findAllJobs(@Query('search') search?: string, @Query('level') level?: number) {
    return this.orgService.findAllJobs({ search, level });
  }

  @Get('jobs/:id')
  findOneJob(@Param('id') id: string) {
    return this.orgService.findOneJob(id);
  }

  @Post('jobs')
  createJob(@Body() body: any, @Req() req: any) {
    return this.orgService.createJob(body, req.user?.id);
  }

  @Patch('jobs/:id')
  updateJob(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.orgService.updateJob(id, body, req.user?.id);
  }

  @Delete('jobs/:id')
  deleteJob(@Param('id') id: string, @Req() req: any) {
    return this.orgService.deleteJob(id, req.user?.id);
  }

  // 4. Positions (ตำแหน่งงาน)
  @Get('positions')
  findAllPositions(
    @Query('search') search?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('jobId') jobId?: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.orgService.findAllPositions({ search, orgUnitId, jobId, companyId });
  }

  @Get('positions/:id')
  findOnePosition(@Param('id') id: string) {
    return this.orgService.findOnePosition(id);
  }

  @Post('positions')
  createPosition(@Body() body: any, @Req() req: any) {
    return this.orgService.createPosition(body, req.user?.id);
  }

  @Patch('positions/:id')
  updatePosition(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.orgService.updatePosition(id, body, req.user?.id);
  }

  @Delete('positions/:id')
  deletePosition(@Param('id') id: string, @Req() req: any) {
    return this.orgService.deletePosition(id, req.user?.id);
  }
}
