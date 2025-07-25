import { ConfigService } from '@nestjs/config';

export function initializeDatadog(configService: ConfigService) {
  const datadogEnabled =
    configService.get('DATADOG_ENABLED', 'false') === 'true';
  const datadogApiKey = configService.get('DATADOG_API_KEY');
  const serviceName = configService.get('SERVICE_NAME', 'synapseai');
  const environment = configService.get('NODE_ENV', 'development');
  const serviceVersion = configService.get('SERVICE_VERSION', '1.0.0');

  if (!datadogEnabled) {
    console.log('DataDog monitoring is disabled');
    return;
  }

  if (!datadogApiKey) {
    console.warn('DataDog API key not provided, monitoring will be limited');
  }

  try {
    // Initialize DataDog tracer
    const tracer = require('dd-trace').init({
      service: serviceName,
      env: environment,
      version: serviceVersion,
      logInjection: true,
      runtimeMetrics: true,
      profiling: environment === 'production',
      appsec: environment === 'production',
      plugins: {
        // Enable automatic instrumentation for common libraries
        http: true,
        https: true,
        express: true,
        postgres: true,
        redis: true,
        ioredis: true,
      },
      tags: {
        service: serviceName,
        env: environment,
        version: serviceVersion,
      },
    });

    // Make tracer globally available
    global.ddTrace = tracer;

    console.log(`DataDog monitoring initialized for service: ${serviceName}`);
  } catch (error) {
    console.error('Failed to initialize DataDog:', error instanceof Error ? error.message : String(error));
  }
}

// Health check function for DataDog
export function checkDatadogHealth(): boolean {
  try {
    return !!global.ddTrace && typeof global.ddTrace.tracer === 'object';
  } catch (error) {
    return false;
  }
}

// Custom DataDog middleware for Express
export function datadogMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Add custom tags to the current span
    if (global.ddTrace && global.ddTrace.tracer.scope().active()) {
      const span = global.ddTrace.tracer.scope().active();
      span.setTag('http.user_agent', req.get('User-Agent') || 'unknown');
      span.setTag('http.remote_addr', req.ip || req.connection.remoteAddress);

      // Add user context if available
      if (req.user) {
        span.setTag('user.id', req.user.id);
        span.setTag('user.organization_id', req.user.organizationId);
        span.setTag('user.role', req.user.role);
      }
    }

    // Track response time
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      if (global.ddTrace && global.ddTrace.dogstatsd) {
        global.ddTrace.dogstatsd.histogram('http.request.duration', duration, {
          method: req.method,
          status_code: res.statusCode.toString(),
          endpoint: req.route?.path || req.path,
        });
      }
    });

    next();
  };
}

// Declare global type for TypeScript
declare global {
  var ddTrace: any;
}
