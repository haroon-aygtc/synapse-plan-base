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
  HttpException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@libs/shared/guards/roles.guard';
import { WidgetService } from './widget.service';
import {
  CreateWidgetDto,
  UpdateWidgetDto,
  DeployWidgetDto,
  GenerateEmbedCodeDto,
  TestWidgetDto,
  PreviewWidgetDto,
  CloneWidgetDto,
  PublishTemplateDto,
} from './dto';
import { Widget } from '@database/entities/widget.entity';

@ApiTags('widgets')
@Controller('widgets')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WidgetController {
  constructor(private readonly widgetService: WidgetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new widget' })
  @ApiResponse({ status: 201, description: 'Widget created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Source not found' })
  async create(@Body() createWidgetDto: CreateWidgetDto, @Request() req) {
    try {
      const widget = await this.widgetService.create({
        ...createWidgetDto,
        userId: req.user.id,
        organizationId: req.user.organizationId,
      });
      return {
        success: true,
        data: widget,
        message: 'Widget created successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error instanceof Error ? error.message : String(error),
          error: 'WIDGET_CREATION_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all widgets for organization' })
  @ApiResponse({ status: 200, description: 'Widgets retrieved successfully' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('type') type?: 'agent' | 'tool' | 'workflow',
    @Query('isActive') isActive?: boolean,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
    @Request() req,
  ) {
    try {
      const result = await this.widgetService.findAll({
        organizationId: req.user.organizationId,
        page: Number(page),
        limit: Number(limit),
        search,
        type,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        sortBy,
        sortOrder,
      });
      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Widgets retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'WIDGETS_RETRIEVAL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get widget by ID' })
  @ApiResponse({ status: 200, description: 'Widget retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      const widget = await this.widgetService.findOne(
        id,
        req.user.organizationId,
      );
      return {
        success: true,
        data: widget,
        message: 'Widget retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'WIDGET_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update widget' })
  @ApiResponse({ status: 200, description: 'Widget updated successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async update(
    @Param('id') id: string,
    @Body() updateWidgetDto: UpdateWidgetDto,
    @Request() req,
  ) {
    try {
      const widget = await this.widgetService.update(
        id,
        updateWidgetDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: widget,
        message: 'Widget updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'WIDGET_UPDATE_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete widget' })
  @ApiResponse({ status: 200, description: 'Widget deleted successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async remove(@Param('id') id: string, @Request() req) {
    try {
      await this.widgetService.remove(id, req.user.organizationId);
      return {
        success: true,
        message: 'Widget deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'WIDGET_DELETION_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/deploy')
  @ApiOperation({ summary: 'Deploy widget' })
  @ApiResponse({ status: 200, description: 'Widget deployed successfully' })
  @ApiResponse({ status: 404, description: 'Widget not found' })
  async deploy(
    @Param('id') id: string,
    @Body() deployWidgetDto: DeployWidgetDto,
    @Request() req,
  ) {
    try {
      const deployment = await this.widgetService.deploy(
        id,
        deployWidgetDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: deployment,
        message: 'Widget deployed successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'WIDGET_DEPLOYMENT_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/undeploy')
  @ApiOperation({ summary: 'Undeploy widget' })
  @ApiResponse({ status: 200, description: 'Widget undeployed successfully' })
  async undeploy(@Param('id') id: string, @Request() req) {
    try {
      const result = await this.widgetService.undeploy(
        id,
        req.user.organizationId,
      );
      return {
        success: true,
        data: result,
        message: 'Widget undeployed successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'WIDGET_UNDEPLOYMENT_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/deployment')
  @ApiOperation({ summary: 'Get widget deployment info' })
  @ApiResponse({
    status: 200,
    description: 'Deployment info retrieved successfully',
  })
  async getDeployment(@Param('id') id: string, @Request() req) {
    try {
      const deployment = await this.widgetService.getDeployment(
        id,
        req.user.organizationId,
      );
      return {
        success: true,
        data: deployment,
        message: 'Deployment info retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'DEPLOYMENT_INFO_RETRIEVAL_FAILED',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post(':id/embed-code')
  @ApiOperation({ summary: 'Generate embed code' })
  @ApiResponse({
    status: 200,
    description: 'Embed code generated successfully',
  })
  async generateEmbedCode(
    @Param('id') id: string,
    @Body() generateEmbedCodeDto: GenerateEmbedCodeDto,
    @Request() req,
  ) {
    try {
      const embedCode = await this.widgetService.generateEmbedCode(
        id,
        generateEmbedCodeDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: embedCode,
        message: 'Embed code generated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'EMBED_CODE_GENERATION_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test widget' })
  @ApiResponse({
    status: 200,
    description: 'Widget test completed successfully',
  })
  async test(
    @Param('id') id: string,
    @Body() testWidgetDto: TestWidgetDto,
    @Request() req,
  ) {
    try {
      const testResult = await this.widgetService.test(
        id,
        testWidgetDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: testResult,
        message: 'Widget test completed successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'WIDGET_TEST_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Generate widget preview' })
  @ApiResponse({ status: 200, description: 'Preview generated successfully' })
  async preview(
    @Param('id') id: string,
    @Body() previewWidgetDto: PreviewWidgetDto,
    @Request() req,
  ) {
    try {
      const preview = await this.widgetService.preview(
        id,
        previewWidgetDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: preview,
        message: 'Preview generated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'PREVIEW_GENERATION_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone widget' })
  @ApiResponse({ status: 201, description: 'Widget cloned successfully' })
  async clone(
    @Param('id') id: string,
    @Body() cloneWidgetDto: CloneWidgetDto,
    @Request() req,
  ) {
    try {
      const clonedWidget = await this.widgetService.clone(
        id,
        cloneWidgetDto,
        req.user.id,
        req.user.organizationId,
      );
      return {
        success: true,
        data: clonedWidget,
        message: 'Widget cloned successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'WIDGET_CLONING_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get widget analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(
    @Param('id') id: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Request() req,
  ) {
    try {
      const analytics = await this.widgetService.getAnalytics(
        id,
        {
          start: new Date(start),
          end: new Date(end),
        },
        req.user.organizationId,
      );
      return {
        success: true,
        data: analytics,
        message: 'Analytics retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'ANALYTICS_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/analytics/export')
  @ApiOperation({ summary: 'Export widget analytics' })
  @ApiResponse({ status: 200, description: 'Analytics exported successfully' })
  async exportAnalytics(
    @Param('id') id: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('format') format: 'csv' | 'json' | 'xlsx' = 'csv',
    @Request() req,
    @Res() res: Response,
  ) {
    try {
      const exportData = await this.widgetService.exportAnalytics(
        id,
        {
          start: new Date(start),
          end: new Date(end),
        },
        format,
        req.user.organizationId,
      );

      res.setHeader('Content-Type', exportData.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${exportData.filename}"`,
      );
      res.send(exportData.data);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'ANALYTICS_EXPORT_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get widget templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('category') category?: string,
    @Query('type') type?: 'agent' | 'tool' | 'workflow',
    @Query('search') search?: string,
    @Query('sortBy') sortBy: string = 'templateRating',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
    @Request() req,
  ) {
    try {
      const result = await this.widgetService.getTemplates({
        page: Number(page),
        limit: Number(limit),
        category,
        type,
        search,
        sortBy,
        sortOrder,
        organizationId: req.user.organizationId,
      });
      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Templates retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'TEMPLATES_RETRIEVAL_FAILED',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async getTemplate(@Param('templateId') templateId: string, @Request() req) {
    try {
      const template = await this.widgetService.getTemplate(templateId);
      return {
        success: true,
        data: template,
        message: 'Template retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'TEMPLATE_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post('templates/:templateId/create')
  @ApiOperation({ summary: 'Create widget from template' })
  @ApiResponse({
    status: 201,
    description: 'Widget created from template successfully',
  })
  async createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() widgetData: { name: string; sourceId: string; configuration?: any },
    @Request() req,
  ) {
    try {
      const widget = await this.widgetService.createFromTemplate(templateId, {
        ...widgetData,
        userId: req.user.id,
        organizationId: req.user.organizationId,
      });
      return {
        success: true,
        data: widget,
        message: 'Widget created from template successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'TEMPLATE_WIDGET_CREATION_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/publish-template')
  @ApiOperation({ summary: 'Publish widget as template' })
  @ApiResponse({
    status: 201,
    description: 'Widget published as template successfully',
  })
  async publishAsTemplate(
    @Param('id') id: string,
    @Body() publishTemplateDto: PublishTemplateDto,
    @Request() req,
  ) {
    try {
      const template = await this.widgetService.publishAsTemplate(
        id,
        publishTemplateDto,
        req.user.organizationId,
      );
      return {
        success: true,
        data: template,
        message: 'Widget published as template successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'TEMPLATE_PUBLISHING_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute widget' })
  @ApiResponse({ status: 200, description: 'Widget executed successfully' })
  async execute(
    @Param('id') id: string,
    @Body()
    executionData: {
      input: any;
      sessionId: string;
      context?: any;
    },
    @Request() req,
  ) {
    try {
      const result = await this.widgetService.execute(
        id,
        executionData,
        req.user?.id,
      );
      return {
        success: true,
        data: result,
        message: 'Widget executed successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
          error: 'WIDGET_EXECUTION_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
