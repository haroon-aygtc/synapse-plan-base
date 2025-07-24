import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Agent,
  AgentExecution,
  AgentTestResult,
  PromptTemplate,
} from '@database/entities';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentExecutionEngine } from './agent-execution.engine';
import { SessionModule } from '../session/session.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { ToolModule } from '../tool/tool.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PromptTemplateModule } from '../prompt-template/prompt-template.module';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { HITLModule } from '../hitl/hitl.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Agent,
      AgentExecution,
      AgentTestResult,
      PromptTemplate,
    ]),
    SessionModule,
    WebsocketModule,
    ToolModule,
    KnowledgeModule,
    PromptTemplateModule,
    AIProviderModule,
    HITLModule,
  ],
  controllers: [AgentController],
  providers: [AgentService, AgentExecutionEngine],
  exports: [AgentService, AgentExecutionEngine],
})
export class AgentModule {}
