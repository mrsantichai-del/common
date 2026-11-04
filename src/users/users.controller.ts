import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return {
      message: 'Access granted to User Profile',
      user,
    };
  }

  @Get('admin-panel')
  @Roles(Role.ADMIN)
  getAdminPanel(@CurrentUser() user: any) {
    return {
      message: 'Access granted: Welcome to Admin Command Center',
      user,
    };
  }

  @Get('all')
  @Roles(Role.ADMIN)
  getAllUsers() {
    return this.usersService.findAll();
  }
}
