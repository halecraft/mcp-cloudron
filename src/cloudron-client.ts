/**
 * Cloudron API Client
 * Wraps the Cloudron REST API with authentication, retry logic, and error handling
 */

import type {
  App,
  CloudronConfig,
  GetStatusInput,
  ListAppsInput,
  RestartAppInput,
  SystemStatus,
} from './types.js';
import {
  CloudronAuthError,
  CloudronConfigError,
  createCloudronError,
} from './errors.js';

/**
 * Cloudron API Client
 * Handles authentication, HTTP requests, and retry logic
 */
export class CloudronClient {
  private baseUrl: string;
  private token: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;

  /**
   * Creates a new Cloudron API client
   * @param config - Client configuration
   * @throws {CloudronConfigError} If configuration is invalid
   */
  constructor(config: CloudronConfig) {
    // Validate required configuration
    if (!config.baseUrl) {
      throw new CloudronConfigError(
        'CLOUDRON_BASE_URL is required',
        { config: 'baseUrl missing' }
      );
    }

    if (!config.token) {
      throw new CloudronConfigError(
        'CLOUDRON_API_TOKEN is required',
        { config: 'token missing' }
      );
    }

    // Normalize baseUrl (remove trailing slash)
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
    this.timeout = config.timeout ?? 30000;
    this.retryAttempts = config.retryAttempts ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  /**
   * Makes an HTTP request to the Cloudron API with retry logic
   * @private
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - API endpoint path (e.g., '/api/v1/apps')
   * @param body - Request body (optional)
   * @returns Parsed JSON response
   */
  private async fetchWithRetry(
    method: string,
    path: string,
    body?: unknown
  ): Promise<unknown> {
    let lastError: Error | null = null;
    const url = `${this.baseUrl}${path}`;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        };

        const options: RequestInit = {
          method,
          headers,
          signal: AbortSignal.timeout(this.timeout),
        };

        if (body) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        // Handle authentication errors
        if (response.status === 401) {
          throw new CloudronAuthError('Invalid API token', {
            endpoint: path,
            statusCode: response.status,
          });
        }

        // Handle non-200 responses
        if (!response.ok) {
          let data: Record<string, unknown> = {};
          try {
            data = (await response.json()) as Record<string, unknown>;
          } catch {
            // Unable to parse response body, continue with empty data
          }

          throw createCloudronError(response.status, response.statusText, data);
        }

        // Parse and return successful response
        return await response.json();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on auth or config errors
        if (
          error instanceof CloudronAuthError
        ) {
          throw error;
        }

        // Retry with exponential backoff
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error('Unknown error in fetchWithRetry');
  }

  /**
   * Lists all installed applications
   * @param _input - List apps input (currently unused)
   * @returns Array of installed applications
   */
  async listApps(_input: ListAppsInput): Promise<App[]> {
    const response = (await this.fetchWithRetry(
      'GET',
      '/api/v1/apps'
    )) as { apps: App[] };
    return response.apps || [];
  }

  /**
   * Gets system status and health
   * @param _input - Get status input (currently unused)
   * @returns Current system status
   */
  async getStatus(_input: GetStatusInput): Promise<SystemStatus> {
    const response = (await this.fetchWithRetry(
      'GET',
      '/api/v1/cloudron/status'
    )) as SystemStatus;
    return response;
  }

  /**
   * Restarts a specific application
   * @param input - Restart app input with appId
   * @returns Success status
   */
  async restartApp(input: RestartAppInput): Promise<void> {
    await this.fetchWithRetry('POST', `/api/v1/apps/${input.appId}/restart`);
  }

  /**
   * Validates that the Cloudron instance is accessible
   * Called during initialization to verify configuration
   * @throws {CloudronAuthError} If token is invalid
   * @throws {Error} If instance is unreachable
   */
  async validateConnection(): Promise<void> {
    try {
      await this.getStatus({});
    } catch (error) {
      if (error instanceof CloudronAuthError) {
        throw error;
      }
      throw new Error(`Failed to connect to Cloudron instance at ${this.baseUrl}: ${(error as Error).message}`);
    }
  }
}
