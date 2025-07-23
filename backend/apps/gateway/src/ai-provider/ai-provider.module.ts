import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIProvider, AIProviderExecution, AIProviderMetrics } from '@database/entities';
import { AIProviderController } from './ai-provider.controller';
import { AIProviderService } from './ai-provider.service';
import { ProviderAdapterService } from './provider-adapter.service';
import { ProviderRoutingService } from './provider-routing.service';
import { ProviderHealthService } from './provider-health.service';
import { ProviderCostService } from './provider-cost.service';
import { SessionModule } from '../session/session.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIProvider, AIProviderExecution, AIProviderMetrics]),
    SessionModule,
    WebsocketModule,
  ],
  controllers: [AIProviderController],
  providers: [
    AIProviderService,
    ProviderAdapterService,
    ProviderRoutingService,
    ProviderHealthService,
    ProviderCostService,
  ],
  exports: [
    AIProviderService,
    ProviderAdapterService,
    ProviderRoutingService,
    ProviderHealthService,
    ProviderCostService,
  ],
})
export class AIProviderModule {}
