import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('groups')
  async getGroups() {
    return this.authService.getAvailableGroups();
  }

  @Get('public-info')
  async getPublicInfo() {
    return this.authService.getPublicCompanyInfo();
  }

  @Get('demo-accounts')
  async getDemoAccounts() {
    return this.authService.getDemoAccounts();
  }

  @Get('menus')
  async getMenus() {
    return this.authService.getSystemMenus();
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
