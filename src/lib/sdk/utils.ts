/**
 * SynapseAI SDK Utility Functions
 */

import { SynapseAIConfig, SDKError } from "./types";
import { ConfigurationError, NetworkError, ValidationError } from "./errors";

/**
 * Validate SDK configuration
 */
export function validateConfig(config: Required<SynapseAIConfig>): void {
  if (!config.baseURL) {
    throw new ConfigurationError(
      "baseURL is required",
      "baseURL",
      config.baseURL,
    );
  }

  if (!config.wsURL) {
    throw new ConfigurationError("wsURL is required", "wsURL", config.wsURL);
  }

  if (!config.apiKey) {
    throw new ConfigurationError("apiKey is required", "apiKey", "[REDACTED]");
  }

  if (!isValidURL(config.baseURL)) {
    throw new ConfigurationError(
      "baseURL must be a valid URL",
      "baseURL",
      config.baseURL,
    );
  }

  if (!isValidURL(config.wsURL)) {
    throw new ConfigurationError(
      "wsURL must be a valid URL",
      "wsURL",
      config.wsURL,
    );
  }

  if (config.timeout < 1000) {
    throw new ConfigurationError(
      "timeout must be at least 1000ms",
      "timeout",
      config.timeout,
    );
  }

  if (config.retryAttempts < 0 || config.retryAttempts > 10) {
    throw new ConfigurationError(
      "retryAttempts must be between 0 and 10",
      "retryAttempts",
      config.retryAttempts,
    );
  }

  if (config.retryDelay < 100) {
    throw new ConfigurationError(
      "retryDelay must be at least 100ms",
      "retryDelay",
      config.retryDelay,
    );
  }

  if (config.cacheSize < 10 || config.cacheSize > 10000) {
    throw new ConfigurationError(
      "cacheSize must be between 10 and 10000",
      "cacheSize",
      config.cacheSize,
    );
  }
}

/**
 * Check if string is a valid URL
 */
export function isValidURL(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create HTTP headers for requests
 */
export function createHeaders(
  apiKey: string,
  additionalHeaders: Record<string, string> = {},
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "User-Agent": `SynapseAI-SDK/1.0.0`,
    "X-SDK-Version": "1.0.0",
    ...additionalHeaders,
  };
}

/**
 * Handle API errors and convert to SDK errors
 */
export function handleAPIError(error: Error): SDKError {
  if (error.name === "AbortError") {
    return new NetworkError("Request timeout", 408);
  }

  if (error.message.includes("Failed to fetch")) {
    return new NetworkError("Network connection failed");
  }

  if (error.message.includes("HTTP 401")) {
    return new NetworkError("Unauthorized", 401);
  }

  if (error.message.includes("HTTP 403")) {
    return new NetworkError("Forbidden", 403);
  }

  if (error.message.includes("HTTP 404")) {
    return new NetworkError("Not Found", 404);
  }

  if (error.message.includes("HTTP 429")) {
    return new NetworkError("Rate Limited", 429);
  }

  if (error.message.includes("HTTP 5")) {
    const statusMatch = error.message.match(/HTTP (\d+)/);
    const status = statusMatch ? parseInt(statusMatch[1]) : 500;
    return new NetworkError("Server Error", status);
  }

  return new NetworkError(error.message);
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique execution ID
 */
export function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique session ID
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    delay?: number;
    backoff?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {},
): Promise<T> {
  const {
    attempts = 3,
    delay = 1000,
    backoff = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === attempts || !shouldRetry(lastError)) {
        throw lastError;
      }

      const waitTime = delay * Math.pow(backoff, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
}

/**
 * Simple LRU Cache implementation
 */
export class LRUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, V>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private requests: number[] = [];
  private limit: number;
  private window: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.window = windowMs;
  }

  isAllowed(): boolean {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.window);

    if (this.requests.length < this.limit) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  getTimeUntilReset(): number {
    if (this.requests.length === 0) {
      return 0;
    }

    const oldestRequest = Math.min(...this.requests);
    const timeUntilReset = this.window - (Date.now() - oldestRequest);

    return Math.max(0, timeUntilReset);
  }

  getRemainingRequests(): number {
    const now = Date.now();
    const recentRequests = this.requests.filter(
      (time) => now - time < this.window,
    );
    return Math.max(0, this.limit - recentRequests.length);
  }
}

/**
 * Environment detection utilities
 */
export const Environment = {
  isBrowser: typeof window !== "undefined",
  isNode: typeof process !== "undefined" && process.versions?.node,
  isWebWorker: typeof importScripts === "function",
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
};

/**
 * Safe JSON parsing
 */
export function safeJsonParse<T = any>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Safe JSON stringifying
 */
export function safeJsonStringify(obj: any, fallback: string = "{}"): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
}

/**
 * Create a promise that resolves after a delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a promise that rejects after a timeout
 */
export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Operation timed out")), ms);
    }),
  ]);
}
