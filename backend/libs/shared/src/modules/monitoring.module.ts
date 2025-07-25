import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomLoggerService } from '../logger/logger.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { HealthService } from '../health/health.service';
import { MonitoringInterceptor } from '../interceptors/monitoring.interceptor';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    CustomLoggerService,
    MonitoringService,
    HealthService,
    MonitoringInterceptor,
  ],
  exports: [
    CustomLoggerService,
    MonitoringService,
    HealthService,
    MonitoringInterceptor,
  ],
})
export class MonitoringModule {}
