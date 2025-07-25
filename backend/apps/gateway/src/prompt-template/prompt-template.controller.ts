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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "@shared/decorators/roles.decorator";
import { UserRole } from "@shared/interfaces";
import { PromptTemplateService } from "./prompt-template.service";
import {
  CreatePromptTemplateDto,
  UpdatePromptTemplateDto,
  PromptTemplateResponseDto,
  RenderTemplateDto,
} from "./dto";
import { PromptTemplate } from "@database/entities";
import { plainToClass } from "class-transformer";

@ApiTags("prompt-templates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("prompt-templates")
export class PromptTemplateController {
  constructor(private readonly promptTemplateService: PromptTemplateService) {}

  @Post()
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Create a new prompt template" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Template created successfully",
    type: PromptTemplateResponseDto,
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() createDto: CreatePromptTemplateDto,
    @Request() req: any,
  ): Promise<PromptTemplateResponseDto> {
    const template = await this.promptTemplateService.create(
      createDto,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(PromptTemplateResponseDto, template, {
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
  @ApiOperation({ summary: "Get all prompt templates" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Templates retrieved successfully",
    type: [PromptTemplateResponseDto],
  })
  @ApiQuery({
    name: "userId",
    required: false,
    description: "Filter by user ID",
  })
  @ApiQuery({
    name: "includeInactive",
    required: false,
    type: Boolean,
    description: "Include inactive templates",
  })
  @ApiQuery({
    name: "category",
    required: false,
    description: "Filter by category",
  })
  @ApiQuery({
    name: "isPublic",
    required: false,
    type: Boolean,
    description: "Filter by public status",
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search term",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Limit results",
  })
  @ApiQuery({
    name: "offset",
    required: false,
    type: Number,
    description: "Offset results",
  })
  async findAll(
    @Request() req: any,
    @Query("userId") userId?: string,
    @Query("includeInactive") includeInactive?: boolean,
    @Query("category") category?: string,
    @Query("isPublic") isPublic?: boolean,
    @Query("search") search?: string,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ): Promise<PromptTemplateResponseDto[]> {
    const templates = await this.promptTemplateService.findAll(
      req.user.organizationId,
      {
        userId,
        includeInactive,
        category,
        isPublic,
        search,
        limit,
        offset,
      },
    );
    return templates.map((template) =>
      plainToClass(PromptTemplateResponseDto, template, {
        excludeExtraneousValues: true,
      }),
    );
  }

  @Get(":id")
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: "Get prompt template by ID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Template retrieved successfully",
    type: PromptTemplateResponseDto,
  })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiQuery({
    name: "includeChildren",
    required: false,
    type: Boolean,
    description: "Include child templates",
  })
  @ApiQuery({
    name: "includeAgents",
    required: false,
    type: Boolean,
    description: "Include agents using this template",
  })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: any,
    @Query("includeChildren") includeChildren?: boolean,
    @Query("includeAgents") includeAgents?: boolean,
  ): Promise<PromptTemplateResponseDto> {
    const template = await this.promptTemplateService.findOne(
      id,
      req.user.organizationId,
      {
        includeChildren,
        includeAgents,
      },
    );
    return plainToClass(PromptTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(":id")
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Update prompt template" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Template updated successfully",
    type: PromptTemplateResponseDto,
  })
  @ApiParam({ name: "id", description: "Template ID" })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePromptTemplateDto,
    @Request() req: any,
  ): Promise<PromptTemplateResponseDto> {
    const template = await this.promptTemplateService.update(
      id,
      updateDto,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(PromptTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(":id")
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Delete prompt template" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Template deleted successfully",
  })
  @ApiParam({ name: "id", description: "Template ID" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<void> {
    await this.promptTemplateService.remove(
      id,
      req.user.sub,
      req.user.organizationId,
    );
  }

  @Post(":id/versions")
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Create new version of prompt template" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Template version created successfully",
    type: PromptTemplateResponseDto,
  })
  @ApiParam({ name: "id", description: "Template ID" })
  async createVersion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { version: string; changes: Record<string, any> },
    @Request() req: any,
  ): Promise<PromptTemplateResponseDto> {
    const template = await this.promptTemplateService.createVersion(
      id,
      body.version,
      body.changes,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(PromptTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }

  @Get(":id/versions")
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: "Get version history of prompt template" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Version history retrieved successfully",
    type: [PromptTemplateResponseDto],
  })
  @ApiParam({ name: "id", description: "Template ID" })
  async getVersionHistory(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<PromptTemplateResponseDto[]> {
    const templates = await this.promptTemplateService.getVersionHistory(
      id,
      req.user.organizationId,
    );
    return templates.map((template) =>
      plainToClass(PromptTemplateResponseDto, template, {
        excludeExtraneousValues: true,
      }),
    );
  }

  @Post("render")
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: "Render a prompt template with variables" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Template rendered successfully",
    type: String,
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async renderTemplate(
    @Body() renderDto: RenderTemplateDto,
    @Request() req: any,
  ): Promise<{ rendered: string }> {
    const rendered = await this.promptTemplateService.renderTemplate(
      renderDto.templateId,
      renderDto.variables,
      req.user.organizationId,
    );
    return { rendered };
  }

  @Post("validate")
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: "Validate a prompt template" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Template validation result",
  })
  async validateTemplate(
    @Body() body: { content: string; variables: Record<string, any> },
    @Request() req: any,
  ): Promise<{ valid: boolean; errors?: string[] }> {
    return this.promptTemplateService.validateTemplate(
      body.content,
      body.variables,
    );
  }

  @Post(":id/render-with-context")
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: "Render template with full context" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Template rendered with context successfully",
  })
  @ApiParam({ name: "id", description: "Template ID" })
  async renderWithContext(
    @Param("id", ParseUUIDPipe) id: string,
    @Body()
    body: {
      variables: Record<string, any>;
      context?: {
        sessionId?: string;
        memory?: Record<string, any>;
        toolOutputs?: Record<string, any>;
        knowledgeChunks?: any[];
      };
    },
    @Request() req: any,
  ): Promise<{
    rendered: string;
    metadata: {
      templateId: string;
      version: string;
      variablesUsed: string[];
      renderTime: number;
      tokensEstimate: number;
    };
  }> {
    return this.promptTemplateService.renderWithContext(id, body.variables, {
      userId: req.user.sub,
      organizationId: req.user.organizationId,
      ...body.context,
    });
  }

  @Post(":id/rate")
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: "Rate a prompt template" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Template rated successfully",
    type: PromptTemplateResponseDto,
  })
  @ApiParam({ name: "id", description: "Template ID" })
  async rateTemplate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { rating: number },
    @Request() req: any,
  ): Promise<PromptTemplateResponseDto> {
    const template = await this.promptTemplateService.rateTemplate(
      id,
      body.rating,
      req.user.sub,
      req.user.organizationId,
    );
    return plainToClass(PromptTemplateResponseDto, template, {
      excludeExtraneousValues: true,
    });
  }
}
