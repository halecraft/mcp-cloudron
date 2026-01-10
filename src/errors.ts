/**
 * Cloudron Error Classes
 * Base error, auth error, and error utilities for API responses
 */

/** Options for CloudronError constructor */
export interface CloudronErrorOptions {
  statusCode?: number
  code?: string
  cause?: unknown
}

/** Base error for all Cloudron API errors */
export class CloudronError extends Error {
  public readonly statusCode: number | undefined
  public readonly code: string | undefined
  public override readonly cause: unknown

  constructor(message: string, options?: CloudronErrorOptions)
  /** @deprecated Use options object instead */
  constructor(message: string, statusCode?: number, code?: string)
  constructor(
    message: string,
    statusCodeOrOptions?: number | CloudronErrorOptions,
    code?: string,
  ) {
    // Handle both old and new constructor signatures
    let resolvedStatusCode: number | undefined
    let resolvedCode: string | undefined
    let resolvedCause: unknown

    if (typeof statusCodeOrOptions === "object") {
      resolvedStatusCode = statusCodeOrOptions.statusCode
      resolvedCode = statusCodeOrOptions.code
      resolvedCause = statusCodeOrOptions.cause
    } else {
      resolvedStatusCode = statusCodeOrOptions
      resolvedCode = code
      resolvedCause = undefined
    }

    super(message, { cause: resolvedCause })
    this.name = "CloudronError"
    this.statusCode = resolvedStatusCode
    this.code = resolvedCode
    this.cause = resolvedCause

    // Maintains proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CloudronError)
    }
  }

  /**
   * Check if error is retryable (for future Phase 3)
   * 429 (rate limit) and 5xx errors are retryable
   * 4xx errors (except 429) are NOT retryable
   */
  isRetryable(): boolean {
    if (!this.statusCode) return false
    return this.statusCode === 429 || this.statusCode >= 500
  }
}

/** Authentication/Authorization error (401/403) */
export class CloudronAuthError extends CloudronError {
  constructor(
    message = "Authentication failed. Check CLOUDRON_API_TOKEN.",
    statusCode = 401,
  ) {
    super(message, statusCode, "AUTH_ERROR")
    this.name = "CloudronAuthError"
  }
}

/**
 * Type guard for CloudronError
 * Usage: if (isCloudronError(error)) { ... }
 */
export function isCloudronError(error: unknown): error is CloudronError {
  return error instanceof CloudronError
}

/**
 * Create appropriate error from HTTP status code
 * Routes 401/403 to CloudronAuthError, others to CloudronError
 */
export function createErrorFromStatus(
  statusCode: number,
  message: string,
): CloudronError {
  if (statusCode === 401 || statusCode === 403) {
    return new CloudronAuthError(message, statusCode)
  }
  return new CloudronError(message, statusCode)
}
