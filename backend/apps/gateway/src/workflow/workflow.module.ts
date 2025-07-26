import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workflow, WorkflowExecution } from '@database/entities';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutionEngine } from './workflow-execution.engine';
import { SessionModule } from '../session/session.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { AgentModule } from '../agent/agent.module';
import { ToolModule } from '../tool/tool.module';
import { HITLModule } from '../hitl/hitl.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow, WorkflowExecution]),
    SessionModule,
    WebsocketModule,
    AgentModule,
    ToolModule,
    HITLModule,
    SessionModule,
  ],
  controllers: [WorkflowController],
  providers: [WorkflowService, WorkflowExecutionEngine],
  exports: [WorkflowService, WorkflowExecutionEngine],
})
export class WorkflowModule {}
