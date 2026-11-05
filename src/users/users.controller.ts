import { Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AppPermission } from '../auth/constants/permissions';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return {
      message: 'Access granted: Identity Profile verified',
      user,
    };
  }

  @Get('reports')
  @RequirePermissions(AppPermission.REPORTS_VIEW)
  viewReports(@CurrentUser() user: any) {
    return {
      message: 'Access granted: Analytics & Reports Dashboard',
      permissionUsed: AppPermission.REPORTS_VIEW,
      data: {
        activeNodes: 14,
        totalThroughput: '1.2 GB/s',
        systemLoad: '12%',
      },
    };
  }

  @Get('reports/export')
  @RequirePermissions(AppPermission.REPORTS_EXPORT)
  exportReports(@CurrentUser() user: any) {
    return {
      message: 'Access granted: Data exported successfully as CSV/PDF stream',
      permissionUsed: AppPermission.REPORTS_EXPORT,
      exportedAt: new Date().toISOString(),
    };
  }

  @Get('audit-log')
  @RequirePermissions(AppPermission.USERS_READ)
  getAuditLog(@CurrentUser() user: any) {
    return {
      message: 'Access granted: Audit Security Ledger accessed',
      permissionUsed: AppPermission.USERS_READ,
      userCount: 2,
    };
  }

  @Post('create-subaccount')
  @RequirePermissions(AppPermission.USERS_WRITE)
  createSubaccount(@CurrentUser() user: any) {
    return {
      message: 'Access granted: User Provisioning action executed',
      permissionUsed: AppPermission.USERS_WRITE,
      operator: user.username,
    };
  }

  @Delete('purge-account')
  @RequirePermissions(AppPermission.USERS_DELETE)
  purgeAccount(@CurrentUser() user: any) {
    return {
      message: 'Access granted: High-impact User Purge action executed',
      permissionUsed: AppPermission.USERS_DELETE,
      operator: user.username,
    };
  }

  @Post('system/config')
  @RequirePermissions(AppPermission.SYSTEM_CONFIGURE)
  configureSystem(@CurrentUser() user: any) {
    return {
      message: 'Access granted: Core System Kernel Configuration modified',
      permissionUsed: AppPermission.SYSTEM_CONFIGURE,
      operator: user.username,
    };
  }

  @Get('all')
  @RequirePermissions(AppPermission.USERS_READ)
  getAllUsers() {
    return this.usersService.findAll();
  }
}
