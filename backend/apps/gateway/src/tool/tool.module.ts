import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tool, ToolExecution } from '@database/entities';
import { ToolController } from './tool.controller';
import { ToolService } from './tool.service';
import { ToolExecutionEngine } from './tool-execution.engine';
import { SessionModule } from '../session/session.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tool, ToolExecution]),
    SessionModule,
    WebsocketModule,
  ],
  controllers: [ToolController],
  providers: [ToolService, ToolExecutionEngine],
  exports: [ToolService, ToolExecutionEngine],
})
export class ToolModule {}
