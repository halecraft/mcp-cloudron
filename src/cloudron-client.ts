/**
 * Cloudron API Client
 * MVP scope: listApps + getApp endpoints
 * DI-enabled for testing
 */

import type { CloudronClientConfig, App, AppsResponse, AppResponse } from './types';
import { CloudronError, CloudronAuthError, createErrorFromStatus } from './errors';

const DEFAULT_TIMEOUT = 30000;

export class CloudronClient {
  private readonly baseUrl: string;
  private readonly token: string;

  /**
   * Create CloudronClient with DI support
   * @param config - Optional config (defaults to env vars)
   */
  constructor(config?: Partial<CloudronClientConfig>) {
    const baseUrl = config?.baseUrl ?? process.env.CLOUDRON_BASE_URL;
    const token = config?.token ?? process.env.CLOUDRON_API_TOKEN;

    if (!baseUrl) {
      throw new CloudronError('CLOUDRON_BASE_URL not set. Provide via config or environment variable.');
    }
    if (!token) {
      throw new CloudronError('CLOUDRON_API_TOKEN not set. Provide via config or environment variable.');
    }

    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = token;
  }

  /**
   * Make HTTP request to Cloudron API
   * NO retry logic (deferred to Phase 3 with idempotency keys)
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: unknown,
    options?: { timeout?: number }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      };

      if (body !== undefined) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let message = `Cloudron API error: ${response.status} ${response.statusText}`;

        try {
          const parsed = JSON.parse(errorBody);
          if (parsed.message) message = parsed.message;
        } catch {
          // Use default message if body isn't JSON
        }

        throw createErrorFromStatus(response.status, message);
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof CloudronError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new CloudronError(`Request timeout after ${timeout}ms`, undefined, 'TIMEOUT');
        }
        throw new CloudronError(`Network error: ${error.message}`, undefined, 'NETWORK_ERROR');
      }

      throw new CloudronError('Unknown error occurred');
    }
  }

  // ==================== MVP Endpoints ====================

  /**
   * List all installed apps
   * GET /api/v1/apps
   */
  async listApps(): Promise<App[]> {
    const response = await this.makeRequest<AppsResponse>('GET', '/api/v1/apps');
    return response.apps;
  }

  /**
   * Get a specific app by ID
   * GET /api/v1/apps/:appId
   *
   * Note: API returns app object directly, not wrapped in { app: {...} }
   */
  async getApp(appId: string): Promise<App> {
    if (!appId) {
      throw new CloudronError('appId is required');
    }
    return await this.makeRequest<App>('GET', `/api/v1/apps/${encodeURIComponent(appId)}`);
  }
}
