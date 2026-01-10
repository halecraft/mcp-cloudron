/**
 * Update-related tool handlers
 */

import { formatAsyncTaskResponse, formatUpdateInfo } from "../formatters.js"
import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"

export const updateHandlers: ToolRegistry = {
  cloudron_check_updates: async (_args, client) => {
    const updateInfo = await client.checkUpdates()

    return textResponse(formatUpdateInfo(updateInfo))
  },

  cloudron_apply_update: async (_args, client) => {
    const taskId = await client.applyUpdate()

    return textResponse(
      formatAsyncTaskResponse(
        "Cloudron platform update",
        taskId,
        "⚠️  Services will restart during the update process. This may take several minutes.",
      ),
    )
  },
}
