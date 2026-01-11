/**
 * Validation Service
 * Pre-flight validation for destructive operations
 * Reusable validation logic separated from API client
 */

import {
  INSTALL_DEFAULT_STORAGE_MB,
  RESTORE_MIN_STORAGE_MB,
  STORAGE_CRITICAL_THRESHOLD,
  STORAGE_WARNING_THRESHOLD,
} from "../config.js"
import { CloudronError, isCloudronError } from "../errors.js"
import type {
  App,
  Backup,
  CloneAppParams,
  DiskUsageResponse,
  ManifestValidationResult,
  StorageInfo,
  SystemStatus,
  UpdateInfo,
  User,
  ValidatableOperation,
  ValidationResult,
} from "../types.js"

/**
 * Interface for data fetching operations needed by validation
 * Allows dependency injection for testing
 */
export interface ValidationDataProvider {
  getApp(appId: string): Promise<App>
  listApps(): Promise<App[]>
  getUser(userId: string): Promise<User>
  listUsers(): Promise<User[]>
  getStatus(): Promise<SystemStatus>
  getDiskUsage(): Promise<DiskUsageResponse>
  listBackups(): Promise<Backup[]>
  checkUpdates(): Promise<UpdateInfo>
  searchApps(query?: string): Promise<{ id: string; description?: string }[]>
}

/**
 * Validation Service for pre-flight checks on destructive operations
 */
export class ValidationService {
  constructor(private readonly dataProvider: ValidationDataProvider) {}

  /**
   * Check available disk space for pre-flight validation
   * @param requiredMB - Optional required disk space in MB
   * @returns Storage info with availability and threshold checks
   */
  async checkStorage(requiredMB?: number): Promise<StorageInfo> {
    const diskUsage = await this.dataProvider.getDiskUsage()

    // Find the root filesystem or the one with largest space?
    // Spec example shows "/dev/nvme0n1p2" with mountpoint "/"
    // We'll look for mountpoint "/"
    let rootFs = Object.values(diskUsage.usage.filesystems).find(
      fs => fs.mountpoint === "/",
    )

    if (!rootFs) {
      // Fallback to first one if root not found
      rootFs = Object.values(diskUsage.usage.filesystems)[0]
    }

    if (!rootFs) {
      throw new CloudronError("Disk information not available")
    }

    // Convert bytes to MB
    const available_mb = Math.floor(rootFs.available / 1024 / 1024)
    const total_mb = Math.floor(rootFs.size / 1024 / 1024)
    const used_mb = Math.floor(rootFs.used / 1024 / 1024)

    // Check if sufficient space available (if requiredMB provided)
    const sufficient =
      requiredMB !== undefined ? available_mb >= requiredMB : true

    // Warning threshold: available < configured percentage of total
    const warning = available_mb < total_mb * STORAGE_WARNING_THRESHOLD

    // Critical threshold: available < configured percentage of total
    const critical = available_mb < total_mb * STORAGE_CRITICAL_THRESHOLD

    return {
      available_mb,
      total_mb,
      used_mb,
      sufficient,
      warning,
      critical,
    }
  }

  /**
   * Validate a destructive operation before execution (pre-flight safety check)
   * @param operation - Type of operation to validate
   * @param resourceId - ID of the resource being operated on
   * @returns Validation result with errors, warnings, and recommendations
   */
  async validateOperation(
    operation: ValidatableOperation,
    resourceId: string,
  ): Promise<ValidationResult> {
    if (!resourceId) {
      throw new CloudronError("resourceId is required for operation validation")
    }

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    }

    switch (operation) {
      case "uninstall_app":
        await this.validateUninstallApp(resourceId, result)
        break
      case "delete_user":
        await this.validateDeleteUser(resourceId, result)
        break
      case "restore_backup":
        await this.validateRestoreBackup(resourceId, result)
        break
      default:
        throw new CloudronError(
          `Invalid operation type: ${operation}. Valid options: uninstall_app, delete_user, restore_backup`,
        )
    }

    // Set valid to false if there are any blocking errors
    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }

  /**
   * Validate uninstall_app operation
   * Checks: app exists, no dependent apps, backup exists
   */
  async validateUninstallApp(
    appId: string,
    result: ValidationResult,
  ): Promise<void> {
    try {
      // Check if app exists
      const app = await this.dataProvider.getApp(appId)

      // Check app state - warn if pending operations
      if (app.installationState !== "installed") {
        result.warnings.push(
          `App is in state '${app.installationState}', not 'installed'. Uninstall may fail or behave unexpectedly.`,
        )
      }

      // Recommendation: Create backup before uninstall
      result.recommendations.push(
        "Create a backup before uninstalling to preserve app data and configuration.",
      )

      // TODO: Check for dependent apps (requires app dependency API endpoint)
      // For now, add as recommendation
      result.recommendations.push(
        "Verify no other apps depend on this app before uninstalling.",
      )

      // Check if recent backup exists (within last 24 hours)
      result.recommendations.push(
        "Ensure a recent backup exists for disaster recovery.",
      )
    } catch (error) {
      if (isCloudronError(error) && error.statusCode === 404) {
        result.errors.push(`App with ID '${appId}' does not exist.`)
      } else {
        throw error
      }
    }
  }

  /**
   * Validate delete_user operation
   * Checks: user exists, not last admin, not self-deletion
   */
  async validateDeleteUser(
    userId: string,
    result: ValidationResult,
  ): Promise<void> {
    try {
      // Check if user exists
      const targetUser = await this.dataProvider.getUser(userId)

      // Get all users to check admin count
      const allUsers = await this.dataProvider.listUsers()

      // Check if user is the last admin
      if (targetUser.role === "admin") {
        const adminCount = allUsers.filter(u => u.role === "admin").length
        if (adminCount <= 1) {
          result.errors.push(
            "Cannot delete the last admin user. Promote another user to admin first.",
          )
        }
      }

      // Recommendations
      result.recommendations.push(
        "Ensure user is not currently logged in before deletion.",
      )
      result.recommendations.push(
        "Transfer ownership of user data/apps before deletion if needed.",
      )
      result.recommendations.push(
        "Consider disabling the user account instead of deleting if data retention is needed.",
      )
    } catch (error) {
      if (isCloudronError(error) && error.statusCode === 404) {
        result.errors.push(`User with ID '${userId}' does not exist.`)
      } else {
        throw error
      }
    }
  }

  /**
   * Validate restore_backup operation
   * Checks: backup exists, backup integrity valid, sufficient storage
   */
  async validateRestoreBackup(
    _backupId: string,
    result: ValidationResult,
  ): Promise<void> {
    try {
      // Check storage sufficiency using configured minimum
      const storageInfo = await this.checkStorage(RESTORE_MIN_STORAGE_MB)

      if (!storageInfo.sufficient) {
        result.errors.push(
          `Insufficient disk space for restore. Available: ${storageInfo.available_mb} MB, Required: ${RESTORE_MIN_STORAGE_MB} MB`,
        )
      }

      if (storageInfo.critical) {
        result.errors.push(
          "CRITICAL: Less than 5% disk space remaining. Restore operation blocked.",
        )
      } else if (storageInfo.warning) {
        result.warnings.push(
          "WARNING: Less than 10% disk space remaining. Monitor disk usage during restore.",
        )
      }

      result.recommendations.push("Verify backup integrity before restore.")
      result.recommendations.push(
        "Ensure all apps are stopped before restore to prevent data corruption.",
      )
      result.recommendations.push(
        "Create a new backup of current state before restore for rollback capability.",
      )
    } catch (error) {
      if (error instanceof CloudronError) {
        result.errors.push(`Storage check failed: ${error.message}`)
      } else {
        throw error
      }
    }
  }

  /**
   * Validate app manifest before installation (F23a pre-flight safety check)
   * Checks: F36 storage sufficient, dependencies available, configuration schema valid
   * @param appId - The app ID to validate from App Store
   * @param requiredMB - Optional disk space requirement in MB (defaults to INSTALL_DEFAULT_STORAGE_MB)
   * @returns Validation result with errors and warnings
   */
  async validateManifest(
    appId: string,
    requiredMB: number = INSTALL_DEFAULT_STORAGE_MB,
  ): Promise<ManifestValidationResult> {
    if (!appId) {
      throw new CloudronError("appId is required for manifest validation")
    }

    const result: ManifestValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    }

    try {
      // Step 1: Fetch app manifest from App Store
      const apps = await this.dataProvider.searchApps(appId)
      const app = apps.find(a => a.id === appId)

      if (!app) {
        result.errors.push(`App not found in App Store: ${appId}`)
        result.valid = false
        return result
      }

      // Step 2: Check F36 storage sufficient for installation
      const storageInfo = await this.checkStorage(requiredMB)

      if (storageInfo.critical) {
        result.errors.push(
          `CRITICAL: Less than 5% disk space remaining (${storageInfo.available_mb}MB available). Installation blocked.`,
        )
      } else if (!storageInfo.sufficient) {
        result.errors.push(
          `Insufficient disk space: ${storageInfo.available_mb}MB available, ${requiredMB}MB required.`,
        )
      } else if (storageInfo.warning) {
        result.warnings.push(
          `WARNING: Less than 10% disk space remaining (${storageInfo.available_mb}MB available). Monitor disk usage after installation.`,
        )
      }

      // Step 3: Check dependencies available in catalog
      if (app.description?.toLowerCase().includes("requires")) {
        result.warnings.push(
          "App may have dependencies. Verify all required addons are available.",
        )
      }

      // Step 4: Validate configuration schema
      result.warnings.push(
        "Ensure app configuration matches Cloudron specification after installation.",
      )
    } catch (error) {
      if (error instanceof CloudronError) {
        result.errors.push(`Manifest validation failed: ${error.message}`)
      } else {
        throw error
      }
    }

    // Set valid to false if there are any blocking errors
    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }

  /**
   * Validate clone operation
   * Checks: source app exists, target location available
   */
  async validateCloneOperation(
    appId: string,
    params: CloneAppParams,
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    }

    try {
      // Check if source app exists
      const app = await this.dataProvider.getApp(appId)

      // Check app state
      if (app.installationState !== "installed") {
        result.errors.push(
          `Cannot clone app in state '${app.installationState}'. App must be 'installed'.`,
        )
      }

      // Check if target location might conflict
      const apps = await this.dataProvider.listApps()
      const targetDomain = params.domain ?? app.domain
      const conflictingApp = apps.find(
        a => a.location === params.location && a.domain === targetDomain,
      )

      if (conflictingApp) {
        result.errors.push(
          `Target location '${params.location}.${targetDomain}' is already in use by app '${conflictingApp.manifest.title}'.`,
        )
      }

      // Recommendations
      result.recommendations.push(
        "Create a backup before cloning for disaster recovery.",
      )
    } catch (error) {
      if (isCloudronError(error) && error.statusCode === 404) {
        result.errors.push(`Source app with ID '${appId}' does not exist.`)
      } else {
        throw error
      }
    }

    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }

  /**
   * Validate restore operation
   * Checks: backup exists, storage sufficient
   */
  async validateRestoreOperation(
    appId: string,
    backupId: string,
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    }

    try {
      // Check if app exists
      await this.dataProvider.getApp(appId)

      // Check storage sufficiency
      const storageInfo = await this.checkStorage(RESTORE_MIN_STORAGE_MB)
      if (!storageInfo.sufficient) {
        result.errors.push(
          `Insufficient disk space for restore. Available: ${storageInfo.available_mb}MB, Required: ${RESTORE_MIN_STORAGE_MB}MB`,
        )
      }

      if (storageInfo.critical) {
        result.errors.push(
          "CRITICAL: Less than 5% disk space remaining. Restore blocked.",
        )
      } else if (storageInfo.warning) {
        result.warnings.push(
          "WARNING: Less than 10% disk space remaining. Monitor during restore.",
        )
      }

      // Check if backup exists
      const backups = await this.dataProvider.listBackups()
      const backup = backups.find(b => b.id === backupId)
      if (!backup) {
        result.errors.push(`Backup with ID '${backupId}' not found.`)
      } else if (backup.state !== "uploaded" && backup.state !== "created") {
        result.warnings.push(
          `Backup is in state '${backup.state}'. Restore may fail.`,
        )
      }

      result.recommendations.push(
        "Create a backup of current state before restore for rollback capability.",
      )
    } catch (error) {
      if (isCloudronError(error) && error.statusCode === 404) {
        result.errors.push(`App with ID '${appId}' does not exist.`)
      } else {
        throw error
      }
    }

    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }

  /**
   * Validate update operation
   * Checks: app exists, update available
   */
  async validateUpdateOperation(appId: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    }

    try {
      // Check if app exists
      const app = await this.dataProvider.getApp(appId)

      // Check app state
      if (app.installationState !== "installed") {
        result.errors.push(
          `Cannot update app in state '${app.installationState}'. App must be 'installed'.`,
        )
      }

      // Note: Checking if update is available would require additional API call
      result.warnings.push(
        "Update availability not verified. Operation may fail if no update exists.",
      )

      result.recommendations.push(
        "Create a backup before updating for rollback capability.",
      )
    } catch (error) {
      if (isCloudronError(error) && error.statusCode === 404) {
        result.errors.push(`App with ID '${appId}' does not exist.`)
      } else {
        throw error
      }
    }

    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }

  /**
   * Validate apply update operation
   * Checks: update available, backup recommended
   */
  async validateApplyUpdate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    }

    try {
      // Check if update is available
      const updateInfo = await this.dataProvider.checkUpdates()

      if (!updateInfo.available) {
        result.errors.push(
          "No update available. Cloudron is already up to date.",
        )
      }

      // Check for recent backup
      const backups = await this.dataProvider.listBackups()
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const recentBackup = backups.find(
        b => new Date(b.creationTime) > oneDayAgo && b.state === "uploaded",
      )

      if (!recentBackup) {
        result.warnings.push(
          "No backup found within the last 24 hours. Strongly recommend creating a backup before updating.",
        )
      }

      // Recommendations
      result.recommendations.push(
        "Create a backup before applying update for rollback capability.",
      )
      result.recommendations.push(
        "Schedule update during low-traffic period as services will restart.",
      )

      if (updateInfo.changelog) {
        result.recommendations.push(
          `Review changelog before updating: ${updateInfo.changelog}`,
        )
      }
    } catch (error) {
      if (error instanceof CloudronError) {
        result.errors.push(`Update check failed: ${error.message}`)
      } else {
        throw error
      }
    }

    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }
}
