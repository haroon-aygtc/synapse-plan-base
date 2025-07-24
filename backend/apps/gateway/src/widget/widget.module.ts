import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WidgetController } from './widget.controller';
import { WidgetService } from './widget.service';
import { Widget } from '@libs/database/entities/widget.entity';
import { WidgetExecution } from '@libs/database/entities/widget-execution.entity';
import { WidgetAnalytics } from '@libs/database/entities/widget-analytics.entity';
import { Agent } from '@libs/database/entities/agent.entity';
import { Tool } from '@libs/database/entities/tool.entity';
import { Workflow } from '@libs/database/entities/workflow.entity';
import { User } from '@libs/database/entities/user.entity';
import { Organization } from '@libs/database/entities/organization.entity';
import { Session } from '@libs/database/entities/session.entity';
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
