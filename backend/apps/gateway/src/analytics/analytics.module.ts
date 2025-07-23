import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AgentExecution,
  ToolExecution,
  WorkflowExecution,
  KnowledgeSearch,
  EventLog,
  Organization,
  User,
} from '@database/entities';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgentExecution,
      ToolExecution,
      WorkflowExecution,
      KnowledgeSearch,
      EventLog,
      Organization,
      User,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
