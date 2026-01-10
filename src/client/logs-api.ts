/**
 * Logs API
 * Log retrieval operations
 */

import { MAX_LOG_LINES } from "../config.js"
import { CloudronError } from "../errors.js"
import type { LogEntry, LogsResponse, LogType } from "../types.js"
import type { HttpClient } from "./http-client.js"

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

    const response = await this.http.get<LogsResponse>(endpoint)

    // Parse and format log entries
    return this.parseLogEntries(response.logs || [])
  }

  /**
   * Parse raw log lines into structured LogEntry objects
   * Attempts to extract timestamp and severity level from log lines
   */
  parseLogEntries(logLines: string[]): LogEntry[] {
    return logLines.map(line => {
      // Try to parse common log formats:
      // 1. ISO timestamp at start: "2025-12-24T12:00:00Z [INFO] message"
      // 2. Syslog format: "Dec 24 12:00:00 host service[pid]: message"
      // 3. Simple format: "[INFO] message"
      // 4. Plain text: "message"

      const isoMatch = line.match(
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+\[?(\w+)\]?\s*(.*)$/,
      )
      if (isoMatch?.[1] && isoMatch[2] && isoMatch[3]) {
        return {
          timestamp: isoMatch[1],
          severity: isoMatch[2].toUpperCase(),
          message: isoMatch[3].trim(),
        }
      }

      const syslogMatch = line.match(
        /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+.*?\[\d+\]:\s*\[?(\w+)\]?\s*(.*)$/,
      )
      if (syslogMatch?.[1] && syslogMatch[2] && syslogMatch[3]) {
        return {
          timestamp: syslogMatch[1],
          severity: syslogMatch[2].toUpperCase(),
          message: syslogMatch[3].trim(),
        }
      }

      const simpleMatch = line.match(/^\[?(\w+)\]?\s+(.*)$/)
      if (
        simpleMatch?.[1] &&
        simpleMatch[2] &&
        [
          "DEBUG",
          "INFO",
          "WARN",
          "WARNING",
          "ERROR",
          "FATAL",
          "TRACE",
        ].includes(simpleMatch[1].toUpperCase())
      ) {
        return {
          timestamp: new Date().toISOString(),
          severity: simpleMatch[1].toUpperCase(),
          message: simpleMatch[2].trim(),
        }
      }

      // Fallback: plain text log line
      return {
        timestamp: new Date().toISOString(),
        severity: "INFO",
        message: line.trim(),
      }
    })
  }
}
