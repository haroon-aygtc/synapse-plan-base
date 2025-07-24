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
} from '@database/entities';
import { AgentModule } from '../agent/agent.module';
import { ToolModule } from '../tool/tool.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TestingSandbox,
      TestScenario,
      TestExecution,
      MockData,
      DebugSession,
    ]),
    AgentModule,
    ToolModule,
    WorkflowModule,
    WebSocketModule,
  ],
  controllers: [TestingSandboxController],
  providers: [TestingSandboxService],
  exports: [TestingSandboxService],
})
export class TestingSandboxModule {}
