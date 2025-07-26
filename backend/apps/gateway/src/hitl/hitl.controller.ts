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
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/enums';
import { HITLService } from './hitl.service';
import {
  CreateHITLRequestDto,
  UpdateHITLRequestDto,
  ResolveHITLRequestDto,
  AssignHITLRequestDto,
  DelegateHITLRequestDto,
  EscalateHITLRequestDto,
  VoteHITLRequestDto,
  CommentHITLRequestDto,
  HITLAnalyticsQueryDto,
} from './dto';

@ApiTags('HITL')
@ApiBearerAuth()
@Controller('hitl')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HITLController {
  constructor(private readonly hitlService: HITLService) {}

  @Post('requests')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new HITL request' })
  @ApiResponse({
    status: 201,
    description: 'HITL request created successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async createRequest(@Body() createDto: CreateHITLRequestDto, @Request() req: any) {
    const request = await this.hitlService.createRequest(
      createDto,
      req.user.id,
      req.user.organizationId
    );

    return {
      success: true,
      data: request,
      message: 'HITL request created successfully',
    };
  }

  @Get('requests')
  @Roles(UserRole.VIEWER, UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get HITL requests' })
  @ApiResponse({
    status: 200,
    description: 'HITL requests retrieved successfully',
  })
  async getRequests(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToMe') assignedToMe?: boolean,
    @Query('createdByMe') createdByMe?: boolean,
    @Query('sourceType') sourceType?: 'agent' | 'tool' | 'workflow',
    @Query('category') category?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC'
  ) {
    const result = await this.hitlService.getRequests(req.user.organizationId, req.user.id, {
      page: page ? parseInt(page.toString()) : 1,
      limit: limit ? parseInt(limit.toString()) : 50,
      status: status as any,
      priority: priority as any,
      assignedToMe,
      createdByMe,
      sourceType,
      category,
      sortBy,
      sortOrder,
    });

    return {
      success: true,
      data: result.requests,
      pagination: result.pagination,
      total: result.total,
    };
  }

  @Get('requests/:id')
  @Roles(UserRole.VIEWER, UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get HITL request by ID' })
  @ApiResponse({
    status: 200,
    description: 'HITL request retrieved successfully',
  })
  async getRequestById(@Param('id') id: string, @Request() req: any) {
    const request = await this.hitlService.getRequestById(id, req.user.organizationId, req.user.id);

    return {
      success: true,
      data: request,
    };
  }

  @Put('requests/:id')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update HITL request' })
  @ApiResponse({
    status: 200,
    description: 'HITL request updated successfully',
  })
  async updateRequest(
    @Param('id') id: string,
    @Body() updateDto: UpdateHITLRequestDto,
    @Request() req: any
  ) {
    const request = await this.hitlService.updateRequest(
      id,
      updateDto,
      req.user.id,
      req.user.organizationId
    );

    return {
      success: true,
      data: request,
      message: 'HITL request updated successfully',
    };
  }

  @Post('requests/:id/resolve')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Resolve HITL request' })
  @ApiResponse({
    status: 200,
    description: 'HITL request resolved successfully',
  })
  async resolveRequest(
    @Param('id') id: string,
    @Body() resolveDto: ResolveHITLRequestDto,
    @Request() req: any
  ) {
    const request = await this.hitlService.resolveRequest(
      id,
      resolveDto,
      req.user.id,
      req.user.organizationId
    );

    return {
      success: true,
      data: request,
      message: `HITL request ${resolveDto.approved ? 'approved' : 'rejected'} successfully`,
    };
  }

  @Post('requests/:id/assign')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Assign HITL request' })
  @ApiResponse({
    status: 200,
    description: 'HITL request assigned successfully',
  })
  async assignRequest(
    @Param('id') id: string,
    @Body() assignDto: AssignHITLRequestDto,
    @Request() req: any
  ) {
    const request = await this.hitlService.assignRequest(
      id,
      assignDto,
      req.user.id,
      req.user.organizationId
    );

    return {
      success: true,
      data: request,
      message: 'HITL request assigned successfully',
    };
  }

  @Post('requests/:id/delegate')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delegate HITL request' })
  @ApiResponse({
    status: 200,
    description: 'HITL request delegated successfully',
  })
  async delegateRequest(
    @Param('id') id: string,
    @Body() delegateDto: DelegateHITLRequestDto,
    @Request() req: any
  ) {
    const request = await this.hitlService.delegateRequest(
      id,
      delegateDto,
      req.user.id,
      req.user.organizationId
    );

    return {
      success: true,
      data: request,
      message: 'HITL request delegated successfully',
    };
  }

  @Post('requests/:id/escalate')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Escalate HITL request' })
  @ApiResponse({
    status: 200,
    description: 'HITL request escalated successfully',
  })
  async escalateRequest(
    @Param('id') id: string,
    @Body() escalateDto: EscalateHITLRequestDto,
    @Request() req: any
  ) {
    const request = await this.hitlService.escalateRequest(
      id,
      escalateDto,
      req.user.id,
      req.user.organizationId
    );

    return {
      success: true,
      data: request,
      message: 'HITL request escalated successfully',
    };
  }

  @Post('requests/:id/vote')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cast vote on HITL request' })
  @ApiResponse({ status: 200, description: 'Vote cast successfully' })
  async castVote(
    @Param('id') id: string,
    @Body() voteDto: VoteHITLRequestDto,
    @Request() req: any
  ) {
    const vote = await this.hitlService.castVote(id, voteDto, req.user.id, req.user.organizationId);

    return {
      success: true,
      data: vote,
      message: 'Vote cast successfully',
    };
  }

  @Post('requests/:id/comments')
  @Roles(UserRole.VIEWER, UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add comment to HITL request' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id') id: string,
    @Body() commentDto: CommentHITLRequestDto,
    @Request() req: any
  ) {
    const comment = await this.hitlService.addComment(
      id,
      commentDto,
      req.user.id,
      req.user.organizationId
    );

    return {
      success: true,
      data: comment,
      message: 'Comment added successfully',
    };
  }

  @Get('analytics')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get HITL analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(@Query() query: HITLAnalyticsQueryDto, @Request() req: any) {
    const analytics = await this.hitlService.getAnalytics(req.user.organizationId, query);

    return {
      success: true,
      data: analytics,
    };
  }

  @Get('dashboard')
  @Roles(UserRole.VIEWER, UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get HITL dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  async getDashboard(@Request() req: any) {
    const [myRequests, assignedToMe, recentActivity] = await Promise.all([
      this.hitlService.getRequests(req.user.organizationId, req.user.id, {
        createdByMe: true,
        limit: 10,
      }),
      this.hitlService.getRequests(req.user.organizationId, req.user.id, {
        assignedToMe: true,
        limit: 10,
      }),
      this.hitlService.getRequests(req.user.organizationId, req.user.id, {
        limit: 20,
        sortBy: 'updatedAt',
      }),
    ]);

    const analytics = await this.hitlService.getAnalytics(req.user.organizationId, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    });

    return {
      success: true,
      data: {
        myRequests: myRequests.requests,
        assignedToMe: assignedToMe.requests,
        recentActivity: recentActivity.requests,
        analytics: analytics.summary,
        trends: analytics.trends,
      },
    };
  }
}
