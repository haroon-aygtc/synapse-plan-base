import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NaturalLanguageProcessorService } from './natural-language-processor.service';
import { ConfigurationType } from '../dto/natural-language-config.dto';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('NaturalLanguageProcessorService', () => {
  let service: NaturalLanguageProcessorService;
  let configService: ConfigService;
  let mockOpenAI: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NaturalLanguageProcessorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<NaturalLanguageProcessorService>(NaturalLanguageProcessorService);
    configService = module.get<ConfigService>(ConfigService);

    // Get the mocked OpenAI instance
    const OpenAI = require('openai').default;
    mockOpenAI = new OpenAI();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processNaturalLanguage', () => {
    it('should process natural language and generate configuration', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              confidence: 0.9,
              suggestedConfig: {
                name: 'Test Agent',
                prompt: 'You are a helpful assistant',
                model: 'gpt-4',
              },
              explanation: 'Generated based on description',
              alternatives: [],
            }),
          },
        }],
      };

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockResponse) // For intent recognition
        .mockResolvedValueOnce(mockResponse); // For configuration generation

      const dto = {
        description: 'Create a helpful customer service agent',
        configurationType: ConfigurationType.AGENT,
        context: {
          userRole: 'developer',
          organizationId: 'org-123',
        },
      };

      const result = await service.processNaturalLanguage(dto, 'user-123', 'org-123');

      expect(result).toBeDefined();
      expect(result.confidence).toBe(0.9);
      expect(result.suggestedConfig.name).toBe('Test Agent');
      expect(result.validationResults).toBeDefined();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const dto = {
        description: 'Create a test agent',
        configurationType: ConfigurationType.AGENT,
        context: {
          userRole: 'developer',
          organizationId: 'org-123',
        },
      };

      await expect(
        service.processNaturalLanguage(dto, 'user-123', 'org-123')
      ).rejects.toThrow('Failed to process natural language configuration request');
    });
  });

  describe('recognizeIntent', () => {
    it('should recognize user intent from input', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              intent: 'create',
              confidence: 0.95,
              entities: {
                configurationType: 'agent',
                targetFeatures: ['customer service'],
                constraints: [],
                preferences: {},
                complexity: 'intermediate',
              },
              suggestedActions: ['Create agent configuration'],
              clarificationNeeded: [],
            }),
          },
        }],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const dto = {
        userInput: 'I want to create a customer service agent',
        context: {
          userRole: 'developer',
          organizationId: 'org-123',
        },
      };

      const result = await service.recognizeIntent(dto);

      expect(result).toBeDefined();
      expect(result.intent).toBe('create');
      expect(result.confidence).toBe(0.95);
      expect(result.entities.configurationType).toBe('agent');
    });
  });

  describe('generateContextAwareSuggestions', () => {
    it('should generate context-aware suggestions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  confidence: 0.8,
                  suggestedConfig: {
                    model: 'gpt-4',
                    temperature: 0.7,
                  },
                  explanation: 'Optimized for conversational tasks',
                  alternatives: [],
                  expectedImprovements: {
                    performance: 'Better response quality',
                    usability: 'More natural conversations',
                    maintainability: 'Easier to update',
                  },
                },
              ],
            }),
          },
        }],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const dto = {
        currentConfiguration: {
          model: 'gpt-3.5-turbo',
          temperature: 0.5,
        },
        userIntent: 'Improve conversation quality',
        context: {
          userRole: 'developer',
          organizationId: 'org-123',
        },
      };

      const result = await service.generateContextAwareSuggestions(dto, 'user-123', 'org-123');

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].confidence).toBe(0.8);
      expect(result[0].suggestedConfig.model).toBe('gpt-4');
    });
  });

  describe('validateAndOptimizeConfiguration', () => {
    it('should validate and optimize configuration', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              optimizationSuggestions: [
                {
                  field: 'temperature',
                  currentValue: 0.9,
                  suggestedValue: 0.7,
                  reasoning: 'Lower temperature for more consistent responses',
                  expectedImprovement: '15% improvement in consistency',
                  priority: 'medium',
                },
              ],
              optimizedConfiguration: {
                model: 'gpt-4',
                temperature: 0.7,
                prompt: 'Optimized prompt',
              },
            }),
          },
        }],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const dto = {
        configuration: {
          model: 'gpt-4',
          temperature: 0.9,
          prompt: 'Basic prompt',
        },
        configurationType: ConfigurationType.AGENT,
        context: {
          userRole: 'developer',
          organizationId: 'org-123',
        },
      };

      const result = await service.validateAndOptimizeConfiguration(dto, 'user-123', 'org-123');

      expect(result).toBeDefined();
      expect(result.validationResults).toBeDefined();
      expect(result.optimizationSuggestions).toBeDefined();
      expect(result.optimizationSuggestions.length).toBe(1);
      expect(result.optimizationSuggestions[0].field).toBe('temperature');
      expect(result.optimizedConfiguration).toBeDefined();
    });
  });

  describe('processLearningFeedback', () => {
    it('should process learning feedback without throwing errors', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              insights: ['User prefers lower temperature'],
              improvementAreas: ['Temperature optimization'],
              successFactors: ['Clear prompts'],
              patterns: ['Consistent model usage'],
              recommendations: ['Use temperature 0.7'],
            }),
          },
        }],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const dto = {
        generatedConfiguration: {
          model: 'gpt-4',
          temperature: 0.7,
        },
        userFeedback: 'This configuration works well',
        successMetrics: {
          accuracy: 0.9,
          responseTime: 1.2,
        },
        satisfactionRating: 5,
        context: {
          userRole: 'developer',
          organizationId: 'org-123',
        },
      };

      // Should not throw an error
      await expect(
        service.processLearningFeedback(dto, 'user-123', 'org-123')
      ).resolves.not.toThrow();
    });

    it('should handle feedback processing errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const dto = {
        generatedConfiguration: {},
        userFeedback: 'Test feedback',
        context: {
          userRole: 'developer',
          organizationId: 'org-123',
        },
      };

      // Should not throw an error even if processing fails
      await expect(
        service.processLearningFeedback(dto, 'user-123', 'org-123')
      ).resolves.not.toThrow();
    });
  });
});