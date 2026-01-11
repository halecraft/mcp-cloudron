/**
 * Tasks API
 * Async task management operations
 */

import { CloudronError } from "../errors.js"
import type { TaskStatus, TaskStatusRaw } from "../types.js"
import type { HttpClient } from "./http-client.js"

/**
 * Normalize raw task status from API to our TaskStatus interface
 */
function normalizeTaskStatus(raw: TaskStatusRaw): TaskStatus {
  // Determine state from boolean flags
  let state: TaskStatus["state"]
  if (raw.success === true) {
    state = "success"
  } else if (raw.error) {
    state = "error"
  } else if (raw.active === true) {
    state = "running"
  } else if (raw.pending === true) {
    state = "pending"
  } else {
    // Default to running if no clear state (task in progress)
    state = "running"
  }

  const result: TaskStatus = {
    id: raw.id,
    state,
    progress: raw.percent ?? 0,
    message: raw.message ?? "",
    result: raw.result,
  }

  if (raw.error) {
    const errorCode = raw.error.code?.toString()
    result.error = {
      message: raw.error.message,
      ...(errorCode !== undefined && { code: errorCode }),
    }
  }

  return result
}

/**
 * Tasks API for managing async operations
 */
export class TasksApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get task status for async operations
   * GET /api/v1/tasks/:taskId
   * Normalizes the raw API response to our TaskStatus interface
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    if (!taskId) {
      throw new CloudronError("taskId is required")
    }
    const raw = await this.http.get<TaskStatusRaw>(
      `/api/v1/tasks/${encodeURIComponent(taskId)}`,
    )
    return normalizeTaskStatus(raw)
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
    const raw = await this.http.delete<TaskStatusRaw>(
      `/api/v1/tasks/${encodeURIComponent(taskId)}`,
    )
    return normalizeTaskStatus(raw)
  }
}
