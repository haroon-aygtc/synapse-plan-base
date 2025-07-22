import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto } from './dto';
import { IApiResponse, IUser } from '@shared/interfaces';
import { Public } from '@shared/decorators/roles.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  async register(@Body() registerDto: RegisterDto): Promise<IApiResponse> {
    const result = await this.authService.register(registerDto);
    return {
      success: true,
      data: result,
      message: 'User registered successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many failed attempts' })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req,
  ): Promise<IApiResponse> {
    const result = await this.authService.login(req.user);
    return {
      success: true,
      data: result,
      message: 'Login successful',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req): Promise<IApiResponse<IUser>> {
    return {
      success: true,
      data: req.user,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'User successfully logged out' })
  async logout(
    @Request() req,
    @Headers('authorization') authHeader?: string,
  ): Promise<IApiResponse> {
    const accessToken = authHeader?.replace('Bearer ', '');
    await this.authService.logout(req.user.id, accessToken);
    return {
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 refresh attempts per minute
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @ApiResponse({ status: 429, description: 'Too many refresh attempts' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Valid refresh token',
        },
      },
      required: ['refreshToken'],
    },
  })
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<IApiResponse> {
    const result = await this.authService.refreshToken(refreshToken);
    return {
      success: true,
      data: result,
      message: 'Token refreshed successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'Get CSRF token' })
  @ApiResponse({ status: 200, description: 'CSRF token retrieved' })
  async getCsrfToken(@Request() req, @Res() res: Response): Promise<void> {
    res.json({
      success: true,
      data: { csrfToken: req.csrfToken() },
      timestamp: new Date().toISOString(),
    });
  }
}
