import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;
  private context: string;

  constructor(
    private configService: ConfigService,
    context?: string
  ) {
    this.context = context || 'Application';
    this.logger = winston.createLogger(); // Initialize with a default logger
    this.createLogger();
  }

  private createLogger() {
    const logLevel = this.configService.get('LOG_LEVEL', 'info');
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    const serviceName = this.configService.get('SERVICE_NAME', 'synapseai');
    const serviceVersion = this.configService.get('SERVICE_VERSION', '1.0.0');

    const transports: winston.transport[] = [];

    // Console transport for development
    if (nodeEnv === 'development') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${context || this.context}] ${level}: ${message}${trace ? `\n${trace}` : ''}${metaStr ? `\n${metaStr}` : ''}`;
            })
          ),
        })
      );
    }

    // File transport for production
    if (nodeEnv === 'production') {
      transports.push(
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          ),
        }),
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          ),
        })
      );
    }

    // JSON transport for structured logging
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
          winston.format.printf((info) => {
            return JSON.stringify({
              ...info,
              service: serviceName,
              version: serviceVersion,
              environment: nodeEnv,
              context: info.context || this.context,
            });
          })
        ),
      })
    );

    this.logger = winston.createLogger({
      level: logLevel,
      transports,
      exitOnError: false,
    });
  }

  log(message: string, context?: string, meta?: any) {
    this.logger.info(message, { context: context || this.context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: any) {
    this.logger.error(message, {
      context: context || this.context,
      trace,
      ...meta,
    });
  }

  warn(message: string, context?: string, meta?: any) {
    this.logger.warn(message, { context: context || this.context, ...meta });
  }

  debug(message: string, context?: string, meta?: any) {
    this.logger.debug(message, { context: context || this.context, ...meta });
  }

  verbose(message: string, context?: string, meta?: any) {
    this.logger.verbose(message, { context: context || this.context, ...meta });
  }

  setContext(context: string) {
    this.context = context;
  }

  // Custom methods for structured logging
  logUserAction(userId: string, action: string, resource: string, meta?: any) {
    this.logger.info('User action performed', {
      context: 'UserAction',
      userId,
      action,
      resource,
      ...meta,
    });
  }

  logPerformance(operation: string, duration: number, meta?: any) {
    this.logger.info('Performance metric', {
      context: 'Performance',
      operation,
      duration,
      ...meta,
    });
  }

  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', meta?: any) {
    this.logger.warn('Security event', {
      context: 'Security',
      event,
      severity,
      ...meta,
    });
  }

  logBusinessMetric(metric: string, value: number, unit: string, meta?: any) {
    this.logger.info('Business metric', {
      context: 'BusinessMetric',
      metric,
      value,
      unit,
      ...meta,
    });
  }
}
