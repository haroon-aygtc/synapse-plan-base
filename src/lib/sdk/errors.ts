/**
 * SynapseAI SDK Error Classes
 */

/**
 * Base SDK Error class
 */
export class SDKError extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    code: string,
    message: string,
    details?: any,
    requestId?: string,
  ) {
    super(message);
    this.name = "SDKError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = requestId;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SDKError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
      stack: this.stack,
    };
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends SDKError {
  constructor(message: string, details?: any, requestId?: string) {
    super("AUTHENTICATION_ERROR", message, details, requestId);
    this.name = "AuthenticationError";
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends SDKError {
  constructor(message: string, details?: any, requestId?: string) {
    super("AUTHORIZATION_ERROR", message, details, requestId);
    this.name = "AuthorizationError";
  }
}

/**
 * Validation Error
 */
export class ValidationError extends SDKError {
  public readonly field?: string;
  public readonly expectedFormat?: string;
  public readonly receivedValue?: any;

  constructor(
    message: string,
    field?: string,
    expectedFormat?: string,
    receivedValue?: any,
    requestId?: string,
  ) {
    super(
      "VALIDATION_ERROR",
      message,
      { field, expectedFormat, receivedValue },
      requestId,
    );
    this.name = "ValidationError";
    this.field = field;
    this.expectedFormat = expectedFormat;
    this.receivedValue = receivedValue;
  }
}

/**
 * Network Error
 */
export class NetworkError extends SDKError {
  public readonly statusCode?: number;
  public readonly response?: any;

  constructor(
    message: string,
    statusCode?: number,
    response?: any,
    requestId?: string,
  ) {
    super("NETWORK_ERROR", message, { statusCode, response }, requestId);
    this.name = "NetworkError";
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends SDKError {
  public readonly retryAfter?: number;
  public readonly limit?: number;
  public readonly remaining?: number;
  public readonly resetTime?: Date;

  constructor(
    message: string,
    retryAfter?: number,
    limit?: number,
    remaining?: number,
    resetTime?: Date,
    requestId?: string,
  ) {
    super(
      "RATE_LIMIT_ERROR",
      message,
      { retryAfter, limit, remaining, resetTime },
      requestId,
    );
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.remaining = remaining;
    this.resetTime = resetTime;
  }
}

/**
 * Timeout Error
 */
export class TimeoutError extends SDKError {
  public readonly timeout: number;

  constructor(message: string, timeout: number, requestId?: string) {
    super("TIMEOUT_ERROR", message, { timeout }, requestId);
    this.name = "TimeoutError";
    this.timeout = timeout;
  }
}

/**
 * Connection Error
 */
export class ConnectionError extends SDKError {
  public readonly reason?: string;

  constructor(message: string, reason?: string, requestId?: string) {
    super("CONNECTION_ERROR", message, { reason }, requestId);
    this.name = "ConnectionError";
    this.reason = reason;
  }
}

/**
 * Configuration Error
 */
export class ConfigurationError extends SDKError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(message: string, field?: string, value?: any) {
    super("CONFIGURATION_ERROR", message, { field, value });
    this.name = "ConfigurationError";
    this.field = field;
    this.value = value;
  }
}

/**
 * Resource Not Found Error
 */
export class NotFoundError extends SDKError {
  public readonly resourceType?: string;
  public readonly resourceId?: string;

  constructor(
    message: string,
    resourceType?: string,
    resourceId?: string,
    requestId?: string,
  ) {
    super("NOT_FOUND_ERROR", message, { resourceType, resourceId }, requestId);
    this.name = "NotFoundError";
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends SDKError {
  public readonly conflictingResource?: string;

  constructor(
    message: string,
    conflictingResource?: string,
    requestId?: string,
  ) {
    super("CONFLICT_ERROR", message, { conflictingResource }, requestId);
    this.name = "ConflictError";
    this.conflictingResource = conflictingResource;
  }
}

/**
 * Execution Error
 */
export class ExecutionError extends SDKError {
  public readonly executionId?: string;
  public readonly step?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    executionId?: string,
    step?: string,
    retryable: boolean = false,
    requestId?: string,
  ) {
    super(
      "EXECUTION_ERROR",
      message,
      { executionId, step, retryable },
      requestId,
    );
    this.name = "ExecutionError";
    this.executionId = executionId;
    this.step = step;
    this.retryable = retryable;
  }
}

/**
 * Quota Exceeded Error
 */
export class QuotaExceededError extends SDKError {
  public readonly quotaType: string;
  public readonly limit: number;
  public readonly used: number;
  public readonly resetTime?: Date;

  constructor(
    message: string,
    quotaType: string,
    limit: number,
    used: number,
    resetTime?: Date,
    requestId?: string,
  ) {
    super(
      "QUOTA_EXCEEDED_ERROR",
      message,
      { quotaType, limit, used, resetTime },
      requestId,
    );
    this.name = "QuotaExceededError";
    this.quotaType = quotaType;
    this.limit = limit;
    this.used = used;
    this.resetTime = resetTime;
  }
}

/**
 * Provider Error
 */
export class ProviderError extends SDKError {
  public readonly provider: string;
  public readonly providerCode?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    provider: string,
    providerCode?: string,
    retryable: boolean = false,
    requestId?: string,
  ) {
    super(
      "PROVIDER_ERROR",
      message,
      { provider, providerCode, retryable },
      requestId,
    );
    this.name = "ProviderError";
    this.provider = provider;
    this.providerCode = providerCode;
    this.retryable = retryable;
  }
}

/**
 * Error factory function
 */
export function createError(
  type: string,
  message: string,
  details?: any,
  requestId?: string,
): SDKError {
  switch (type) {
    case "AUTHENTICATION_ERROR":
      return new AuthenticationError(message, details, requestId);
    case "AUTHORIZATION_ERROR":
      return new AuthorizationError(message, details, requestId);
    case "VALIDATION_ERROR":
      return new ValidationError(
        message,
        details?.field,
        details?.expectedFormat,
        details?.receivedValue,
        requestId,
      );
    case "NETWORK_ERROR":
      return new NetworkError(
        message,
        details?.statusCode,
        details?.response,
        requestId,
      );
    case "RATE_LIMIT_ERROR":
      return new RateLimitError(
        message,
        details?.retryAfter,
        details?.limit,
        details?.remaining,
        details?.resetTime,
        requestId,
      );
    case "TIMEOUT_ERROR":
      return new TimeoutError(message, details?.timeout, requestId);
    case "CONNECTION_ERROR":
      return new ConnectionError(message, details?.reason, requestId);
    case "CONFIGURATION_ERROR":
      return new ConfigurationError(message, details?.field, details?.value);
    case "NOT_FOUND_ERROR":
      return new NotFoundError(
        message,
        details?.resourceType,
        details?.resourceId,
        requestId,
      );
    case "CONFLICT_ERROR":
      return new ConflictError(
        message,
        details?.conflictingResource,
        requestId,
      );
    case "EXECUTION_ERROR":
      return new ExecutionError(
        message,
        details?.executionId,
        details?.step,
        details?.retryable,
        requestId,
      );
    case "QUOTA_EXCEEDED_ERROR":
      return new QuotaExceededError(
        message,
        details?.quotaType,
        details?.limit,
        details?.used,
        details?.resetTime,
        requestId,
      );
    case "PROVIDER_ERROR":
      return new ProviderError(
        message,
        details?.provider,
        details?.providerCode,
        details?.retryable,
        requestId,
      );
    default:
      return new SDKError(type, message, details, requestId);
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof NetworkError) {
    return error.statusCode ? error.statusCode >= 500 : true;
  }

  if (error instanceof TimeoutError) {
    return true;
  }

  if (error instanceof ConnectionError) {
    return true;
  }

  if (error instanceof ExecutionError) {
    return error.retryable;
  }

  if (error instanceof ProviderError) {
    return error.retryable;
  }

  return false;
}

/**
 * Get retry delay for error
 */
export function getRetryDelay(error: Error, attempt: number): number {
  if (error instanceof RateLimitError && error.retryAfter) {
    return error.retryAfter * 1000; // Convert to milliseconds
  }

  // Exponential backoff with jitter
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 0.1 * delay; // 10% jitter

  return delay + jitter;
}
