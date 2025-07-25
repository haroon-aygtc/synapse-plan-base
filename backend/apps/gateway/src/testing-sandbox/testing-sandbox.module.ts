import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestingSandboxController } from './testing-sandbox.controller';
import { TestingSandboxService } from './testing-sandbox.service';
import {
  TestingSandbox,
  TestScenario,
  TestExecution,
  MockData,
  DebugSession,
  SandboxRun,
  SandboxEvent,
} from '@database/entities';
import { AgentModule } from '../agent/agent.module';
import { ToolModule } from '../tool/tool.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { SessionModule } from '../session/session.module';
import { AIProviderModule } from '../ai-provider/ai-provider.module';
import { PromptTemplateModule } from '../prompt-template/prompt-template.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestingSandbox,
      TestScenario,
      TestExecution,
      MockData,
      DebugSession,
      SandboxRun,
      SandboxEvent,
    ]),
    AgentModule,
    ToolModule,
    WorkflowModule,
    WebSocketModule,
    SessionModule,
    AIProviderModule,
    PromptTemplateModule,
  ],
  controllers: [TestingSandboxController],
  providers: [TestingSandboxService],
  exports: [TestingSandboxService],
})
export class TestingSandboxModule {}
