import { Controller, Post, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisterDto, LoginDto, ChangePasswordDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // 10 attempts per minute — brute-force protection
  @Post('register')
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body.name, body.email, body.password);
  }

  @Post('login')
  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  // Profile and password change — authenticated, normal rate
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @Throttle({ auth: { ttl: 60_000, limit: 5 } })
  changePassword(@Body() body: ChangePasswordDto, @CurrentUser() user: any) {
    return this.authService.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    );
  }
}
