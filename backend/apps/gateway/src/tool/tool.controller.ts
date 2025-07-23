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
  import { ToolService } from './tool.service';
  import { ToolExecutionEngine } from './tool-execution.engine';
  import {
    CreateToolDto,
    UpdateToolDto,
    ExecuteToolDto,
    TestToolDto,
  } from './dto';
  
  @ApiTags('tools')
  @Controller('tools')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class ToolController {
    constructor(
      private readonly toolService: ToolService,
      private readonly toolExecutionEngine: ToolExecutionEngine,
    ) {}
  
    @Post()
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Create a new tool' })
    @ApiResponse({ status: 201, description: 'Tool created successfully' })
    async create(@Body(ValidationPipe) createToolDto: CreateToolDto) {
      return this.toolService.create(createToolDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'List all tools' })
    @ApiResponse({ status: 200, description: 'Tools retrieved successfully' })
    async findAll(
      @Query('page') page: number = 1,
      @Query('limit') limit: number = 20,
      @Query('search') search?: string,
      @Query('category') category?: string,
      @Query('isActive') isActive?: boolean,
    ) {
      return this.toolService.findAll({
        page,
        limit,
        search,
        category,
        isActive,
      });
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get tool by ID' })
    @ApiResponse({ status: 200, description: 'Tool retrieved successfully' })
    async findOne(@Param('id') id: string) {
      return this.toolService.findOne(id);
    }
  
    @Put(':id')
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Update tool' })
    @ApiResponse({ status: 200, description: 'Tool updated successfully' })
    async update(
      @Param('id') id: string,
      @Body(ValidationPipe) updateToolDto: UpdateToolDto,
    ) {
      return this.toolService.update(id, updateToolDto);
    }
  
    @Delete(':id')
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Delete tool' })
    @ApiResponse({ status: 200, description: 'Tool deleted successfully' })
    async remove(@Param('id') id: string) {
      return this.toolService.remove(id);
    }
  
    @Post(':id/execute')
    @ApiOperation({ summary: 'Execute tool' })
    @ApiResponse({ status: 200, description: 'Tool executed successfully' })
    async execute(
      @Param('id') id: string,
      @Body(ValidationPipe) executeToolDto: ExecuteToolDto,
    ) {
      return this.toolExecutionEngine.execute(id, executeToolDto);
    }
  
    @Post(':id/test')
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Test tool' })
    @ApiResponse({ status: 200, description: 'Tool tested successfully' })
    async test(
      @Param('id') id: string,
      @Body(ValidationPipe) testToolDto: TestToolDto,
    ) {
      return this.toolService.test(id, testToolDto);
    }
  
    @Get(':id/executions')
    @ApiOperation({ summary: 'Get tool execution history' })
    @ApiResponse({ status: 200, description: 'Executions retrieved successfully' })
    async getExecutions(
      @Param('id') id: string,
      @Query('page') page: number = 1,
      @Query('limit') limit: number = 20,
      @Query('status') status?: string,
    ) {
      return this.toolService.getExecutions(id, { page, limit, status });
    }
  
    @Get(':id/analytics')
    @ApiOperation({ summary: 'Get tool analytics' })
    @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
    async getAnalytics(
      @Param('id') id: string,
      @Query('startDate') startDate?: string,
      @Query('endDate') endDate?: string,
    ) {
      return this.toolService.getAnalytics(id, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
    }
  
    @Post('/validate-schema')
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Validate tool schema' })
    @ApiResponse({ status: 200, description: 'Schema validated successfully' })
    async validateSchema(@Body() schema: any) {
      return this.toolService.validateSchema(schema);
    }
  
    @Get('/categories')
    @ApiOperation({ summary: 'Get tool categories' })
    @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
    async getCategories() {
      return this.toolService.getCategories();
    }
  
    @Get('/search')
    @ApiOperation({ summary: 'Search tools' })
    @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
    async search(
      @Query('q') query: string,
      @Query('category') category?: string,
      @Query('tags') tags?: string,
      @Query('limit') limit: number = 20,
    ) {
      return this.toolService.search(query, {
        category,
        tags: tags ? tags.split(',') : undefined,
        limit,
      });
    }
  }
  