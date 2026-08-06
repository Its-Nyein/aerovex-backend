import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginResponseDto } from '../dtos/login-response.dto';
import { LoginDto } from '../dtos/login.dto';
import { RefreshResponseDto } from '../dtos/refresh-response.dto';
import { LogoutResponseDto } from '../dtos/logout-response.dto';

// Create a custom interface that extends Request with properly typed cookies
interface RequestWithCookies extends Request {
  cookies: {
    refresh_token?: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description:
      'Login to the system, sets access and refresh tokens in http only cookies',
  })
  @ApiResponse({
    status: 200,
    type: LoginResponseDto,
    description: 'Login successful',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiBody({ type: LoginDto })
  @ApiParam({ example: 'test@test.com', name: 'email' })
  @ApiParam({ example: 'password', name: 'password' })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    return await this.authService.login(body.email, body.password, res);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Use refresh token to refresh access token',
  })
  @ApiResponse({
    status: 200,
    type: RefreshResponseDto,
    description: 'Access token refreshed',
  })
  @ApiResponse({ status: 401, description: 'No refresh token found' })
  async refresh(
    @Req() req: RequestWithCookies,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponseDto> {
    const refreshToken = req?.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token found');
    }

    return await this.authService.refresh(refreshToken, res);
  }

  @Post('logout')
  @ApiOperation({
    summary: 'Logout',
    description: 'Logout from the system',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  logout(@Res({ passthrough: true }) res: Response): LogoutResponseDto {
    return this.authService.logout(res);
  }
}
