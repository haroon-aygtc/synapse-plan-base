import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MonitoringService } from '../monitoring/monitoring.service';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  constructor(
    private monitoringService: MonitoringService,
    private logger: CustomLoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';

    // Extract user information if available
    const userId = request.user?.id || 'anonymous';
    const organizationId = request.user?.organizationId || 'unknown';
    const userRole = request.user?.role || 'unknown';

    // Log request start
    this.logger.log(`Incoming ${method} request to ${url}`, 'HTTP', {
      method,
      url,
      ip,
      userAgent,
      userId,
      organizationId,
      userRole,
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Record API metrics
        this.monitoringService.recordApiRequest(
          method,
          url,
          statusCode,
          duration,
        );

        // Log successful request
        this.logger.log(`${method} ${url} completed successfully`, 'HTTP', {
          method,
          url,
          statusCode,
          duration,
          userId,
          organizationId,
          responseSize: JSON.stringify(data).length,
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode || 500;

        // Record API metrics for errors
        this.monitoringService.recordApiRequest(
          method,
          url,
          statusCode,
          duration,
        );

        // Record error
        this.monitoringService.recordError(error, 'HTTP_REQUEST', {
          method,
          url,
          statusCode,
          duration,
          userId,
          organizationId,
          userAgent,
          ip,
        });

        // Log error
        this.logger.error(
          `${method} ${url} failed with error: ${error.message}`,
          error.stack,
          'HTTP',
          {
            method,
            url,
            statusCode,
            duration,
            userId,
            organizationId,
            errorType: error.constructor.name,
          },
        );

        throw error;
      }),
    );
  }
}
