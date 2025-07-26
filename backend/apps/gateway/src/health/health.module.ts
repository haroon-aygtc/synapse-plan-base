import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthService } from '@shared/health/health.service';
import { CustomLoggerService } from '@shared/logger/logger.service';
import { MonitoringService } from '@shared/monitoring/monitoring.service';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      provide: CustomLoggerService,
      useFactory: (configService: ConfigService) => {
        return new CustomLoggerService(configService, 'HealthModule');
      },
      inject: [ConfigService],
    },
    MonitoringService,
  ],
  exports: [HealthService],
})
export class HealthModule {}
