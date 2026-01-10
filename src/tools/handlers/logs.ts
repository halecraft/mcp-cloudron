/**
 * Log-related tool handlers
 */

import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"
import { parseGetLogsArgs } from "../validators.js"

export const logHandlers: ToolRegistry = {
  cloudron_get_logs: async (args, ctx) => {
    const { resourceId, type, lines } = parseGetLogsArgs(args)
    const logEntries = await ctx.logs.getLogs(resourceId, type, lines)

    // Format logs for display
    const formattedLogs = logEntries
      .map(entry => `[${entry.timestamp}] [${entry.severity}] ${entry.message}`)
      .join("\n")

    const logType = type === "app" ? "Application" : "Service"

    return textResponse(
      `${logType} logs for ${resourceId} (${logEntries.length} entries):\n\n${formattedLogs}`,
    )
  },
}
