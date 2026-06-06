/**
 * Parse a single log line into a structured LogEntry.
 *
 * Handles multiple log formats:
 * 1. NDJSON: {"realtimeTimestamp": "...", "message": "..."}
 * 2. ISO timestamp: "2025-12-24T12:00:00Z [INFO] message"
 * 3. Syslog: "Dec 24 12:00:00 host service[pid]: [INFO] message"
 * 4. Bracket severity: "[INFO] message"
 * 5. Plain text fallback
 */

import type { LogEntry } from "../types.js"

const SEVERITY_LEVELS = [
  "DEBUG",
  "INFO",
  "WARN",
  "WARNING",
  "ERROR",
  "FATAL",
  "TRACE",
] as const

/**
 * Try to parse a line as NDJSON (newline-delimited JSON).
 * The Cloudron logs API returns NDJSON by default, where each line
 * is a JSON object with `realtimeTimestamp` and `message` fields.
 */
function tryParseNdjson(line: string): LogEntry | null {
  try {
    const parsed = JSON.parse(line)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.realtimeTimestamp === "string" &&
      typeof parsed.message === "string"
    ) {
      return {
        timestamp: parsed.realtimeTimestamp,
        severity: "INFO", // NDJSON doesn't carry severity
        message: parsed.message,
      }
    }
  } catch {
    // Not valid JSON — fall through to regex parsing
  }
  return null
}

/**
 * Parse a single log line into a structured LogEntry.
 * Tries NDJSON first, then falls back to regex-based log format patterns.
 */
export function parseLogLine(line: string): LogEntry {
  if (!line) {
    return {
      timestamp: new Date().toISOString(),
      severity: "INFO",
      message: "",
    }
  }

  // 1. Try NDJSON format (Cloudron default)
  const ndjson = tryParseNdjson(line)
  if (ndjson) return ndjson

  // 2. ISO timestamp at start: "2025-12-24T12:00:00Z [INFO] message"
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

  // 3. Syslog format: "Dec 24 12:00:00 host service[pid]: [INFO] message"
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

  // 4. Simple bracket format: "[INFO] message" or "INFO message"
  const simpleMatch = line.match(/^\[?(\w+)\]?\s+(.*)$/)
  if (
    simpleMatch?.[1] &&
    simpleMatch[2] &&
    (SEVERITY_LEVELS as readonly string[]).includes(
      simpleMatch[1].toUpperCase(),
    )
  ) {
    return {
      timestamp: new Date().toISOString(),
      severity: simpleMatch[1].toUpperCase(),
      message: simpleMatch[2].trim(),
    }
  }

  // 5. Fallback: plain text log line
  return {
    timestamp: new Date().toISOString(),
    severity: "INFO",
    message: line.trim(),
  }
}
