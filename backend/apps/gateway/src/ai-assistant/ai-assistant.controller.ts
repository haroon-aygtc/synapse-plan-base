import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/interfaces';
import { AIAssistantService } from './ai-assistant.service';
import {
  GenerateConfigDto,
  AnalyzeAgentDto,
  PromptSuggestionsDto,
  OptimizePromptDto,
  GenerateTestCasesDto,
  ExplainAgentDto,
  PersonalityProfileDto,
} from './dto';

@ApiTags('ai-assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-assistant')
export class AIAssistantController {
  constructor(private readonly aiAssistantService: AIAssistantService) {}

  @Post('generate-config')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate agent configuration using AI' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateConfig(
    @Body() generateConfigDto: GenerateConfigDto,
    @Request() req: any,
  ) {
    return this.aiAssistantService.generateAgentConfig(
      generateConfigDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  @Post('analyze-agent')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Analyze agent configuration and performance' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent analyzed successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async analyzeAgent(
    @Body() analyzeAgentDto: AnalyzeAgentDto,
    @Request() req: any,
  ) {
    return this.aiAssistantService.analyzeAgent(
      analyzeAgentDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  @Post('prompt-suggestions')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate prompt suggestions based on use case' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Prompt suggestions generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generatePromptSuggestions(
    @Body() promptSuggestionsDto: PromptSuggestionsDto,
    @Request() req: any,
  ) {
    return this.aiAssistantService.generatePromptSuggestions(
      promptSuggestionsDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  @Post('optimize-prompt')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Optimize existing prompt for better performance' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Prompt optimized successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async optimizePrompt(
    @Body() optimizePromptDto: OptimizePromptDto,
    @Request() req: any,
  ) {
    return this.aiAssistantService.optimizePrompt(
      optimizePromptDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  @Post('generate-test-cases')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate test cases for agent validation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test cases generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateTestCases(
    @Body() generateTestCasesDto: GenerateTestCasesDto,
    @Request() req: any,
  ) {
    return this.aiAssistantService.generateTestCases(
      generateTestCasesDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  @Post('explain-agent')
  @Roles(
    UserRole.VIEWER,
    UserRole.DEVELOPER,
    UserRole.ORG_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Explain agent capabilities and behavior' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent explanation generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async explainAgent(
    @Body() explainAgentDto: ExplainAgentDto,
    @Request() req: any,
  ) {
    return this.aiAssistantService.explainAgent(
      explainAgentDto,
      req.user.sub,
      req.user.organizationId,
    );
  }

  @Post('personality-profile')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate personality profile from traits' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Personality profile generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generatePersonalityProfile(
    @Body() personalityProfileDto: PersonalityProfileDto,
    @Request() req: any,
  ) {
    return this.aiAssistantService.generatePersonalityProfile(
      personalityProfileDto,
      req.user.sub,
      req.user.organizationId,
    );
  }
}