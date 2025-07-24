import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tool, ToolExecution, Agent, Workflow } from '@database/entities';
import { ToolController } from './tool.controller';
import { ToolService } from './tool.service';
import { ToolExecutionEngine } from './tool-execution.engine';
import { SessionModule } from '../session/session.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { HITLModule } from '../hitl/hitl.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tool, ToolExecution, Agent, Workflow]),
    SessionModule,
    WebsocketModule,
    AIProviderModule,
    HITLModule,
  ],
  controllers: [ToolController],
  providers: [ToolService, ToolExecutionEngine],
  exports: [ToolService, ToolExecutionEngine],
})
export class ToolModule {}
