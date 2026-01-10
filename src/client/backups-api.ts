/**
 * Backups API
 * Backup listing and creation operations
 */

import { BACKUP_MIN_STORAGE_MB } from "../config.js"
import { CloudronError } from "../errors.js"
import type { Backup, BackupsResponse, StorageInfo } from "../types.js"
import type { HttpClient } from "./http-client.js"

/**
 * Interface for storage checking (dependency injection)
 */
export interface StorageChecker {
  checkStorage(requiredMB?: number): Promise<StorageInfo>
}

/**
 * Backups API for Cloudron backup operations
 */
export class BackupsApi {
  constructor(
    private readonly http: HttpClient,
    private readonly storageChecker: StorageChecker,
  ) {}

  /**
   * List all backups
   * GET /api/v1/backups
   * @returns Array of backups sorted by timestamp (newest first)
   */
  async listBackups(): Promise<Backup[]> {
    const response = await this.http.get<BackupsResponse>("/api/v1/backups")

    // Sort backups by creationTime (newest first)
    const backups = response.backups || []
    return backups.sort((a, b) => {
      const timeA = new Date(a.creationTime).getTime()
      const timeB = new Date(b.creationTime).getTime()
      return timeB - timeA // Descending order (newest first)
    })
  }

  /**
   * Create a new backup (with F36 pre-flight storage check)
   * POST /api/v1/backups
   * @returns Task ID for tracking backup progress via getTaskStatus()
   */
  async createBackup(): Promise<string> {
    // F36 pre-flight storage check: Require minimum storage for backup
    const storageInfo = await this.storageChecker.checkStorage(
      BACKUP_MIN_STORAGE_MB,
    )

    if (!storageInfo.sufficient) {
      throw new CloudronError(
        `Insufficient storage for backup. Required: ${BACKUP_MIN_STORAGE_MB}MB, Available: ${storageInfo.available_mb}MB`,
      )
    }

    if (storageInfo.warning) {
      // Log warning but allow operation to proceed
      console.warn(
        `Storage warning: ${storageInfo.available_mb}MB available (${((storageInfo.available_mb / storageInfo.total_mb) * 100).toFixed(1)}% of total)`,
      )
    }

    // Create backup (async operation)
    const response = await this.http.post<{ taskId: string }>("/api/v1/backups")

    if (!response.taskId) {
      throw new CloudronError("Backup creation response missing taskId")
    }

    return response.taskId
  }
}
