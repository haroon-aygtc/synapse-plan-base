import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HITLController } from './hitl.controller';
import { HITLService } from './hitl.service';
import { HITLRequest, HITLComment, HITLVote, User } from '@database/entities';
import { WebsocketModule } from '../websocket/websocket.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HITLRequest, HITLComment, HITLVote, User]),
    WebsocketModule,
    NotificationModule,
  ],
  controllers: [HITLController],
  providers: [HITLService],
  exports: [HITLService],
})
export class HITLModule {}
