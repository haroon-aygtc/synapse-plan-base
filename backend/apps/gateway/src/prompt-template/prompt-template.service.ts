import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject } from "@nestjs/common";
import { Cache } from "cache-manager";
import { PromptTemplate } from "@database/entities";
import { CreatePromptTemplateDto, UpdatePromptTemplateDto } from "./dto";
import { PromptTemplateEventType } from "@shared/enums";

@Injectable()
export class PromptTemplateService {
  private readonly logger = new Logger(PromptTemplateService.name);
  private readonly cachePrefix = "template:";

  constructor(
    @InjectRepository(PromptTemplate)
    private readonly promptTemplateRepository: Repository<PromptTemplate>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(
    createDto: CreatePromptTemplateDto,
    userId: string,
    organizationId: string,
  ): Promise<PromptTemplate> {
    // Check if parent template exists if provided
    if (createDto.parentTemplateId) {
      const parentTemplate = await this.promptTemplateRepository.findOne({
        where: {
          id: createDto.parentTemplateId,
          organizationId,
        },
      });

      if (!parentTemplate) {
        throw new NotFoundException("Parent template not found");
      }

      // Increment fork count on parent template
      await this.promptTemplateRepository.update(
        { id: createDto.parentTemplateId },
        { forkCount: () => "fork_count + 1" },
      );
    }

    // Create template entity
    const template = this.promptTemplateRepository.create({
      ...createDto,
      userId,
      organizationId,
      version: createDto.version || "1.0.0",
    });

    const savedTemplate = await this.promptTemplateRepository.save(template);

    // Cache the template
    await this.cacheTemplate(savedTemplate);

    // Emit event
    this.eventEmitter.emit(PromptTemplateEventType.TEMPLATE_CREATED, {
      templateId: savedTemplate.id,
      userId,
      organizationId,
      templateData: savedTemplate,
      timestamp: new Date(),
    });

    this.logger.log(
      `Template created: ${savedTemplate.id} by user ${userId} in org ${organizationId}`,
    );

    return savedTemplate;
  }

  async findAll(
    organizationId: string,
    options?: {
      userId?: string;
      includeInactive?: boolean;
      category?: string;
      isPublic?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<PromptTemplate[]> {
    const query = this.promptTemplateRepository
      .createQueryBuilder("template")
      .where("template.organizationId = :organizationId", { organizationId });

    if (options?.userId) {
      query.andWhere("template.userId = :userId", { userId: options.userId });
    }

    if (options?.includeInactive !== true) {
      query.andWhere("template.isActive = :isActive", { isActive: true });
    }

    if (options?.category) {
      query.andWhere("template.category = :category", {
        category: options.category,
      });
    }

    if (options?.isPublic !== undefined) {
      query.andWhere("template.isPublic = :isPublic", {
        isPublic: options.isPublic,
      });
    }

    if (options?.search) {
      query.andWhere(
        "(template.name ILIKE :search OR template.description ILIKE :search OR template.content ILIKE :search)",
        { search: `%${options.search}%` },
      );
    }

    if (options?.limit) {
      query.take(options.limit);
    }

    if (options?.offset) {
      query.skip(options.offset);
    }

    query.orderBy("template.updatedAt", "DESC");

    return query.getMany();
  }

  async findOne(
    id: string,
    organizationId: string,
    options?: {
      includeChildren?: boolean;
      includeAgents?: boolean;
    },
  ): Promise<PromptTemplate> {
    // Try cache first
    const cacheKey = `${this.cachePrefix}${id}`;
    let template = await this.cacheManager.get<PromptTemplate>(cacheKey);

    if (!template) {
      const query = this.promptTemplateRepository
        .createQueryBuilder("template")
        .where("template.id = :id", { id })
        .andWhere("template.organizationId = :organizationId", {
          organizationId,
        });

      if (options?.includeChildren) {
        query.leftJoinAndSelect("template.childTemplates", "childTemplates");
      }

      if (options?.includeAgents) {
        query.leftJoinAndSelect("template.agents", "agents");
      }

      template = await query.getOne();

      if (template) {
        await this.cacheTemplate(template);
      }
    }

    if (!template) {
      throw new NotFoundException("Template not found");
    }

    return template;
  }

  async update(
    id: string,
    updateDto: UpdatePromptTemplateDto,
    userId: string,
    organizationId: string,
  ): Promise<PromptTemplate> {
    const template = await this.findOne(id, organizationId);

    // Check ownership or admin permissions
    if (template.userId !== userId) {
      // In a real implementation, check if user has admin permissions
      throw new ForbiddenException("Not authorized to update this template");
    }

    // Check if parent template exists if being updated
    if (
      updateDto.parentTemplateId &&
      updateDto.parentTemplateId !== template.parentTemplateId
    ) {
      const parentTemplate = await this.promptTemplateRepository.findOne({
        where: {
          id: updateDto.parentTemplateId,
          organizationId,
        },
      });

      if (!parentTemplate) {
        throw new NotFoundException("Parent template not found");
      }

      // Increment fork count on new parent template
      await this.promptTemplateRepository.update(
        { id: updateDto.parentTemplateId },
        { forkCount: () => "fork_count + 1" },
      );

      // Decrement fork count on old parent template if it exists
      if (template.parentTemplateId) {
        await this.promptTemplateRepository.update(
          { id: template.parentTemplateId },
          { forkCount: () => "fork_count - 1" },
        );
      }
    }

    // Update template
    Object.assign(template, updateDto);
    template.updatedAt = new Date();

    const updatedTemplate = await this.promptTemplateRepository.save(template);

    // Update cache
    await this.cacheTemplate(updatedTemplate);

    // Emit event
    this.eventEmitter.emit(PromptTemplateEventType.TEMPLATE_UPDATED, {
      templateId: updatedTemplate.id,
      userId,
      organizationId,
      changes: updateDto,
      templateData: updatedTemplate,
      timestamp: new Date(),
    });

    this.logger.log(
      `Template updated: ${updatedTemplate.id} by user ${userId}`,
    );

    return updatedTemplate;
  }

  async remove(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const template = await this.findOne(id, organizationId);

    // Check ownership or admin permissions
    if (template.userId !== userId) {
      throw new ForbiddenException("Not authorized to delete this template");
    }

    // Check if template is used by any agents
    const usedByAgents = await this.promptTemplateRepository
      .createQueryBuilder("template")
      .leftJoin("template.agents", "agents")
      .where("template.id = :id", { id })
      .andWhere("agents.id IS NOT NULL")
      .getCount();

    if (usedByAgents > 0) {
      throw new BadRequestException(
        "Cannot delete template that is used by agents",
      );
    }

    // Soft delete by setting isActive to false
    template.isActive = false;
    template.updatedAt = new Date();
    await this.promptTemplateRepository.save(template);

    // Remove from cache
    await this.cacheManager.del(`${this.cachePrefix}${id}`);

    // Emit event
    this.eventEmitter.emit(PromptTemplateEventType.TEMPLATE_DELETED, {
      templateId: id,
      userId,
      organizationId,
      timestamp: new Date(),
    });

    this.logger.log(`Template deleted: ${id} by user ${userId}`);
  }

  async createVersion(
    id: string,
    newVersion: string,
    changes: Record<string, any>,
    userId: string,
    organizationId: string,
  ): Promise<PromptTemplate> {
    const template = await this.findOne(id, organizationId);

    // Check ownership or admin permissions
    if (template.userId !== userId) {
      throw new ForbiddenException(
        "Not authorized to create version of this template",
      );
    }

    // Create new version
    const newTemplate = this.promptTemplateRepository.create({
      ...template,
      id: undefined, // Let the database generate a new ID
      version: newVersion,
      parentTemplateId: template.id, // Set the original as parent
      ...changes,
      userId,
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedTemplate = await this.promptTemplateRepository.save(newTemplate);

    // Increment fork count on parent template
    await this.promptTemplateRepository.update(
      { id },
      { forkCount: () => "fork_count + 1" },
    );

    // Cache the new template
    await this.cacheTemplate(savedTemplate);

    // Emit event
    this.eventEmitter.emit(PromptTemplateEventType.TEMPLATE_VERSION_CREATED, {
      templateId: savedTemplate.id,
      parentTemplateId: id,
      userId,
      organizationId,
      version: newVersion,
      timestamp: new Date(),
    });

    this.logger.log(
      `Template version created: ${savedTemplate.id} (version ${newVersion}) from ${id} by user ${userId}`,
    );

    return savedTemplate;
  }

  async getVersionHistory(
    id: string,
    organizationId: string,
  ): Promise<PromptTemplate[]> {
    // Get the template
    const template = await this.findOne(id, organizationId);

    // Find all versions (parent and children)
    const versions: PromptTemplate[] = [];

    // If this template has a parent, get the parent and its ancestors
    if (template.parentTemplateId) {
      const ancestors = await this.getAncestors(
        template.parentTemplateId,
        organizationId,
      );
      versions.push(...ancestors);
    }

    // Add the current template
    versions.push(template);

    // Get all child templates
    const children = await this.promptTemplateRepository.find({
      where: { parentTemplateId: id, organizationId },
      order: { createdAt: "ASC" },
    });

    versions.push(...children);

    return versions;
  }

  async renderTemplate(
    id: string,
    variables: Record<string, any>,
    organizationId: string,
  ): Promise<string> {
    const template = await this.findOne(id, organizationId);

    // Validate variables against template schema
    if (template.variables) {
      for (const varDef of template.variables) {
        if (varDef.required && !(varDef.name in variables)) {
          throw new BadRequestException(
            `Required variable '${varDef.name}' is missing`,
          );
        }

        if (varDef.name in variables) {
          const value = variables[varDef.name];

          // Type validation
          if (typeof value !== varDef.type && varDef.type !== "object") {
            throw new BadRequestException(
              `Variable '${varDef.name}' should be of type '${varDef.type}'`,
            );
          }

          // Additional validation rules if defined
          if (varDef.validation) {
            if (
              varDef.type === "number" &&
              varDef.validation.min !== undefined &&
              value < varDef.validation.min
            ) {
              throw new BadRequestException(
                `Variable '${varDef.name}' should be >= ${varDef.validation.min}`,
              );
            }

            if (
              varDef.type === "number" &&
              varDef.validation.max !== undefined &&
              value > varDef.validation.max
            ) {
              throw new BadRequestException(
                `Variable '${varDef.name}' should be <= ${varDef.validation.max}`,
              );
            }

            if (
              varDef.type === "string" &&
              varDef.validation.pattern &&
              !new RegExp(varDef.validation.pattern).test(value)
            ) {
              throw new BadRequestException(
                `Variable '${varDef.name}' does not match required pattern`,
              );
            }

            if (
              varDef.validation.enum &&
              !varDef.validation.enum.includes(value)
            ) {
              throw new BadRequestException(
                `Variable '${varDef.name}' should be one of: ${varDef.validation.enum.join(", ")}`,
              );
            }
          }
        }
      }
    }

    // Render the template by replacing variables
    let renderedContent = template.content;

    // Replace variables in the format {{variable_name}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      renderedContent = renderedContent.replace(
        regex,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      );
    }

    // Update usage count
    await this.promptTemplateRepository.update(
      { id },
      { usageCount: () => "usage_count + 1" },
    );

    return renderedContent;
  }

  async validateTemplate(
    content: string,
    variables: Record<string, any>,
  ): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    try {
      // Check for unmatched braces
      const openBraces = (content.match(/{{/g) || []).length;
      const closeBraces = (content.match(/}}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push("Unmatched template braces");
      }

      // Extract variable names from template
      const variableRegex = /{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
      const templateVariables = new Set<string>();
      let match;
      while ((match = variableRegex.exec(content)) !== null) {
        templateVariables.add(match[1]);
      }

      // Check if all template variables have values
      for (const varName of templateVariables) {
        if (!(varName in variables)) {
          errors.push(`Missing value for variable: ${varName}`);
        }
      }

      // Try to render the template
      let rendered = content;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        rendered = rendered.replace(
          regex,
          typeof value === "object" ? JSON.stringify(value) : String(value),
        );
      }

      // Check if there are still unresolved variables
      const unresolvedVars = rendered.match(/{{\s*[^}]+\s*}}/g);
      if (unresolvedVars) {
        errors.push(`Unresolved variables: ${unresolvedVars.join(", ")}`);
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : "Validation failed"],
      };
    }
  }

  async renderWithContext(
    id: string,
    variables: Record<string, any>,
    context: {
      userId?: string;
      sessionId?: string;
      organizationId: string;
      memory?: Record<string, any>;
      toolOutputs?: Record<string, any>;
      knowledgeChunks?: any[];
    },
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
    const startTime = Date.now();
    const template = await this.findOne(id, context.organizationId);

    // Merge context into variables
    const contextVariables = {
      ...variables,
      user_id: context.userId,
      session_id: context.sessionId,
      organization_id: context.organizationId,
      ...context.memory,
      ...context.toolOutputs,
    };

    // Add knowledge chunks if available
    if (context.knowledgeChunks && context.knowledgeChunks.length > 0) {
      contextVariables.knowledge_context = context.knowledgeChunks
        .map((chunk) => chunk.content)
        .join("\n\n");
    }

    const rendered = await this.renderTemplate(
      id,
      contextVariables,
      context.organizationId,
    );
    const renderTime = Date.now() - startTime;

    // Extract used variables
    const variableRegex = /{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
    const variablesUsed = new Set<string>();
    let match;
    while ((match = variableRegex.exec(template.content)) !== null) {
      if (contextVariables[match[1]] !== undefined) {
        variablesUsed.add(match[1]);
      }
    }

    // Estimate tokens (rough approximation)
    const tokensEstimate = Math.ceil(rendered.length / 4);

    return {
      rendered,
      metadata: {
        templateId: template.id,
        version: template.version,
        variablesUsed: Array.from(variablesUsed),
        renderTime,
        tokensEstimate,
      },
    };
  }

  async rateTemplate(
    id: string,
    rating: number,
    userId: string,
    organizationId: string,
  ): Promise<PromptTemplate> {
    if (rating < 0 || rating > 5) {
      throw new BadRequestException("Rating must be between 0 and 5");
    }

    const template = await this.findOne(id, organizationId);

    // Calculate new average rating
    const newRatingCount = template.ratingCount + 1;
    const newRating =
      (template.rating * template.ratingCount + rating) / newRatingCount;

    // Update template
    template.rating = newRating;
    template.ratingCount = newRatingCount;
    template.updatedAt = new Date();

    const updatedTemplate = await this.promptTemplateRepository.save(template);

    // Update cache
    await this.cacheTemplate(updatedTemplate);

    // Emit event
    this.eventEmitter.emit(PromptTemplateEventType.TEMPLATE_RATED, {
      templateId: id,
      userId,
      organizationId,
      rating,
      newAverageRating: newRating,
      timestamp: new Date(),
    });

    return updatedTemplate;
  }

  // Private helper methods
  private async cacheTemplate(template: PromptTemplate): Promise<void> {
    const cacheKey = `${this.cachePrefix}${template.id}`;
    await this.cacheManager.set(cacheKey, template, 300000); // 5 minutes
  }

  private async getAncestors(
    templateId: string,
    organizationId: string,
  ): Promise<PromptTemplate[]> {
    const ancestors: PromptTemplate[] = [];
    let currentId = templateId;

    while (currentId) {
      try {
        const template = await this.promptTemplateRepository.findOne({
          where: { id: currentId, organizationId },
        });

        if (!template) break;

        ancestors.unshift(template); // Add to beginning of array
        currentId = template.parentTemplateId;
      } catch (error) {
        break;
      }
    }

    return ancestors;
  }
}
