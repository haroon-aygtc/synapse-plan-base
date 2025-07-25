import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Agent, PromptTemplate } from '@database/entities';
import { AIAssistantController } from './ai-assistant.controller';
import { AIAssistantService } from './ai-assistant.service';
import { NaturalLanguageProcessorService } from './services/natural-language-processor.service';
import { MultiLanguageSupportService } from './services/multi-language-support.service';
import { LearningSystemService } from './services/learning-system.service';
import { VisualBuilderService } from './services/visual-builder.service';
import { APIPatternDetectionService } from './services/api-pattern-detection.service';
import { AIProviderModule } from '../ai-provider/ai-provider.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, PromptTemplate]),
    HttpModule,
    AIProviderModule,
  ],
  controllers: [AIAssistantController],
  providers: [
    AIAssistantService, 
    NaturalLanguageProcessorService,
    MultiLanguageSupportService,
    LearningSystemService,
    VisualBuilderService,
    APIPatternDetectionService,
  ],
  exports: [
    AIAssistantService, 
    NaturalLanguageProcessorService,
    MultiLanguageSupportService,
    LearningSystemService,
    VisualBuilderService,
    APIPatternDetectionService,
  ],
})
export class AIAssistantModule {}