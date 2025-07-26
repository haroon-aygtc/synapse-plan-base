import { Logger } from '@nestjs/common';

const logger = new Logger('ErrorGuards');

/**
 * Type guard to check if an error has a message property
 */
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Type guard to check if an error has a code property
 */
export function isErrorWithCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

/**
 * Type guard to check if an error has a status property
 */
export function isErrorWithStatus(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as Record<string, unknown>).status === 'number'
  );
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  logger.warn('Unable to extract error message from unknown error type', { error });
  return 'An unexpected error occurred';
}

/**
 * Safely extract error code from unknown error
 */
export function getErrorCode(error: unknown): string {
  if (isErrorWithCode(error)) {
    return error.code;
  }
  
  if (error instanceof Error && 'code' in error) {
    return (error as any).code;
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Safely extract error status from unknown error
 */
export function getErrorStatus(error: unknown): number {
  if (isErrorWithStatus(error)) {
    return error.status;
  }
  
  if (error instanceof Error && 'status' in error) {
    return (error as any).status;
  }
  
  return 500;
}

/**
 * Log error safely with proper type handling
 * Supports multiple argument patterns:
 * - logSafeError(error)
 * - logSafeError(error, context)
 * - logSafeError(logger, context, error)
 * - logSafeError(logger, error, context)
 */
export function logSafeError(...args: unknown[]): void {
  let error: unknown;
  let context: string | undefined;
  let customLogger: any = logger;

  // Parse arguments dynamically
  for (const arg of args) {
    if (arg instanceof Error || typeof arg === 'object' && arg !== null) {
      // This is likely the error object
      if (!error) {
        error = arg;
      }
    } else if (typeof arg === 'string') {
      // This is likely the context message
      if (!context) {
        context = arg;
      }
    } else if (arg && typeof arg === 'object' && 'error' in arg) {
      // This might be a logger object
      if (!customLogger || customLogger === logger) {
        customLogger = arg;
      }
    }
  }

  // If no error found, try to find it in the last argument
  if (!error && args.length > 0) {
    const lastArg = args[args.length - 1];
    if (lastArg instanceof Error || (typeof lastArg === 'object' && lastArg !== null)) {
      error = lastArg;
    }
  }

  // If still no error, create a generic one
  if (!error) {
    error = new Error('Unknown error occurred');
  }

  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  const status = getErrorStatus(error);
  
  // Use the custom logger if provided, otherwise use default logger
  if (customLogger && typeof customLogger.error === 'function') {
    customLogger.error(message, {
      errorCode: code,
      status,
      context,
      stack: error instanceof Error ? error.stack : undefined,
    });
  } else {
    logger.error(message, {
      errorCode: code,
      status,
      context,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: unknown, context?: string) {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  
  logSafeError(error, context);
  
  return {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create a standardized API error response with enhanced context
 */
export function createApiErrorResponse(
  error: unknown, 
  statusCode: number, 
  path: string, 
  method: string, 
  additionalData?: Record<string, any>
) {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  
  logSafeError(error, `API Error: ${method} ${path}`);
  
  return {
    success: false,
    error: {
      code,
      message,
      statusCode,
      path,
      method,
      timestamp: new Date().toISOString(),
      ...additionalData,
    },
  };
}


export function isRecoverableError(error: unknown): boolean {
  const errorMessage = getErrorMessage(error).toLowerCase();
  const recoverableErrors = ['timeout', 'rate_limit', 'network', 'temporary'];
  return recoverableErrors.some((type) => errorMessage.includes(type));
}

  export function safeErrorMessage(error: unknown): string {
    try {
      return getErrorMessage(error);
    } catch (error) {
      return 'An unexpected error occurred';
    }
  }

    export function getSafeErrorInfo(error: unknown): { 
      message: string; 
      code: string; 
      status: number; 
      name: string;
      stack?: string;
    } {
    try {
      return {
        message: getErrorMessage(error),
        code: getErrorCode(error),
        status: getErrorStatus(error),
        name: error instanceof Error ? error.name : 'UnknownError',
        stack: error instanceof Error ? error.stack : undefined,
      };
    } catch (error) {
      return {  
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        status: 500,
        name: 'UnknownError',
        stack: undefined,
      };
    }
  }


