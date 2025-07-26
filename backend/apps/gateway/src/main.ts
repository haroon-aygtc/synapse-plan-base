import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import * as morgan from 'morgan';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';
import { GatewayModule } from './gateway.module';
import { AllExceptionsFilter } from '@shared/filters';
import { ResponseInterceptor, MonitoringInterceptor } from '@shared/interceptors';
import { CustomLoggerService, initializeDatadog, datadogMiddleware } from '@shared/index';

async function bootstrap() {
  // Initialize DataDog before creating the app
  const tempConfigService = new ConfigService();
  initializeDatadog(tempConfigService);

  const app = await NestFactory.create(GatewayModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const customLogger = app.get(CustomLoggerService);
  const logger = new Logger('Gateway');

  // Use custom logger
  app.useLogger(customLogger);

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(compression());
  app.use(cookieParser());

  // CSRF Protection (only for non-API routes)
  const csrfProtection = csurf({
    cookie: {
      httpOnly: true,
      secure: configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
    },
  });

  // Apply CSRF protection to specific routes
  app.use('/api/auth/csrf-token', csrfProtection);

  // DataDog middleware
  app.use(datadogMiddleware());

  // Logging
  if (configService.get('NODE_ENV') !== 'test') {
    app.use(
      morgan('combined', {
        stream: {
          write: (message: string) => {
            customLogger.log(message.trim(), 'HTTP');
          },
        },
      })
    );
  }

  // CORS
  app.enableCors({
    origin: configService.get('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor(), app.get(MonitoringInterceptor));

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SynapseAI API')
      .setDescription('Unified AI Orchestration Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get('PORT', 3001);
  await app.listen(port);

  // Log startup information
  const serviceName = configService.get('SERVICE_NAME', 'synapseai-gateway');
  const environment = configService.get('NODE_ENV', 'development');
  const datadogEnabled = configService.get('DATADOG_ENABLED', 'false') === 'true';

  customLogger.log(`🚀 ${serviceName} is running on: http://localhost:${port}`, 'Bootstrap');
  customLogger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`, 'Bootstrap');
  customLogger.log(`🌍 Environment: ${environment}`, 'Bootstrap');
  customLogger.log(
    `📊 DataDog monitoring: ${datadogEnabled ? 'enabled' : 'disabled'}`,
    'Bootstrap'
  );

  // Log system information
  customLogger.log('System startup completed', 'Bootstrap', {
    service: serviceName,
    environment,
    port,
    datadogEnabled,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start gateway:', error);
  process.exit(1);
});
