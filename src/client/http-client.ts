/**
 * HTTP Client for Cloudron API
 * Core request functionality with error handling
 */

import { DEFAULT_TIMEOUT_MS } from "../config.js"
import { CloudronError, createErrorFromStatus } from "../errors.js"

/**
 * Configuration for HttpClient
 */
export interface HttpClientConfig {
  baseUrl: string
  token: string
  timeout?: number
}

/**
 * HTTP Client for making authenticated requests to Cloudron API
 */
export class HttpClient {
  private readonly baseUrl: string
  private readonly token: string
  private readonly timeout: number

  constructor(config: HttpClientConfig) {
    if (!config.baseUrl) {
      throw new CloudronError(
        "baseUrl is required. Provide via config or CLOUDRON_BASE_URL environment variable.",
      )
    }
    if (!config.token) {
      throw new CloudronError(
        "token is required. Provide via config or CLOUDRON_API_TOKEN environment variable.",
      )
    }

    this.baseUrl = config.baseUrl.replace(/\/$/, "") // Remove trailing slash
    this.token = config.token
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS
  }

  /**
   * Create HttpClient from environment variables
   */
  static fromEnv(): HttpClient {
    const baseUrl = process.env.CLOUDRON_BASE_URL
    const token = process.env.CLOUDRON_API_TOKEN

    if (!baseUrl) {
      throw new CloudronError(
        "CLOUDRON_BASE_URL not set. Provide via config or environment variable.",
      )
    }
    if (!token) {
      throw new CloudronError(
        "CLOUDRON_API_TOKEN not set. Provide via config or environment variable.",
      )
    }

    return new HttpClient({ baseUrl, token })
  }

  /**
   * Make HTTP request to Cloudron API
   * NO retry logic (deferred to Phase 3 with idempotency keys)
   */
  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    body?: unknown,
    options?: { timeout?: number },
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const timeout = options?.timeout ?? this.timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
      }

      if (body !== undefined) {
        fetchOptions.body = JSON.stringify(body)
      }

      const response = await fetch(url, fetchOptions)

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorBody = await response.text()
        let message = `Cloudron API error: ${response.status} ${response.statusText}`

        try {
          const parsed = JSON.parse(errorBody)
          if (parsed.message) message = parsed.message
        } catch {
          // Use default message if body isn't JSON
        }

        throw createErrorFromStatus(response.status, message)
      }

      return (await response.json()) as T
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof CloudronError) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new CloudronError(`Request timeout after ${timeout}ms`, {
            code: "TIMEOUT",
            cause: error,
          })
        }
        throw new CloudronError(`Network error: ${error.message}`, {
          code: "NETWORK_ERROR",
          cause: error,
        })
      }

      throw new CloudronError("Unknown error occurred", { cause: error })
    }
  }

  /**
   * GET request helper
   */
  async get<T>(endpoint: string, options?: { timeout?: number }): Promise<T> {
    return this.request<T>("GET", endpoint, undefined, options)
  }

  /**
   * POST request helper
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: { timeout?: number },
  ): Promise<T> {
    return this.request<T>("POST", endpoint, body, options)
  }

  /**
   * PUT request helper
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: { timeout?: number },
  ): Promise<T> {
    return this.request<T>("PUT", endpoint, body, options)
  }

  /**
   * DELETE request helper
   */
  async delete<T>(
    endpoint: string,
    options?: { timeout?: number },
  ): Promise<T> {
    return this.request<T>("DELETE", endpoint, undefined, options)
  }
}
