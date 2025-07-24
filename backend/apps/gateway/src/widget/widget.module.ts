import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WidgetController } from './widget.controller';
import { WidgetService } from './widget.service';
import { Widget } from '@database/entities/widget.entity';
import { WidgetExecution } from '@database/entities/widget-execution.entity';
import { WidgetAnalytics } from '@database/entities/widget-analytics.entity';
import { Agent } from '@database/entities/agent.entity';
import { Tool } from '@database/entities/tool.entity';
import { Workflow } from '@database/entities/workflow.entity';
import { User } from '@database/entities/user.entity';
import { Organization } from '@database/entities/organization.entity';
import { Session } from '@database/entities/session.entity';
import { AgentService } from '../agent/agent.service';
import { ToolService } from '../tool/tool.service';
import { WorkflowService } from '../workflow/workflow.service';
import { SessionService } from '../session/session.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Widget,
      WidgetExecution,
      WidgetAnalytics,
      Agent,
      Tool,
      Workflow,
      User,
      Organization,
      Session,
    ]),
    BullModule.registerQueue({
      name: 'widget-processing',
    }),
    WebsocketModule,
  ],
  controllers: [WidgetController],
  providers: [
    WidgetService,
    AgentService,
    ToolService,
    WorkflowService,
    SessionService,
  ],
  exports: [WidgetService],
})
export class WidgetModule {}
