import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupsGuard } from '../auth/guards/groups.guard';
import { RequireGroups } from '../auth/decorators/groups.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignUserGroupsDto } from './dto/assign-user-groups.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, GroupsGuard)
@RequireGroups('SUPER_ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // 1. Group Endpoints
  @Get('groups')
  getGroups() {
    return this.adminService.findAllGroups();
  }

  @Post('groups')
  createGroup(@Body() dto: CreateGroupDto) {
    return this.adminService.createGroup(dto);
  }

  @Patch('groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.adminService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string) {
    return this.adminService.deleteGroup(id);
  }

  // 2. Permission Endpoints
  @Get('permissions')
  getPermissions() {
    return this.adminService.findAllPermissions();
  }

  @Post('permissions')
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.adminService.createPermission(dto);
  }

  // 3. User Directory Endpoints
  @Get('users')
  getUsers() {
    return this.adminService.findAllUsers();
  }

  @Patch('users/:id/groups')
  assignUserGroups(@Param('id') id: string, @Body() dto: AssignUserGroupsDto) {
    return this.adminService.assignUserGroups(id, dto.groups);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
