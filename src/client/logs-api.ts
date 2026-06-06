/**
 * Logs API
 * Log retrieval operations
 */

import { MAX_LOG_LINES } from "../config.js"
import { CloudronError } from "../errors.js"
import type { LogEntry, LogType } from "../types.js"
import type { HttpClient } from "./http-client.js"
import { parseLogLine } from "./parse-log-line.js"

/**
 * Logs API for Cloudron log retrieval
 */
export class LogsApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get logs for an app or service
   * GET /api/v1/apps/:id/logs or GET /api/v1/services/:id/logs
   * @param resourceId - App ID or service ID
   * @param type - Type of resource ('app' or 'service')
   * @param lines - Optional number of log lines to retrieve (default 100, max 1000)
   * @returns Formatted log entries with timestamps and severity levels
   */
  async getLogs(
    resourceId: string,
    type: LogType,
    lines: number = 100,
  ): Promise<LogEntry[]> {
    if (!resourceId) {
      throw new CloudronError("resourceId is required")
    }

    if (type !== "app" && type !== "service") {
      throw new CloudronError(
        `Invalid type: ${type}. Valid options: app, service`,
      )
    }

    // Clamp lines between 1 and MAX_LOG_LINES
    const clampedLines = Math.max(1, Math.min(MAX_LOG_LINES, lines))

    // Determine endpoint based on type
    const endpoint =
      type === "app"
        ? `/api/v1/apps/${encodeURIComponent(resourceId)}/logs?lines=${clampedLines}`
        : `/api/v1/services/${encodeURIComponent(resourceId)}/logs?lines=${clampedLines}`

    // Logs API returns raw text (NDJSON by default), not JSON
    const text = await this.http.get<string>(endpoint, { responseType: "text" })

    // Split raw text into lines, filtering empty lines
    const logLines = text.split("\n").filter(line => line.trim().length > 0)
    return this.parseLogEntries(logLines)
  }

  /**
   * Parse raw log lines into structured LogEntry objects
   * Attempts to extract timestamp and severity level from log lines
   */
  parseLogEntries(logLines: string[]): LogEntry[] {
    return logLines.map(parseLogLine)
  }
}
