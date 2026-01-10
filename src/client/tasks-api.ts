/**
 * Tasks API
 * Async task management operations
 */

import { CloudronError } from "../errors.js"
import type { TaskStatus } from "../types.js"
import type { HttpClient } from "./http-client.js"

/**
 * Tasks API for managing async operations
 */
export class TasksApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get task status for async operations
   * GET /api/v1/tasks/:taskId
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    if (!taskId) {
      throw new CloudronError("taskId is required")
    }
    return await this.http.get<TaskStatus>(
      `/api/v1/tasks/${encodeURIComponent(taskId)}`,
    )
  }

  /**
   * Cancel a running async operation (kill switch)
   * DELETE /api/v1/tasks/:taskId
   * @returns Updated task status with 'cancelled' state
   */
  async cancelTask(taskId: string): Promise<TaskStatus> {
    if (!taskId) {
      throw new CloudronError("taskId is required")
    }
    return await this.http.delete<TaskStatus>(
      `/api/v1/tasks/${encodeURIComponent(taskId)}`,
    )
  }
}
