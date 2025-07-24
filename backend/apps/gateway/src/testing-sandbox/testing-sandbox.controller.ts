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
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/interfaces';
import { TestingSandboxService } from './testing-sandbox.service';
import {
  CreateSandboxDto,
  UpdateSandboxDto,
  ExecuteTestDto,
  CreateTestScenarioDto,
  UpdateTestScenarioDto,
  RunIntegrationTestDto,
  CreateMockDataDto,
  SandboxResponseDto,
  TestScenarioResponseDto,
  TestExecutionResponseDto,
  IntegrationTestResponseDto,
  MockDataResponseDto,
  PerformanceTestDto,
  DebugSessionDto,
  CollaborativeTestDto,
} from './dto';
import { plainToClass } from 'class-transformer';

@ApiTags('testing-sandbox')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('testing-sandbox')
export class TestingSandboxController {
  constructor(private readonly testingSandboxService: TestingSandboxService) {}

  // Sandbox Management
  @Post()
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new testing sandbox' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Sandbox created successfully',
    type: SandboxResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createSandbox(
    @Body() createSandboxDto: CreateSandboxDto,
    @Request() req: any,
  ): Promise<SandboxResponseDto> {
    const sandbox = await this.testingSandboxService.createSandbox(
      createSandboxDto,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(SandboxResponseDto, sandbox, {
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
  @ApiOperation({ summary: 'Get all sandboxes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sandboxes retrieved successfully',
    type: [SandboxResponseDto],
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by sandbox type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  async findAllSandboxes(
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ): Promise<SandboxResponseDto[]> {
    const sandboxes = await this.testingSandboxService.findAllSandboxes(
      req.user.organizationId,
      { userId, type, status },
    );
    return sandboxes.map((sandbox) =>
      plainToClass(SandboxResponseDto, sandbox, {
        excludeExtraneousValues: true,
      }),
    );
  }

  @Get(':id')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get sandbox by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sandbox retrieved successfully',
    type: SandboxResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  async findOneSandbox(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<SandboxResponseDto> {
    const sandbox = await this.testingSandboxService.findOneSandbox(
      id,
      req.user.organizationId,
    );
    return plainToClass(SandboxResponseDto, sandbox, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update sandbox' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sandbox updated successfully',
    type: SandboxResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateSandbox(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSandboxDto: UpdateSandboxDto,
    @Request() req: any,
  ): Promise<SandboxResponseDto> {
    const sandbox = await this.testingSandboxService.updateSandbox(
      id,
      updateSandboxDto,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(SandboxResponseDto, sandbox, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete sandbox' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Sandbox deleted successfully',
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  async removeSandbox(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<void> {
    await this.testingSandboxService.removeSandbox(
      id,
      req.user.sub,
      req.user.organizationId,
    );
  }

  // Test Execution
  @Post(':id/execute')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Execute test in sandbox' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test executed successfully',
    type: TestExecutionResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async executeTest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() executeTestDto: ExecuteTestDto,
    @Request() req: any,
  ): Promise<TestExecutionResponseDto> {
    const result = await this.testingSandboxService.executeTest(
      id,
      executeTestDto,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(TestExecutionResponseDto, result, {
      excludeExtraneousValues: true,
    });
  }

  @Sse(':id/execute/stream')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Execute test with streaming response' })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  executeTestStream(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('testId') testId: string,
    @Request() req: any,
  ): Observable<MessageEvent> {
    return this.testingSandboxService.executeTestStream(
      id,
      testId,
      req.user.sub,
      req.user.organizationId,
    );
  }

  // Test Scenarios
  @Post(':id/scenarios')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create test scenario' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Test scenario created successfully',
    type: TestScenarioResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createTestScenario(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createTestScenarioDto: CreateTestScenarioDto,
    @Request() req: any,
  ): Promise<TestScenarioResponseDto> {
    const scenario = await this.testingSandboxService.createTestScenario(
      id,
      createTestScenarioDto,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(TestScenarioResponseDto, scenario, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id/scenarios')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get test scenarios for sandbox' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test scenarios retrieved successfully',
    type: [TestScenarioResponseDto],
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  async getTestScenarios(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<TestScenarioResponseDto[]> {
    const scenarios = await this.testingSandboxService.getTestScenarios(
      id,
      req.user.organizationId,
    );
    return scenarios.map((scenario) =>
      plainToClass(TestScenarioResponseDto, scenario, {
        excludeExtraneousValues: true,
      }),
    );
  }

  @Patch(':id/scenarios/:scenarioId')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update test scenario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test scenario updated successfully',
    type: TestScenarioResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @ApiParam({ name: 'scenarioId', description: 'Test scenario ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateTestScenario(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('scenarioId', ParseUUIDPipe) scenarioId: string,
    @Body() updateTestScenarioDto: UpdateTestScenarioDto,
    @Request() req: any,
  ): Promise<TestScenarioResponseDto> {
    const scenario = await this.testingSandboxService.updateTestScenario(
      id,
      scenarioId,
      updateTestScenarioDto,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(TestScenarioResponseDto, scenario, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id/scenarios/:scenarioId')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete test scenario' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Test scenario deleted successfully',
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @ApiParam({ name: 'scenarioId', description: 'Test scenario ID' })
  async removeTestScenario(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('scenarioId', ParseUUIDPipe) scenarioId: string,
    @Request() req: any,
  ): Promise<void> {
    await this.testingSandboxService.removeTestScenario(
      id,
      scenarioId,
      req.user.sub,
      req.user.organizationId,
    );
  }

  // Integration Testing
  @Post(':id/integration-test')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Run integration test' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Integration test completed',
    type: IntegrationTestResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async runIntegrationTest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() runIntegrationTestDto: RunIntegrationTestDto,
    @Request() req: any,
  ): Promise<IntegrationTestResponseDto> {
    const result = await this.testingSandboxService.runIntegrationTest(
      id,
      runIntegrationTestDto,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(IntegrationTestResponseDto, result, {
      excludeExtraneousValues: true,
    });
  }

  // Performance Testing
  @Post(':id/performance-test')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Run performance test' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance test completed',
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async runPerformanceTest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() performanceTestDto: PerformanceTestDto,
    @Request() req: any,
  ) {
    return this.testingSandboxService.runPerformanceTest(
      id,
      performanceTestDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  // Mock Data Management
  @Post(':id/mock-data')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create mock data' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Mock data created successfully',
    type: MockDataResponseDto,
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createMockData(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createMockDataDto: CreateMockDataDto,
    @Request() req: any,
  ): Promise<MockDataResponseDto> {
    const mockData = await this.testingSandboxService.createMockData(
      id,
      createMockDataDto,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(MockDataResponseDto, mockData, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id/mock-data')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get mock data for sandbox' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mock data retrieved successfully',
    type: [MockDataResponseDto],
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  async getMockData(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<MockDataResponseDto[]> {
    const mockData = await this.testingSandboxService.getMockData(
      id,
      req.user.organizationId,
    );
    return mockData.map((data) =>
      plainToClass(MockDataResponseDto, data, {
        excludeExtraneousValues: true,
      }),
    );
  }

  // Debug Sessions
  @Post(':id/debug-session')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Start debug session' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Debug session started successfully',
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async startDebugSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() debugSessionDto: DebugSessionDto,
    @Request() req: any,
  ) {
    return this.testingSandboxService.startDebugSession(
      id,
      debugSessionDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  @Get(':id/debug-session/:sessionId')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get debug session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Debug session retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @ApiParam({ name: 'sessionId', description: 'Debug session ID' })
  async getDebugSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Request() req: any,
  ) {
    return this.testingSandboxService.getDebugSession(
      id,
      sessionId,
      req.user.organizationId,
    );
  }

  // Collaborative Testing
  @Post(':id/collaborative-test')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Start collaborative test session' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Collaborative test session started successfully',
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async startCollaborativeTest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() collaborativeTestDto: CollaborativeTestDto,
    @Request() req: any,
  ) {
    return this.testingSandboxService.startCollaborativeTest(
      id,
      collaborativeTestDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  // Analytics and Reporting
  @Get(':id/analytics')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get sandbox analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date for analytics',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date for analytics',
  })
  async getAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
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

    return this.testingSandboxService.getAnalytics(
      id,
      req.user.organizationId,
      timeRange,
    );
  }

  // Resource Management
  @Get(':id/resources')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get sandbox resource usage' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resource usage retrieved successfully',
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  async getResourceUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.testingSandboxService.getResourceUsage(
      id,
      req.user.organizationId,
    );
  }

  @Post(':id/cleanup')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cleanup sandbox resources' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sandbox cleaned up successfully',
  })
  @ApiParam({ name: 'id', description: 'Sandbox ID' })
  async cleanupSandbox(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.testingSandboxService.cleanupSandbox(
      id,
      req.user.sub,
      req.user.organizationId,
    );
  }
}
