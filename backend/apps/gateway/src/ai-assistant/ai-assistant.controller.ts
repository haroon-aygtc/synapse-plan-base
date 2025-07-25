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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/interfaces';
import { AIAssistantService } from './ai-assistant.service';
import { NaturalLanguageProcessorService } from './services/natural-language-processor.service';
import { MultiLanguageSupportService } from './services/multi-language-support.service';
import { LearningSystemService } from './services/learning-system.service';
import { VisualBuilderService } from './services/visual-builder.service';
import { APIPatternDetectionService } from './services/api-pattern-detection.service';
import {
  GenerateConfigDto,
  AnalyzeAgentDto,
  PromptSuggestionsDto,
  OptimizePromptDto,
  GenerateTestCasesDto,
  ExplainAgentDto,
  PersonalityProfileDto,
} from './dto';
import {
  ProcessNaturalLanguageDto,
  IntentRecognitionDto,
  ConfigurationSuggestionDto,
  ValidationOptimizationDto,
  LearningFeedbackDto,
} from './dto/natural-language-config.dto';
import {
  CreateVisualBuilderDto,
  ComponentSuggestionDto,
  PreviewGenerationDto,
  TemplateGenerationDto,
  ComponentValidationDto,
  CollaborativeEditingDto,
} from './dto/visual-builder.dto';
import {
  APIEndpointAnalysisDto,
  SchemaGenerationDto,
  AuthenticationDetectionDto,
  ParameterMappingDto,
  ErrorPatternAnalysisDto,
  APITestingDto,
  APIValidationDto,
} from './dto/api-pattern-detection.dto';

@ApiTags('ai-assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai-assistant')
export class AIAssistantController {
  constructor(
    private readonly aiAssistantService: AIAssistantService,
    private readonly naturalLanguageProcessor: NaturalLanguageProcessorService,
    private readonly multiLanguageSupport: MultiLanguageSupportService,
    private readonly learningSystem: LearningSystemService,
    private readonly visualBuilder: VisualBuilderService,
    private readonly apiPatternDetection: APIPatternDetectionService
  ) {}

  @Post('generate-config')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate agent configuration using AI' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateConfig(@Body() generateConfigDto: GenerateConfigDto, @Request() req: any) {
    return this.aiAssistantService.generateAgentConfig(
      generateConfigDto,
      req.user.sub,
      req.user.organizationId
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
  async analyzeAgent(@Body() analyzeAgentDto: AnalyzeAgentDto, @Request() req: any) {
    return this.aiAssistantService.analyzeAgent(
      analyzeAgentDto,
      req.user.sub,
      req.user.organizationId
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
    @Request() req: any
  ) {
    return this.aiAssistantService.generatePromptSuggestions(
      promptSuggestionsDto,
      req.user.sub,
      req.user.organizationId
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
  async optimizePrompt(@Body() optimizePromptDto: OptimizePromptDto, @Request() req: any) {
    return this.aiAssistantService.optimizePrompt(
      optimizePromptDto,
      req.user.sub,
      req.user.organizationId
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
  async generateTestCases(@Body() generateTestCasesDto: GenerateTestCasesDto, @Request() req: any) {
    return this.aiAssistantService.generateTestCases(
      generateTestCasesDto,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('explain-agent')
  @Roles(UserRole.VIEWER, UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Explain agent capabilities and behavior' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent explanation generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async explainAgent(@Body() explainAgentDto: ExplainAgentDto, @Request() req: any) {
    return this.aiAssistantService.explainAgent(
      explainAgentDto,
      req.user.sub,
      req.user.organizationId
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
    @Request() req: any
  ) {
    return this.aiAssistantService.generatePersonalityProfile(
      personalityProfileDto,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('process-natural-language')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Process natural language description to generate configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration generated from natural language successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async processNaturalLanguage(
    @Body() processNaturalLanguageDto: ProcessNaturalLanguageDto,
    @Request() req: any
  ) {
    return this.naturalLanguageProcessor.processNaturalLanguage(
      processNaturalLanguageDto,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('recognize-intent')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Recognize user intent from natural language input' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Intent recognized successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async recognizeIntent(@Body() intentRecognitionDto: IntentRecognitionDto, @Request() req: any) {
    return this.naturalLanguageProcessor.recognizeIntent(intentRecognitionDto);
  }

  @Post('context-aware-suggestions')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate context-aware configuration suggestions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Context-aware suggestions generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateContextAwareSuggestions(
    @Body() configurationSuggestionDto: ConfigurationSuggestionDto,
    @Request() req: any
  ) {
    return this.naturalLanguageProcessor.generateContextAwareSuggestions(
      configurationSuggestionDto,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('validate-optimize')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Validate and optimize configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration validated and optimized successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async validateAndOptimizeConfiguration(
    @Body() validationOptimizationDto: ValidationOptimizationDto,
    @Request() req: any
  ) {
    return this.naturalLanguageProcessor.validateAndOptimizeConfiguration(
      validationOptimizationDto,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('learning-feedback')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Provide feedback for learning system improvement' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning feedback processed successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async processLearningFeedback(
    @Body() learningFeedbackDto: LearningFeedbackDto,
    @Request() req: any
  ) {
    return this.naturalLanguageProcessor.processLearningFeedback(
      learningFeedbackDto,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('detect-language')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Detect language from input text' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Language detected successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async detectLanguage(@Body() body: { text: string }, @Request() req: any) {
    return this.multiLanguageSupport.detectLanguage(body.text);
  }

  @Post('translate-text')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Translate text to target language' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Text translated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async translateText(
    @Body() body: { text: string; targetLanguage: string; sourceLanguage?: string },
    @Request() req: any
  ) {
    return this.multiLanguageSupport.translateText(
      body.text,
      body.targetLanguage,
      body.sourceLanguage
    );
  }

  @Post('localize-configuration')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Localize configuration for target language and culture' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration localized successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async localizeConfiguration(
    @Body() body: { configuration: any; targetLanguage: string; configurationType: string },
    @Request() req: any
  ) {
    return this.multiLanguageSupport.localizeConfiguration(
      body.configuration,
      body.targetLanguage,
      body.configurationType
    );
  }

  @Post('personalized-suggestions')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get personalized configuration suggestions based on learning data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Personalized suggestions generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getPersonalizedSuggestions(
    @Body() body: { configurationType: string; context: Record<string, any> },
    @Request() req: any
  ) {
    return this.learningSystem.getPersonalizedSuggestions(
      req.user.sub,
      req.user.organizationId,
      body.configurationType,
      body.context
    );
  }

  @Post('optimization-recommendations')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get optimization recommendations based on learning data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Optimization recommendations generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getOptimizationRecommendations(
    @Body() body: { configuration: any; configurationType: string },
    @Request() req: any
  ) {
    return this.learningSystem.getOptimizationRecommendations(
      body.configuration,
      body.configurationType,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('visual-builder/create')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create visual builder canvas with intelligent suggestions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Visual builder created successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async createVisualBuilder(
    @Body() createVisualBuilderDto: CreateVisualBuilderDto,
    @Request() req: any
  ) {
    return this.visualBuilder.createVisualBuilder(
      createVisualBuilderDto,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('visual-builder/component-suggestions')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate intelligent component suggestions for visual builder' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Component suggestions generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateComponentSuggestions(
    @Body() componentSuggestionDto: ComponentSuggestionDto,
    @Request() req: any
  ) {
    return this.visualBuilder.generateComponentSuggestions(componentSuggestionDto);
  }

  @Post('visual-builder/preview')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate real-time preview with responsive testing' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Preview generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generatePreview(@Body() previewGenerationDto: PreviewGenerationDto, @Request() req: any) {
    return this.visualBuilder.generatePreview(
      previewGenerationDto,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('visual-builder/template')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate template-based rapid development system' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateTemplate(
    @Body() templateGenerationDto: TemplateGenerationDto,
    @Request() req: any
  ) {
    return this.visualBuilder.generateTemplate(
      templateGenerationDto,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('visual-builder/validate-component')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Validate component and check compatibility' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Component validated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async validateComponent(
    @Body() componentValidationDto: ComponentValidationDto,
    @Request() req: any
  ) {
    return this.visualBuilder.validateComponent(componentValidationDto);
  }

  @Post('visual-builder/collaborative-edit')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Handle collaborative editing for team development' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collaborative edit processed successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleCollaborativeEdit(
    @Body() collaborativeEditingDto: CollaborativeEditingDto,
    @Request() req: any
  ) {
    return this.visualBuilder.handleCollaborativeEdit(
      collaborativeEditingDto,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('api-pattern/analyze-endpoint')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Analyze API endpoint and detect patterns automatically' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API endpoint analyzed successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async analyzeAPIEndpoint(
    @Body() apiEndpointAnalysisDto: APIEndpointAnalysisDto,
    @Request() req: any
  ) {
    return this.apiPatternDetection.analyzeAPIEndpoint(
      apiEndpointAnalysisDto,
      req.user.sub,
      req.user.organizationId
    );
  }

  @Post('api-pattern/generate-schema')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate automatic schema from API endpoints' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API schema generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateAPISchema(@Body() schemaGenerationDto: SchemaGenerationDto, @Request() req: any) {
    return this.apiPatternDetection.generateSchema(schemaGenerationDto);
  }

  @Post('api-pattern/detect-authentication')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Detect authentication method and configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authentication method detected successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async detectAuthentication(
    @Body() authenticationDetectionDto: AuthenticationDetectionDto,
    @Request() req: any
  ) {
    return this.apiPatternDetection.detectAuthentication(authenticationDetectionDto);
  }

  @Post('api-pattern/parameter-mapping')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate parameter mapping and validation system' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Parameter mapping generated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async generateParameterMapping(
    @Body() parameterMappingDto: ParameterMappingDto,
    @Request() req: any
  ) {
    return this.apiPatternDetection.generateParameterMapping(parameterMappingDto);
  }

  @Post('api-pattern/error-patterns')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Analyze error handling patterns and recognition' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Error patterns analyzed successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async analyzeErrorPatterns(
    @Body() errorPatternAnalysisDto: ErrorPatternAnalysisDto,
    @Request() req: any
  ) {
    return this.apiPatternDetection.analyzeErrorPatterns(errorPatternAnalysisDto);
  }

  @Post('api-pattern/test-api')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Test API with generated configuration and validation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API tested successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async testAPI(@Body() apiTestingDto: APITestingDto, @Request() req: any) {
    return this.apiPatternDetection.testAPI(apiTestingDto);
  }

  @Post('api-pattern/validate-configuration')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Validate complete API configuration and tools' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API configuration validated successfully',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async validateAPIConfiguration(@Body() apiValidationDto: APIValidationDto, @Request() req: any) {
    return this.apiPatternDetection.validateAPIConfiguration(apiValidationDto);
  }
}
