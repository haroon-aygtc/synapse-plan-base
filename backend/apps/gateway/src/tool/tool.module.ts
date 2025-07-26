import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Tool, ToolExecution, Agent, Workflow, ToolTemplate } from '@database/entities';
import { ToolController } from './tool.controller';
import { ToolService } from './tool.service';
import { ToolExecutionEngine } from './tool-execution.engine';
import { ToolTemplateService } from './tool-template.service';
import { ToolMarketplaceService } from './tool-marketplace.service';
import { SessionModule } from '../session/session.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { HITLModule } from '../hitl/hitl.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tool, ToolExecution, Agent, Workflow, ToolTemplate]),
    HttpModule,
    SessionModule,
    WebsocketModule,
    AIProviderModule,
    HITLModule,
  ],
  controllers: [ToolController],
  providers: [ToolService, ToolExecutionEngine, ToolTemplateService, ToolMarketplaceService],
  exports: [ToolService, ToolExecutionEngine, ToolTemplateService, ToolMarketplaceService],
})
export class ToolModule {}
