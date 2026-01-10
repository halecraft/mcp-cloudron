/**
 * Apps API
 * App management operations
 */

import { BACKUP_MIN_STORAGE_MB } from "../config.js"
import { CloudronError } from "../errors.js"
import type {
  App,
  AppConfig,
  AppsResponse,
  CloneAppParams,
  ConfigureAppResponse,
  InstallAppParams,
  ManifestValidationResult,
  RestoreAppParams,
  StorageInfo,
  UpdateAppParams,
  ValidationResult,
} from "../types.js"
import type { HttpClient } from "./http-client.js"

/**
 * Interface for storage checking (dependency injection)
 */
export interface AppsStorageChecker {
  checkStorage(requiredMB?: number): Promise<StorageInfo>
}

/**
 * Interface for app validation (dependency injection)
 */
export interface AppsValidator {
  validateOperation(
    operation: "uninstall_app",
    resourceId: string,
  ): Promise<ValidationResult>
  validateManifest(
    appId: string,
    requiredMB?: number,
  ): Promise<ManifestValidationResult>
  validateCloneOperation(
    appId: string,
    params: CloneAppParams,
  ): Promise<ValidationResult>
  validateRestoreOperation(
    appId: string,
    backupId: string,
  ): Promise<ValidationResult>
  validateUpdateOperation(appId: string): Promise<ValidationResult>
}

/**
 * Apps API for Cloudron app management
 */
export class AppsApi {
  constructor(
    private readonly http: HttpClient,
    private readonly storageChecker: AppsStorageChecker,
    private readonly validator?: AppsValidator,
  ) {}

  /**
   * List all installed apps
   * GET /api/v1/apps
   */
  async listApps(): Promise<App[]> {
    const response = await this.http.get<AppsResponse>("/api/v1/apps")
    return response.apps
  }

  /**
   * Get a specific app by ID
   * GET /api/v1/apps/:appId
   *
   * Note: API returns app object directly, not wrapped in { app: {...} }
   */
  async getApp(appId: string): Promise<App> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    return await this.http.get<App>(`/api/v1/apps/${encodeURIComponent(appId)}`)
  }

  /**
   * Start an app
   * POST /api/v1/apps/:appId/start
   * @returns 202 Accepted response with task ID
   */
  async startApp(appId: string): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    return await this.http.post<{ taskId: string }>(
      `/api/v1/apps/${encodeURIComponent(appId)}/start`,
    )
  }

  /**
   * Stop an app
   * POST /api/v1/apps/:appId/stop
   * @returns 202 Accepted response with task ID
   */
  async stopApp(appId: string): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    return await this.http.post<{ taskId: string }>(
      `/api/v1/apps/${encodeURIComponent(appId)}/stop`,
    )
  }

  /**
   * Restart an app
   * POST /api/v1/apps/:appId/restart
   * @returns 202 Accepted response with task ID
   */
  async restartApp(appId: string): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    return await this.http.post<{ taskId: string }>(
      `/api/v1/apps/${encodeURIComponent(appId)}/restart`,
    )
  }

  /**
   * Configure app settings (env vars, memory limits, access control)
   * PUT /api/v1/apps/:appId/configure
   * @param appId - The app ID to configure
   * @param config - Configuration object with env vars, memoryLimit, accessRestriction
   * @returns Response with updated app and restart requirement flag
   */
  async configureApp(
    appId: string,
    config: AppConfig,
  ): Promise<ConfigureAppResponse> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    // Validate config object has at least one field
    if (!config || Object.keys(config).length === 0) {
      throw new CloudronError("config object cannot be empty")
    }

    // Validate config fields if present
    if (config.env !== undefined && typeof config.env !== "object") {
      throw new CloudronError("env must be an object of key-value pairs")
    }

    if (config.memoryLimit !== undefined) {
      if (typeof config.memoryLimit !== "number" || config.memoryLimit <= 0) {
        throw new CloudronError("memoryLimit must be a positive number (in MB)")
      }
    }

    if (
      config.accessRestriction !== undefined &&
      config.accessRestriction !== null
    ) {
      if (typeof config.accessRestriction !== "string") {
        throw new CloudronError("accessRestriction must be a string or null")
      }
    }

    return await this.http.put<ConfigureAppResponse>(
      `/api/v1/apps/${encodeURIComponent(appId)}/configure`,
      config,
    )
  }

  /**
   * Uninstall an application (DESTRUCTIVE OPERATION)
   * POST /api/v1/apps/:id/uninstall
   * Returns task ID for async operation tracking
   * Performs pre-flight validation via F37 before proceeding
   */
  async uninstallApp(appId: string): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    // Pre-flight validation if validator is provided
    if (this.validator) {
      const validation = await this.validator.validateOperation(
        "uninstall_app",
        appId,
      )

      // If validation fails, throw error with validation details
      if (!validation.valid) {
        const errorMessage = `Pre-flight validation failed for uninstall_app on '${appId}':\n${validation.errors.join("\n")}`
        throw new CloudronError(errorMessage)
      }
    }

    // Proceed with uninstall if validation passes
    return await this.http.post<{ taskId: string }>(
      `/api/v1/apps/${encodeURIComponent(appId)}/uninstall`,
    )
  }

  /**
   * Install an application from the App Store (F23b with pre-flight validation)
   * POST /api/v1/apps/install
   * @param params - Installation parameters (manifestId, location, optional config)
   * @returns Task ID for tracking installation progress via getTaskStatus()
   */
  async installApp(params: InstallAppParams): Promise<string> {
    if (!params.manifestId) {
      throw new CloudronError("manifestId is required for app installation")
    }
    if (!params.location) {
      throw new CloudronError(
        "location (subdomain) is required for app installation",
      )
    }

    // F23a pre-flight validation if validator is provided
    if (this.validator) {
      const validation = await this.validator.validateManifest(
        params.manifestId,
      )
      if (!validation.valid) {
        throw new CloudronError(
          `Pre-flight validation failed: ${validation.errors.join(", ")}`,
        )
      }

      // Log warnings but allow installation to proceed
      if (validation.warnings.length > 0) {
        console.warn(`Installation warnings: ${validation.warnings.join("; ")}`)
      }
    }

    // Install app (async operation)
    const body = {
      appStoreId: params.manifestId,
      location: params.location,
      domain: params.domain,
      accessRestriction: params.accessRestriction,
      ...(params.portBindings && { portBindings: params.portBindings }),
      ...(params.env && { env: params.env }),
    }

    const response = await this.http.post<{ taskId: string }>(
      "/api/v1/apps",
      body,
    )

    if (!response.taskId) {
      throw new CloudronError("App installation response missing taskId")
    }

    return response.taskId
  }

  /**
   * Clone an existing app
   * POST /api/v1/apps/:appId/clone
   * @param appId - The app ID to clone
   * @param params - Clone parameters (location required, domain/portBindings/backupId optional)
   * @returns Task ID for tracking clone progress
   */
  async cloneApp(appId: string, params: CloneAppParams): Promise<string> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    if (!params.location) {
      throw new CloudronError("location (subdomain) is required for cloning")
    }

    // Pre-flight validation if validator is provided
    if (this.validator) {
      const validation = await this.validator.validateCloneOperation(
        appId,
        params,
      )
      if (!validation.valid) {
        throw new CloudronError(
          `Pre-flight validation failed: ${validation.errors.join(", ")}`,
        )
      }
    }

    const response = await this.http.post<{ taskId: string }>(
      `/api/v1/apps/${encodeURIComponent(appId)}/clone`,
      params,
    )

    if (!response.taskId) {
      throw new CloudronError("Clone response missing taskId")
    }

    return response.taskId
  }

  /**
   * Repair a broken app
   * POST /api/v1/apps/:appId/repair
   * @param appId - The app ID to repair
   * @returns Task ID for tracking repair progress
   */
  async repairApp(appId: string): Promise<string> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    const response = await this.http.post<{ taskId: string }>(
      `/api/v1/apps/${encodeURIComponent(appId)}/repair`,
    )

    if (!response.taskId) {
      throw new CloudronError("Repair response missing taskId")
    }

    return response.taskId
  }

  /**
   * Restore an app from backup
   * POST /api/v1/apps/:appId/restore
   * @param appId - The app ID to restore
   * @param params - Restore parameters (backupId required)
   * @returns Task ID for tracking restore progress
   */
  async restoreApp(appId: string, params: RestoreAppParams): Promise<string> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    if (!params.backupId) {
      throw new CloudronError("backupId is required for restore")
    }

    // Pre-flight validation if validator is provided
    if (this.validator) {
      const validation = await this.validator.validateRestoreOperation(
        appId,
        params.backupId,
      )
      if (!validation.valid) {
        throw new CloudronError(
          `Pre-flight validation failed: ${validation.errors.join(", ")}`,
        )
      }
    }

    const response = await this.http.post<{ taskId: string }>(
      `/api/v1/apps/${encodeURIComponent(appId)}/restore`,
      params,
    )

    if (!response.taskId) {
      throw new CloudronError("Restore response missing taskId")
    }

    return response.taskId
  }

  /**
   * Update an app to a new version
   * POST /api/v1/apps/:appId/update
   * @param appId - The app ID to update
   * @param params - Optional update parameters (version, force)
   * @returns Task ID for tracking update progress
   */
  async updateApp(appId: string, params?: UpdateAppParams): Promise<string> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    // Pre-flight validation if validator is provided
    if (this.validator) {
      const validation = await this.validator.validateUpdateOperation(appId)
      if (!validation.valid) {
        throw new CloudronError(
          `Pre-flight validation failed: ${validation.errors.join(", ")}`,
        )
      }
    }

    const response = await this.http.post<{ taskId: string }>(
      `/api/v1/apps/${encodeURIComponent(appId)}/update`,
      params ?? {},
    )

    if (!response.taskId) {
      throw new CloudronError("Update response missing taskId")
    }

    return response.taskId
  }

  /**
   * Create a backup of a specific app
   * POST /api/v1/apps/:appId/backup
   * @param appId - The app ID to backup
   * @returns Task ID for tracking backup progress
   */
  async backupApp(appId: string): Promise<string> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    // Pre-flight storage check
    const storageInfo = await this.storageChecker.checkStorage(
      BACKUP_MIN_STORAGE_MB,
    )
    if (!storageInfo.sufficient) {
      throw new CloudronError(
        `Insufficient storage for app backup. Required: ${BACKUP_MIN_STORAGE_MB}MB, Available: ${storageInfo.available_mb}MB`,
      )
    }

    const response = await this.http.post<{ taskId: string }>(
      `/api/v1/apps/${encodeURIComponent(appId)}/backup`,
    )

    if (!response.taskId) {
      throw new CloudronError("App backup response missing taskId")
    }

    return response.taskId
  }
}
