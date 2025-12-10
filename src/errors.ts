/**
 * Cloudron MCP Server Error Handling
 * Custom error classes and MCP error mapping utilities
 */

/**
 * Base error class for all Cloudron-related errors
 */
export class CloudronError extends Error {
  /**
   * Creates a CloudronError
   * @param message - Error description
   * @param statusCode - HTTP status code (if applicable)
   * @param context - Additional error context for debugging
   */
  constructor(
    message: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CloudronError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * Error for authentication failures (401)
 */
export class CloudronAuthError extends CloudronError {
  constructor(
    message: string = 'Authentication failed',
    context?: Record<string, unknown>
  ) {
    super(message, 401, context);
    this.name = 'CloudronAuthError';
  }
}

/**
 * Error for permission denied (403)
 */
export class CloudronPermissionError extends CloudronError {
  constructor(
    message: string = 'Permission denied',
    context?: Record<string, unknown>
  ) {
    super(message, 403, context);
    this.name = 'CloudronPermissionError';
  }
}

/**
 * Error for resource not found (404)
 */
export class CloudronNotFoundError extends CloudronError {
  constructor(
    message: string = 'Resource not found',
    context?: Record<string, unknown>
  ) {
    super(message, 404, context);
    this.name = 'CloudronNotFoundError';
  }
}

/**
 * Error for API errors and other issues
 */
export class CloudronAPIError extends CloudronError {
  constructor(
    message: string = 'API error',
    statusCode: number = 500,
    context?: Record<string, unknown>
  ) {
    super(message, statusCode, context);
    this.name = 'CloudronAPIError';
  }
}

/**
 * Error for rate limiting (429)
 */
export class CloudronRateLimitError extends CloudronError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter?: number,
    context?: Record<string, unknown>
  ) {
    super(message, 429, context);
    this.name = 'CloudronRateLimitError';
  }
}

/**
 * Error for configuration issues
 */
export class CloudronConfigError extends CloudronError {
  constructor(
    message: string = 'Configuration error',
    context?: Record<string, unknown>
  ) {
    super(message, 400, context);
    this.name = 'CloudronConfigError';
  }
}

/**
 * Maps Cloudron error responses to appropriate error classes
 * @param statusCode - HTTP status code from Cloudron API
 * @param message - Error message from Cloudron API or network error
 * @param data - Full response data (if available)
 * @returns Appropriate CloudronError subclass instance
 */
export function createCloudronError(
  statusCode: number,
  message: string,
  data?: Record<string, unknown>
): CloudronError {
  const context = { statusCode, ...data };

  switch (statusCode) {
    case 401:
      return new CloudronAuthError(
        'Authentication failed. Check CLOUDRON_API_TOKEN.',
        context
      );
    case 403:
      return new CloudronPermissionError(
        `Permission denied: ${message}`,
        context
      );
    case 404:
      return new CloudronNotFoundError(`Not found: ${message}`, context);
    case 429:
      const retryAfter = data?.retryAfter as number | undefined;
      return new CloudronRateLimitError(
        'Rate limit exceeded. Please retry after a delay.',
        retryAfter,
        context
      );
    default:
      return new CloudronAPIError(
        `API error (${statusCode}): ${message}`,
        statusCode,
        context
      );
  }
}

/**
 * Converts CloudronError to MCP-compatible error response
 * Ensures no sensitive information (tokens, internal paths) leaks
 * @param error - The error to convert
 * @returns Safe error message for MCP response
 */
export function toMCPErrorMessage(error: unknown): string {
  if (error instanceof CloudronAuthError) {
    return 'Authentication failed. Check CLOUDRON_API_TOKEN environment variable.';
  }

  if (error instanceof CloudronPermissionError) {
    return 'Permission denied. The API token lacks required permissions.';
  }

  if (error instanceof CloudronNotFoundError) {
    return 'Resource not found on the Cloudron instance.';
  }

  if (error instanceof CloudronRateLimitError) {
    return `Rate limit exceeded. Please retry after ${error.retryAfter || 60} seconds.`;
  }

  if (error instanceof CloudronError) {
    return `Cloudron error: ${error.message}`;
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return 'An unknown error occurred';
}
