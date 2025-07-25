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
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/enums';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutionEngine } from './workflow-execution.engine';
import { CreateWorkflowDto, UpdateWorkflowDto, ExecuteWorkflowDto, TestWorkflowDto } from './dto';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutionEngine: WorkflowExecutionEngine
  ) {}

  @Post()
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async create(@Body(ValidationPipe) createWorkflowDto: CreateWorkflowDto) {
    return this.workflowService.create(createWorkflowDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all workflows' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean
  ) {
    return this.workflowService.findAll({
      page,
      limit,
      search,
      isActive,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
  async findOne(@Param('id') id: string) {
    return this.workflowService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateWorkflowDto: UpdateWorkflowDto
  ) {
    return this.workflowService.update(id, updateWorkflowDto);
  }

  @Delete(':id')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.workflowService.remove(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute workflow' })
  @ApiResponse({ status: 200, description: 'Workflow executed successfully' })
  async execute(
    @Param('id') id: string,
    @Body(ValidationPipe) executeWorkflowDto: ExecuteWorkflowDto
  ) {
    return this.workflowExecutionEngine.execute(id, executeWorkflowDto);
  }

  @Post(':id/test')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Test workflow' })
  @ApiResponse({ status: 200, description: 'Workflow tested successfully' })
  async test(@Param('id') id: string, @Body(ValidationPipe) testWorkflowDto: TestWorkflowDto) {
    return this.workflowService.test(id, testWorkflowDto);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get workflow execution history' })
  @ApiResponse({ status: 200, description: 'Executions retrieved successfully' })
  async getExecutions(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string
  ) {
    return this.workflowService.getExecutions(id, { page, limit, status });
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get workflow analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.workflowService.getAnalytics(id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Post('/validate')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Validate workflow definition' })
  @ApiResponse({ status: 200, description: 'Workflow validated successfully' })
  async validate(@Body() definition: any) {
    return this.workflowService.validateDefinition(definition);
  }

  @Post(':id/clone')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Clone workflow' })
  @ApiResponse({ status: 201, description: 'Workflow cloned successfully' })
  async clone(@Param('id') id: string, @Body() cloneData: { name: string; description?: string }) {
    return this.workflowService.clone(id, cloneData);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export workflow definition' })
  @ApiResponse({ status: 200, description: 'Workflow exported successfully' })
  async export(@Param('id') id: string) {
    return this.workflowService.export(id);
  }

  @Post('/import')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Import workflow definition' })
  @ApiResponse({ status: 201, description: 'Workflow imported successfully' })
  async import(@Body() importData: any) {
    return this.workflowService.import(importData);
  }

  @Post('/executions/:executionId/cancel')
  @ApiOperation({ summary: 'Cancel workflow execution' })
  @ApiResponse({ status: 200, description: 'Execution cancelled successfully' })
  async cancelExecution(@Param('executionId') executionId: string) {
    return this.workflowExecutionEngine.cancel(executionId);
  }

  @Post('/executions/:executionId/pause')
  @ApiOperation({ summary: 'Pause workflow execution' })
  @ApiResponse({ status: 200, description: 'Execution paused successfully' })
  async pauseExecution(@Param('executionId') executionId: string) {
    return this.workflowExecutionEngine.pause(executionId);
  }

  @Post('/executions/:executionId/resume')
  @ApiOperation({ summary: 'Resume workflow execution' })
  @ApiResponse({ status: 200, description: 'Execution resumed successfully' })
  async resumeExecution(@Param('executionId') executionId: string) {
    return this.workflowExecutionEngine.resume(executionId);
  }
}
