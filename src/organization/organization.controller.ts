import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import type { Response } from 'express';

const jobDocStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads/jobs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `job-doc-${uniqueSuffix}${ext}`);
  },
});

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

  // 3.1 Job Documents & Revisions (เอกสารฉบับลงนาม & ประวัติเวอร์ชัน ISO 9001)
  @Get('jobs/:id/documents')
  getJobDocuments(@Param('id') id: string) {
    return this.orgService.getJobDocuments(id);
  }

  @Post('jobs/:id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: jobDocStorage,
      limits: { fileSize: 25 * 1024 * 1024 }, // Max 25MB
    }),
  )
  uploadJobDocument(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.orgService.uploadJobDocument(id, file, body, req.user?.id);
  }

  @Get('jobs/documents/:docId/download')
  async downloadJobDocument(
    @Param('docId') docId: string,
    @Query('preview') preview: string,
    @Res() res: Response,
  ) {
    const doc = await this.orgService.getJobDocument(docId);
    const absPath = path.resolve(process.cwd(), doc.filePath);

    if (!fs.existsSync(absPath)) {
      throw new BadRequestException('Document file not found on disk');
    }

    // Set correct headers for inline viewing or attachment download
    const encodedFileName = encodeURIComponent(doc.fileName);
    if (preview === 'true') {
      res.setHeader('Content-Type', doc.mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFileName}`);
      return res.sendFile(absPath);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
      return res.download(absPath, doc.fileName);
    }
  }

  @Delete('jobs/documents/:docId')
  deleteJobDocument(@Param('docId') docId: string, @Req() req: any) {
    return this.orgService.deleteJobDocument(docId, req.user?.id);
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
