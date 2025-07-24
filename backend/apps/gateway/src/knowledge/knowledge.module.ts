import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import {
  KnowledgeDocument,
  KnowledgeDocumentChunk,
  KnowledgeDocumentVersion,
  KnowledgeSearch,
  KnowledgeSearchFeedback,
  KnowledgeAnalytics,
} from '@database/entities';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { DocumentProcessingService } from './document-processing.service';
import { VectorSearchService } from './vector-search.service';
import { KnowledgeAnalyticsService } from './knowledge-analytics.service';
import { DocumentParsingService } from './document-parsing.service';
import { KnowledgeSecurityService } from './knowledge-security.service';
import { SessionModule } from '../session/session.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeDocument,
      KnowledgeDocumentChunk,
      KnowledgeDocumentVersion,
      KnowledgeSearch,
      KnowledgeSearchFeedback,
      KnowledgeAnalytics,
    ]),
    BullModule.registerQueue({
      name: 'document-processing',
    }),
    HttpModule,
    SessionModule,
    WebsocketModule,
  ],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    DocumentProcessingService,
    VectorSearchService,
    KnowledgeAnalyticsService,
    DocumentParsingService,
    KnowledgeSecurityService,
  ],
  exports: [
    KnowledgeService,
    DocumentProcessingService,
    VectorSearchService,
    KnowledgeAnalyticsService,
    DocumentParsingService,
    KnowledgeSecurityService,
  ],
})
export class KnowledgeModule {}
