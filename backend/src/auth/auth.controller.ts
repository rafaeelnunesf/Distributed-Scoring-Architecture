import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { clearAuthCookies, setAccessCookie, setAuthCookies } from './cookie.helper';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from './interfaces/jwt-payload.interface';

type AuthenticatedRequest = Request & { user: JwtPayload };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ email: string }> {
    const tokens = await this.authService.register(dto);
    setAuthCookies(res, tokens.access_token, tokens.refresh_token);
    return { email: dto.email.toLowerCase() };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ email: string }> {
    const tokens = await this.authService.login(dto);
    setAuthCookies(res, tokens.access_token, tokens.refresh_token);
    return { email: dto.email.toLowerCase() };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: 'Access token refreshed' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: boolean }> {
    const refreshToken =
      dto.refresh_token ?? (req.cookies?.refresh_token as string | undefined);
    if (!refreshToken) {
      return { ok: false };
    }
    const { access_token } = await this.authService.refresh(refreshToken);
    setAccessCookie(res, access_token);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user' })
  async me(@Req() req: AuthenticatedRequest): Promise<{ email: string }> {
    return this.authService.getMe(req.user.sub);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and clear cookies' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  logout(@Res({ passthrough: true }) res: Response): void {
    clearAuthCookies(res);
  }
}
