import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Put,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
  Res,
  Query,
  Param,
  NotFoundException,
  ForbiddenException,
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
import { UserService } from './user.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  RegisterDto,
  LoginDto,
  InviteUserDto,
  ActivateUserDto,
  DeactivateUserDto,
  BulkUserActionDto,
} from './dto';
import { IApiResponse, IUser, IPaginatedResponse } from '@shared/interfaces';
import {
  Public,
  RequireOrgAdmin,
  RequireDeveloper,
} from '@shared/decorators/roles.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

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

  @RequireOrgAdmin()
  @Post('users/invite')
  @ApiOperation({ summary: 'Invite a new user to the organization' })
  @ApiResponse({
    status: 201,
    description: 'User invitation sent successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async inviteUser(
    @Body() inviteUserDto: InviteUserDto,
    @Request() req,
  ): Promise<IApiResponse> {
    const result = await this.authService.inviteUser(
      inviteUserDto,
      req.user.organizationId,
      req.user.id,
    );
    return {
      success: true,
      data: result,
      message: 'User invitation sent successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @RequireOrgAdmin()
  @Post('users/activate')
  @ApiOperation({ summary: 'Activate a user account' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activateUser(
    @Body() activateUserDto: ActivateUserDto,
    @Request() req,
  ): Promise<IApiResponse> {
    await this.userService.activate(activateUserDto.userId);
    return {
      success: true,
      message: 'User activated successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @RequireOrgAdmin()
  @Post('users/deactivate')
  @ApiOperation({ summary: 'Deactivate a user account' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivateUser(
    @Body() deactivateUserDto: DeactivateUserDto,
    @Request() req,
  ): Promise<IApiResponse> {
    await this.userService.deactivate(deactivateUserDto.userId);
    return {
      success: true,
      message: 'User deactivated successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @RequireOrgAdmin()
  @Post('users/bulk-action')
  @ApiOperation({ summary: 'Perform bulk actions on multiple users' })
  @ApiResponse({
    status: 200,
    description: 'Bulk action completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async bulkUserAction(
    @Body() bulkActionDto: BulkUserActionDto,
    @Request() req,
  ): Promise<IApiResponse> {
    const result = await this.userService.bulkAction(
      bulkActionDto.userIds,
      bulkActionDto.action,
      req.user.organizationId,
      bulkActionDto.reason,
    );
    return {
      success: true,
      data: result,
      message: `Bulk ${bulkActionDto.action} completed successfully`,
      timestamp: new Date().toISOString(),
    };
  }

  @RequireDeveloper()
  @Get('users')
  @ApiOperation({
    summary: 'Get users in organization with search and filtering',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getUsers(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: boolean,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<IPaginatedResponse<IUser>> {
    const result = await this.userService.findByOrganization(
      req.user.organizationId,
      {
        page: page || 1,
        limit: limit || 10,
        search,
        role: role as any,
        isActive,
        sortBy,
        sortOrder,
        requestingUserId: req.user.id,
        requestingUserRole: req.user.role,
      },
    );

    const totalPages = Math.ceil(result.total / (limit || 10));

    return {
      success: true,
      data: result.users,
      pagination: {
        page: page || 1,
        limit: limit || 10,
        total: result.total,
        totalPages,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @RequireOrgAdmin()
  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(
    @Param('id') id: string,
    @Request() req,
  ): Promise<IApiResponse<IUser>> {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user belongs to same organization
    if (user.organizationId !== req.user.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    return {
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    };
  }

  @RequireOrgAdmin()
  @Put('users/:id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req,
  ): Promise<IApiResponse<IUser>> {
    const updatedUser = await this.userService.update(
      id,
      updateData,
      req.user.id,
      req.user.role,
    );

    return {
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
