/**
 * Updates API
 * Platform update operations
 */

import { CloudronError } from "../errors.js"
import type { UpdateInfo, ValidationResult } from "../types.js"
import type { HttpClient } from "./http-client.js"

/**
 * Interface for update validation (dependency injection)
 */
export interface UpdateValidator {
  validateApplyUpdate(): Promise<ValidationResult>
}

/**
 * Updates API for Cloudron platform updates
 */
export class UpdatesApi {
  constructor(
    private readonly http: HttpClient,
    private readonly validator?: UpdateValidator,
  ) {}

  /**
   * Check for available Cloudron platform updates
   * GET /api/v1/updates
   * @returns Update information including availability and version
   */
  async checkUpdates(): Promise<UpdateInfo> {
    return await this.http.get<UpdateInfo>("/api/v1/updates")
  }

  /**
   * Apply available Cloudron platform update (DESTRUCTIVE OPERATION)
   * POST /api/v1/updates
   * Performs pre-flight validation before proceeding
   * @returns Task ID for tracking update progress
   */
  async applyUpdate(): Promise<string> {
    // Pre-flight validation if validator is provided
    if (this.validator) {
      const validation = await this.validator.validateApplyUpdate()

      // If validation fails, throw error with validation details
      if (!validation.valid) {
        const errorMessage = `Pre-flight validation failed for apply_update:\n${validation.errors.join("\n")}`
        throw new CloudronError(errorMessage)
      }
    }

    const response = await this.http.post<{ taskId: string }>("/api/v1/updates")

    if (!response.taskId) {
      throw new CloudronError("Apply update response missing taskId")
    }

    return response.taskId
  }
}
