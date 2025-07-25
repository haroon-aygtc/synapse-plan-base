import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/interfaces';
import { SessionService, CreateSessionDto, UpdateSessionDto } from './session.service';

@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid session data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createSession(@Body() createDto: CreateSessionDto, @Request() req: any) {
    // Ensure user can only create sessions for themselves unless admin
    if (
      createDto.userId !== req.user.sub &&
      !['ORG_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)
    ) {
      createDto.userId = req.user.sub;
    }

    if (!createDto.organizationId) {
      createDto.organizationId = req.user.organizationId;
    }

    return await this.sessionService.createSession(createDto);
  }

  @Get(':sessionToken')
  @ApiOperation({ summary: 'Get session by token' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(@Param('sessionToken') sessionToken: string) {
    return await this.sessionService.getSession(sessionToken);
  }

  @Get('id/:sessionId')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionById(@Param('sessionId') sessionId: string) {
    return await this.sessionService.getSessionById(sessionId);
  }

  @Put(':sessionToken')
  @ApiOperation({ summary: 'Update session' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async updateSession(
    @Param('sessionToken') sessionToken: string,
    @Body() updateDto: UpdateSessionDto
  ) {
    return await this.sessionService.updateSession(sessionToken, updateDto);
  }

  @Put(':sessionToken/extend')
  @ApiOperation({ summary: 'Extend session expiration' })
  @ApiResponse({ status: 200, description: 'Session extended successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async extendSession(@Param('sessionToken') sessionToken: string, @Body() body: { ttl?: number }) {
    return await this.sessionService.extendSession(sessionToken, body.ttl);
  }

  @Delete(':sessionToken')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Destroy session' })
  @ApiResponse({ status: 204, description: 'Session destroyed successfully' })
  async destroySession(@Param('sessionToken') sessionToken: string) {
    await this.sessionService.destroySession(sessionToken);
  }

  @Delete('user/:userId/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Destroy all user sessions' })
  @ApiResponse({ status: 204, description: 'All user sessions destroyed' })
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async destroyUserSessions(@Param('userId') userId: string) {
    await this.sessionService.destroyUserSessions(userId);
  }

  @Get(':sessionToken/context')
  @ApiOperation({ summary: 'Get session context' })
  @ApiResponse({ status: 200, description: 'Session context retrieved' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionContext(@Param('sessionToken') sessionToken: string) {
    return await this.sessionService.getSessionContext(sessionToken);
  }

  @Post(':sessionToken/propagate')
  @ApiOperation({ summary: 'Propagate context update across modules' })
  @ApiResponse({ status: 200, description: 'Context propagated successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async propagateContextUpdate(
    @Param('sessionToken') sessionToken: string,
    @Body()
    body: {
      moduleType: 'agent' | 'tool' | 'workflow' | 'knowledge' | 'hitl';
      contextUpdate: Record<string, any>;
    }
  ) {
    await this.sessionService.propagateContextUpdate(
      sessionToken,
      body.moduleType,
      body.contextUpdate
    );
    return { success: true };
  }

  @Get('recover/:sessionId')
  @ApiOperation({ summary: 'Recover session data' })
  @ApiResponse({ status: 200, description: 'Session recovery data retrieved' })
  @ApiResponse({ status: 404, description: 'Session not recoverable' })
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async recoverSession(@Param('sessionId') sessionId: string) {
    return await this.sessionService.recoverSession(sessionId);
  }

  @Get('analytics/:organizationId')
  @ApiOperation({ summary: 'Get session analytics' })
  @ApiResponse({ status: 200, description: 'Session analytics retrieved' })
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  async getSessionAnalytics(
    @Param('organizationId') organizationId: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const timeRange =
      from && to
        ? {
            from: new Date(from),
            to: new Date(to),
          }
        : undefined;

    return await this.sessionService.getSessionAnalytics(organizationId, timeRange);
  }
}
