/**
 * Cloudron Error Classes
 * MVP scope: Base error + Auth error only
 */

/** Base error for all Cloudron API errors */
export class CloudronError extends Error {
  public readonly statusCode: number | undefined;
  public readonly code: string | undefined;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = 'CloudronError';
    this.statusCode = statusCode ?? undefined;
    this.code = code ?? undefined;

    // Maintains proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CloudronError);
    }
  }

  /**
   * Check if error is retryable (for future Phase 3)
   * 429 (rate limit) and 5xx errors are retryable
   * 4xx errors (except 429) are NOT retryable
   */
  isRetryable(): boolean {
    if (!this.statusCode) return false;
    return this.statusCode === 429 || this.statusCode >= 500;
  }
}

/** Authentication/Authorization error (401/403) */
export class CloudronAuthError extends CloudronError {
  constructor(
    message = 'Authentication failed. Check CLOUDRON_API_TOKEN.',
    statusCode = 401
  ) {
    super(message, statusCode, 'AUTH_ERROR');
    this.name = 'CloudronAuthError';
  }
}

/**
 * Type guard for CloudronError
 * Usage: if (isCloudronError(error)) { ... }
 */
export function isCloudronError(error: unknown): error is CloudronError {
  return error instanceof CloudronError;
}

/**
 * Create appropriate error from HTTP status code
 * Routes 401/403 to CloudronAuthError, others to CloudronError
 */
export function createErrorFromStatus(
  statusCode: number,
  message: string
): CloudronError {
  if (statusCode === 401 || statusCode === 403) {
    return new CloudronAuthError(message, statusCode);
  }
  return new CloudronError(message, statusCode);
}
