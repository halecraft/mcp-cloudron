/**
 * System-related tool handlers
 */

import {
  formatStorageInfo,
  formatTaskStatus,
  formatValidationResult,
} from "../formatters.js"
import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"
import {
  parseCheckStorageArgs,
  parseTaskIdArgs,
  parseValidateOperationArgs,
} from "../validators.js"

export const systemHandlers: ToolRegistry = {
  cloudron_get_status: async (_args, client) => {
    const status = await client.getStatus()
    return textResponse(`Cloudron Status:
  Name: ${status.cloudronName}
  Version: ${status.version}
  Admin URL: ${status.adminFqdn}
  Provider: ${status.provider}
  Demo Mode: ${status.isDemo}`)
  },

  cloudron_task_status: async (args, client) => {
    const { taskId } = parseTaskIdArgs(args)
    const taskStatus = await client.getTaskStatus(taskId)
    return textResponse(formatTaskStatus(taskStatus))
  },

  cloudron_cancel_task: async (args, client) => {
    const { taskId } = parseTaskIdArgs(args)
    const taskStatus = await client.cancelTask(taskId)

    let statusText = `Task Cancellation:
  Task ID: ${taskStatus.id}
  New State: ${taskStatus.state}
  Message: ${taskStatus.message}`

    if (taskStatus.state === "cancelled") {
      statusText +=
        "\n\n✅ Task successfully cancelled. Resources have been cleaned up."
    } else {
      statusText += `\n\n⚠️  Task is in state '${taskStatus.state}' (expected 'cancelled'). Cancellation may not have completed.`
    }

    statusText += `\n\nUse cloudron_task_status with taskId '${taskId}' to verify final state.`

    return textResponse(statusText)
  },

  cloudron_check_storage: async (args, client) => {
    const { requiredMB } = parseCheckStorageArgs(args)
    const storageInfo = await client.checkStorage(requiredMB)
    return textResponse(formatStorageInfo(storageInfo, requiredMB))
  },

  cloudron_validate_operation: async (args, client) => {
    const { operation, resourceId } = parseValidateOperationArgs(args)
    const validationResult = await client.validateOperation(
      operation,
      resourceId,
    )
    return textResponse(
      formatValidationResult(operation, resourceId, validationResult),
    )
  },
}
