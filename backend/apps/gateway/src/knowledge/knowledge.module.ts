import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeDocument, KnowledgeSearch } from '@database/entities';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { DocumentProcessingService } from './document-processing.service';
import { VectorSearchService } from './vector-search.service';
import { SessionModule } from '../session/session.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeDocument, KnowledgeSearch]),
    SessionModule,
    WebsocketModule,
  ],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    DocumentProcessingService,
    VectorSearchService,
  ],
  exports: [
    KnowledgeService,
    DocumentProcessingService,
    VectorSearchService,
  ],
})
export class KnowledgeModule {}
