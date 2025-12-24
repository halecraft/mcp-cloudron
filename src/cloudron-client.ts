/**
 * Cloudron API Client
 * MVP scope: listApps + getApp endpoints
 * DI-enabled for testing
 */

import type { CloudronClientConfig, App, AppsResponse, AppResponse, SystemStatus, TaskStatus, StorageInfo, ValidatableOperation, ValidationResult, Backup, BackupsResponse, AppStoreApp, AppStoreResponse, User, UsersResponse } from './types.js';
import { CloudronError, CloudronAuthError, createErrorFromStatus } from './errors.js';

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

  /**
   * Get Cloudron system status
   * GET /api/v1/cloudron/status
   */
  async getStatus(): Promise<SystemStatus> {
    return await this.makeRequest<SystemStatus>('GET', '/api/v1/cloudron/status');
  }

  /**
   * List all backups
   * GET /api/v1/backups
   * @returns Array of backups sorted by timestamp (newest first)
   */
  async listBackups(): Promise<Backup[]> {
    const response = await this.makeRequest<BackupsResponse>('GET', '/api/v1/backups');

    // Sort backups by creationTime (newest first)
    const backups = response.backups || [];
    return backups.sort((a, b) => {
      const timeA = new Date(a.creationTime).getTime();
      const timeB = new Date(b.creationTime).getTime();
      return timeB - timeA; // Descending order (newest first)
    });
  }

  /**
   * List all users on Cloudron instance
   * GET /api/v1/users
   * @returns Array of users sorted by role then email
   */
  async listUsers(): Promise<User[]> {
    const response = await this.makeRequest<UsersResponse>('GET', '/api/v1/users');

    // Sort users by role then email
    const users = response.users || [];
    return users.sort((a, b) => {
      // Sort by role first (admin > user > guest)
      const roleOrder = { admin: 0, user: 1, guest: 2 };
      const roleCompare = roleOrder[a.role] - roleOrder[b.role];
      if (roleCompare !== 0) return roleCompare;

      // Then by email alphabetically
      return a.email.localeCompare(b.email);
    });
  }

  /**
   * Search Cloudron App Store for available applications
   * GET /api/v1/appstore?search={query}
   * @param query - Optional search query (empty returns all apps)
   * @returns Array of app store apps sorted by relevance score
   */
  async searchApps(query?: string): Promise<AppStoreApp[]> {
    const endpoint = query
      ? `/api/v1/appstore?search=${encodeURIComponent(query)}`
      : '/api/v1/appstore';

    const response = await this.makeRequest<AppStoreResponse>('GET', endpoint);

    // Sort results by relevance score (highest first) if available
    const apps = response.apps || [];
    return apps.sort((a, b) => {
      const scoreA = a.relevanceScore ?? 0;
      const scoreB = b.relevanceScore ?? 0;
      return scoreB - scoreA; // Descending order (highest relevance first)
    });
  }

  /**
   * Start an app
   * POST /api/v1/apps/:appId/start
   * @returns 202 Accepted response with task ID
   */
  async startApp(appId: string): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError('appId is required');
    }
    return await this.makeRequest<{ taskId: string }>('POST', `/api/v1/apps/${encodeURIComponent(appId)}/start`);
  }

  /**
   * Stop an app
   * POST /api/v1/apps/:appId/stop
   * @returns 202 Accepted response with task ID
   */
  async stopApp(appId: string): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError('appId is required');
    }
    return await this.makeRequest<{ taskId: string }>('POST', `/api/v1/apps/${encodeURIComponent(appId)}/stop`);
  }

  /**
   * Restart an app
   * POST /api/v1/apps/:appId/restart
   * @returns 202 Accepted response with task ID
   */
  async restartApp(appId: string): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError('appId is required');
    }
    return await this.makeRequest<{ taskId: string }>('POST', `/api/v1/apps/${encodeURIComponent(appId)}/restart`);
  }

  /**
   * Get task status for async operations
   * GET /api/v1/tasks/:taskId
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    if (!taskId) {
      throw new CloudronError('taskId is required');
    }
    return await this.makeRequest<TaskStatus>('GET', `/api/v1/tasks/${encodeURIComponent(taskId)}`);
  }

  /**
   * Check available disk space for pre-flight validation
   * GET /api/v1/cloudron/status (reuses existing endpoint)
   * @param requiredMB - Optional required disk space in MB
   * @returns Storage info with availability and threshold checks
   */
  async checkStorage(requiredMB?: number): Promise<StorageInfo> {
    const status = await this.getStatus();

    if (!status.disk) {
      throw new CloudronError('Disk information not available in system status');
    }

    // Convert bytes to MB
    const available_mb = Math.floor(status.disk.free / 1024 / 1024);
    const total_mb = Math.floor(status.disk.total / 1024 / 1024);
    const used_mb = Math.floor(status.disk.used / 1024 / 1024);

    // Check if sufficient space available (if requiredMB provided)
    const sufficient = requiredMB !== undefined ? available_mb >= requiredMB : true;

    // Warning threshold: available < 10% of total
    const warning = available_mb < (total_mb * 0.1);

    // Critical threshold: available < 5% of total
    const critical = available_mb < (total_mb * 0.05);

    return {
      available_mb,
      total_mb,
      used_mb,
      sufficient,
      warning,
      critical,
    };
  }

  /**
   * Validate a destructive operation before execution (pre-flight safety check)
   * @param operation - Type of operation to validate
   * @param resourceId - ID of the resource being operated on
   * @returns Validation result with errors, warnings, and recommendations
   */
  async validateOperation(operation: ValidatableOperation, resourceId: string): Promise<ValidationResult> {
    if (!resourceId) {
      throw new CloudronError('resourceId is required for operation validation');
    }

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    };

    switch (operation) {
      case 'uninstall_app':
        await this.validateUninstallApp(resourceId, result);
        break;
      case 'delete_user':
        await this.validateDeleteUser(resourceId, result);
        break;
      case 'restore_backup':
        await this.validateRestoreBackup(resourceId, result);
        break;
      default:
        throw new CloudronError(`Invalid operation type: ${operation}. Valid options: uninstall_app, delete_user, restore_backup`);
    }

    // Set valid to false if there are any blocking errors
    if (result.errors.length > 0) {
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate uninstall_app operation
   * Checks: app exists, no dependent apps, backup exists
   */
  private async validateUninstallApp(appId: string, result: ValidationResult): Promise<void> {
    try {
      // Check if app exists
      const app = await this.getApp(appId);

      // Check app state - warn if pending operations
      if (app.installationState !== 'installed') {
        result.warnings.push(`App is in state '${app.installationState}', not 'installed'. Uninstall may fail or behave unexpectedly.`);
      }

      // Recommendation: Create backup before uninstall
      result.recommendations.push('Create a backup before uninstalling to preserve app data and configuration.');

      // TODO: Check for dependent apps (requires app dependency API endpoint)
      // For now, add as recommendation
      result.recommendations.push('Verify no other apps depend on this app before uninstalling.');

      // Check if recent backup exists (within last 24 hours)
      // Note: This requires listBackups() which is F07 (not yet implemented)
      // For now, add as recommendation
      result.recommendations.push('Ensure a recent backup exists for disaster recovery.');

    } catch (error) {
      if (isCloudronError(error) && error.statusCode === 404) {
        result.errors.push(`App with ID '${appId}' does not exist.`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate delete_user operation
   * Checks: user exists, not last admin, not currently logged in
   */
  private async validateDeleteUser(userId: string, result: ValidationResult): Promise<void> {
    // Note: This requires listUsers() API which is F12 (not yet implemented)
    // For Phase 1, we provide basic validation structure

    // TODO: Check if user exists (requires GET /api/v1/users/:id endpoint)
    // TODO: Check if user is last admin (requires GET /api/v1/users with role filtering)
    // TODO: Check if user is currently logged in (requires session/activity API)

    result.warnings.push('User deletion validation is limited in current implementation.');
    result.recommendations.push('Verify user is not the last admin before deletion.');
    result.recommendations.push('Ensure user is not currently logged in before deletion.');
    result.recommendations.push('Transfer ownership of user data/apps before deletion if needed.');
  }

  /**
   * Validate restore_backup operation
   * Checks: backup exists, backup integrity valid, sufficient storage
   */
  private async validateRestoreBackup(backupId: string, result: ValidationResult): Promise<void> {
    // Note: This requires listBackups() API which is F07 (not yet implemented)
    // For Phase 1, we focus on storage validation

    try {
      // Check storage sufficiency
      // Assume backup requires at least 1GB of free space for safety margin
      const RESTORE_MIN_STORAGE_MB = 1024;
      const storageInfo = await this.checkStorage(RESTORE_MIN_STORAGE_MB);

      if (!storageInfo.sufficient) {
        result.errors.push(`Insufficient disk space for restore. Available: ${storageInfo.available_mb} MB, Required: ${RESTORE_MIN_STORAGE_MB} MB`);
      }

      if (storageInfo.critical) {
        result.errors.push('CRITICAL: Less than 5% disk space remaining. Restore operation blocked.');
      } else if (storageInfo.warning) {
        result.warnings.push('WARNING: Less than 10% disk space remaining. Monitor disk usage during restore.');
      }

      // TODO: Check if backup exists (requires GET /api/v1/backups/:id endpoint from F07)
      // TODO: Check backup integrity (requires backup metadata with checksum/status)

      result.recommendations.push('Verify backup integrity before restore.');
      result.recommendations.push('Ensure all apps are stopped before restore to prevent data corruption.');
      result.recommendations.push('Create a new backup of current state before restore for rollback capability.');

    } catch (error) {
      if (error instanceof CloudronError) {
        result.errors.push(`Storage check failed: ${error.message}`);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Type guard for CloudronError
 */
function isCloudronError(error: unknown): error is CloudronError {
  return error instanceof CloudronError;
}
