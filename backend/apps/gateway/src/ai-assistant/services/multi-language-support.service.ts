import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  supportedLanguages: string[];
}

interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

interface LocalizedConfigurationResult {
  localizedConfig: any;
  language: string;
  culturalAdaptations: string[];
  localizedExplanation: string;
}

@Injectable()
export class MultiLanguageSupportService {
  private readonly logger = new Logger(MultiLanguageSupportService.name);
  private readonly openai: OpenAI;
  
  private readonly supportedLanguages = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'nl', 'sv', 'no', 'da'
  ];

  private readonly languageNames: { [key: string]: string } = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'no': 'Norwegian',
    'da': 'Danish',
  };

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    this.logger.log('Detecting language from input text');

    try {
      const prompt = `
Detect the language of the following text and provide confidence score:

Text: "${text}"

Respond in JSON format:
{
  "detectedLanguage": "language_code",
  "confidence": confidence_score_0_to_1,
  "supportedLanguages": ["list", "of", "supported", "language", "codes"]
}

Use ISO 639-1 language codes (en, es, fr, de, etc.).
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a language detection expert. Always respond with valid JSON using ISO 639-1 language codes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      
      // Validate detected language is supported
      if (!this.supportedLanguages.includes(result.detectedLanguage)) {
        result.detectedLanguage = 'en'; // Default to English
        result.confidence = 0.5;
      }

      result.supportedLanguages = this.supportedLanguages;

      this.logger.log(`Detected language: ${result.detectedLanguage} with confidence: ${result.confidence}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to detect language', error);
      // Return default English detection
      return {
        detectedLanguage: 'en',
        confidence: 0.5,
        supportedLanguages: this.supportedLanguages,
      };
    }
  }

  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<TranslationResult> {
    this.logger.log(`Translating text to ${targetLanguage}`);

    try {
      if (!this.supportedLanguages.includes(targetLanguage)) {
        throw new Error(`Unsupported target language: ${targetLanguage}`);
      }

      const sourceInfo = sourceLanguage ? `from ${this.languageNames[sourceLanguage] || sourceLanguage}` : '';
      const targetName = this.languageNames[targetLanguage] || targetLanguage;

      const prompt = `
Translate the following text ${sourceInfo} to ${targetName}:

Text: "${text}"

Provide a natural, contextually appropriate translation that maintains the original meaning and tone.
Respond in JSON format:
{
  "translatedText": "translated text here",
  "sourceLanguage": "detected_or_provided_source_language_code",
  "targetLanguage": "${targetLanguage}",
  "confidence": confidence_score_0_to_1
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Provide accurate, natural translations while maintaining context and tone. Always respond with valid JSON.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      
      this.logger.log(`Translated text from ${result.sourceLanguage} to ${result.targetLanguage}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to translate text', error);
      throw new Error('Failed to translate text');
    }
  }

  async localizeConfiguration(
    configuration: any,
    targetLanguage: string,
    configurationType: string,
  ): Promise<LocalizedConfigurationResult> {
    this.logger.log(`Localizing ${configurationType} configuration for ${targetLanguage}`);

    try {
      if (!this.supportedLanguages.includes(targetLanguage)) {
        throw new Error(`Unsupported target language: ${targetLanguage}`);
      }

      const targetName = this.languageNames[targetLanguage] || targetLanguage;

      const prompt = `
Localize the following ${configurationType} configuration for ${targetName} language and culture:

Configuration: ${JSON.stringify(configuration)}

Consider:
1. Translate all user-facing text (prompts, descriptions, labels)
2. Adapt cultural references and examples
3. Adjust tone and communication style for the target culture
4. Maintain technical functionality while localizing content

Respond in JSON format:
{
  "localizedConfig": {localized_configuration_object},
  "language": "${targetLanguage}",
  "culturalAdaptations": ["list", "of", "cultural", "adaptations", "made"],
  "localizedExplanation": "explanation of the localized configuration in the target language"
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a localization expert specializing in AI configurations. Provide culturally appropriate localizations while maintaining technical accuracy. Always respond with valid JSON.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2500,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      
      this.logger.log(`Localized configuration for ${targetLanguage} with ${result.culturalAdaptations?.length || 0} adaptations`);
      return result;
    } catch (error) {
      this.logger.error('Failed to localize configuration', error);
      throw new Error('Failed to localize configuration');
    }
  }

  async generateMultilingualPrompts(
    basePrompt: string,
    targetLanguages: string[],
  ): Promise<Record<string, string>> {
    this.logger.log(`Generating multilingual prompts for ${targetLanguages.length} languages`);

    try {
      const validLanguages = targetLanguages.filter(lang => this.supportedLanguages.includes(lang));
      
      if (validLanguages.length === 0) {
        throw new Error('No supported languages provided');
      }

      const results: Record<string, string> = {};

      // Process languages in batches to avoid token limits
      const batchSize = 3;
      for (let i = 0; i < validLanguages.length; i += batchSize) {
        const batch = validLanguages.slice(i, i + batchSize);
        const languageNames = batch.map(lang => this.languageNames[lang] || lang).join(', ');

        const prompt = `
Translate and culturally adapt the following AI agent prompt for these languages: ${languageNames}

Base Prompt: "${basePrompt}"

For each language, provide:
1. Accurate translation maintaining the original intent
2. Cultural adaptations for communication style
3. Appropriate examples and references for that culture

Respond in JSON format:
{
  ${batch.map(lang => `"${lang}": "translated and adapted prompt for ${this.languageNames[lang] || lang}"`).join(',\n  ')}
}
`;

        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a multilingual AI prompt specialist. Provide culturally appropriate translations that maintain the effectiveness of the original prompt.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const batchResults = JSON.parse(content);
          Object.assign(results, batchResults);
        }
      }

      this.logger.log(`Generated multilingual prompts for ${Object.keys(results).length} languages`);
      return results;
    } catch (error) {
      this.logger.error('Failed to generate multilingual prompts', error);
      throw new Error('Failed to generate multilingual prompts');
    }
  }

  async validateLanguageSupport(languageCode: string): Promise<boolean> {
    return this.supportedLanguages.includes(languageCode);
  }

  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return this.supportedLanguages.map(code => ({
      code,
      name: this.languageNames[code] || code,
    }));
  }

  async getCulturalGuidelines(languageCode: string): Promise<{
    communicationStyle: string;
    culturalNotes: string[];
    examples: string[];
  }> {
    this.logger.log(`Getting cultural guidelines for ${languageCode}`);

    try {
      if (!this.supportedLanguages.includes(languageCode)) {
        throw new Error(`Unsupported language: ${languageCode}`);
      }

      const languageName = this.languageNames[languageCode] || languageCode;

      const prompt = `
Provide cultural guidelines for AI interactions in ${languageName} (${languageCode}):

Include:
1. Communication style preferences
2. Cultural considerations for AI interactions
3. Examples of appropriate language and tone
4. Common cultural references and context

Respond in JSON format:
{
  "communicationStyle": "description of preferred communication style",
  "culturalNotes": ["important", "cultural", "considerations"],
  "examples": ["example", "phrases", "or", "approaches"]
}
`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a cultural communication expert. Provide practical guidelines for AI interactions across different cultures.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      
      this.logger.log(`Retrieved cultural guidelines for ${languageName}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to get cultural guidelines', error);
      throw new Error('Failed to get cultural guidelines');
    }
  }
}