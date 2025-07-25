import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Observable, interval, map } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/interfaces';
import { AgentService } from './agent.service';
import {
  CreateAgentDto,
  UpdateAgentDto,
  AgentResponseDto,
  ExecuteAgentDto,
  TestAgentDto,
  BatchTestAgentDto,
} from './dto';
import { plainToClass } from 'class-transformer';

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post()
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new agent' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Agent created successfully',
    type: AgentResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() createAgentDto: CreateAgentDto,
    @Request() req: any,
  ): Promise<AgentResponseDto> {
    const agent = await this.agentService.create(
      createAgentDto,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(AgentResponseDto, agent, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get all agents' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agents retrieved successfully',
    type: [AgentResponseDto],
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive agents',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limit results',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Offset results',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by category',
  })
  @ApiQuery({
    name: 'model',
    required: false,
    description: 'Filter by AI model',
  })
  async findAll(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('includeInactive') includeInactive?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('model') model?: string,
  ): Promise<AgentResponseDto[]> {
    const agents = await this.agentService.findAll(req.user.organizationId, {
      userId,
      includeInactive,
      limit,
      offset,
      search,
      category,
      model,
    });
    return agents.map((agent) =>
      plainToClass(AgentResponseDto, agent, {
        excludeExtraneousValues: true,
      }),
    );
  }

  @Get('statistics')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get agent statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date for statistics',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date for statistics',
  })
  async getStatistics(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const timeRange =
      from && to
        ? {
            from: new Date(from),
            to: new Date(to),
          }
        : undefined;

    return this.agentService.getStatistics(req.user.organizationId, timeRange);
  }

  @Get(':id')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get agent by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent retrieved successfully',
    type: AgentResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @ApiQuery({
    name: 'includeExecutions',
    required: false,
    type: Boolean,
    description: 'Include recent executions',
  })
  @ApiQuery({
    name: 'includeTestResults',
    required: false,
    type: Boolean,
    description: 'Include test results',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Query('includeExecutions') includeExecutions?: boolean,
    @Query('includeTestResults') includeTestResults?: boolean,
  ): Promise<AgentResponseDto> {
    const agent = await this.agentService.findOne(id, req.user.organizationId, {
      includeExecutions,
      includeTestResults,
    });
    return plainToClass(AgentResponseDto, agent, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update agent' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent updated successfully',
    type: AgentResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAgentDto: UpdateAgentDto,
    @Request() req: any,
  ): Promise<AgentResponseDto> {
    const agent = await this.agentService.update(
      id,
      updateAgentDto,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(AgentResponseDto, agent, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete agent' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Agent deleted successfully',
  })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<void> {
    await this.agentService.remove(id, req.user.sub, req.user.organizationId);
  }

  @Post(':id/execute')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Execute agent' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent executed successfully',
  })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() executeDto: ExecuteAgentDto,
    @Request() req: any,
  ) {
    return this.agentService.execute(
      id,
      executeDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  @Sse(':id/execute/stream')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Execute agent with streaming response' })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  executeStream(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('input') input: string,
    @Query('sessionId') sessionId?: string,
    @Request() req?: any,
  ): Observable<MessageEvent> {
    // This is a simplified streaming implementation
    // In a real implementation, you'd integrate with the actual execution stream
    return interval(1000).pipe(
      map((index) => ({
        data: {
          type: 'progress',
          message: `Processing step ${index + 1}...`,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }

  @Post(':id/test')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Test agent' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent test completed',
  })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async test(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() testDto: TestAgentDto,
    @Request() req: any,
  ) {
    return this.agentService.test(
      id,
      testDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  @Post(':id/test/batch')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Run batch tests on agent' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch test completed',
  })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async batchTest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() batchTestDto: BatchTestAgentDto,
    @Request() req: any,
  ) {
    return this.agentService.batchTest(
      id,
      batchTestDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  @Post(':id/versions')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new version of agent' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Agent version created successfully',
    type: AgentResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { version: string; changes: Record<string, any> },
    @Request() req: any,
  ): Promise<AgentResponseDto> {
    const agent = await this.agentService.createVersion(
      id,
      body.version,
      body.changes,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(AgentResponseDto, agent, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id/versions')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get version history of agent' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Version history retrieved successfully',
    type: [AgentResponseDto],
  })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  async getVersionHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<AgentResponseDto[]> {
    const agents = await this.agentService.getVersionHistory(
      id,
      req.user.organizationId,
    );
    return agents.map((agent) =>
      plainToClass(AgentResponseDto, agent, {
        excludeExtraneousValues: true,
      }),
    );
  }
}
