/**
 * parseLogLine unit tests
 * Pure function tests for all log format parsing — no HTTP mocking needed.
 */

import { describe, expect, it } from "vitest"
import { parseLogLine } from "../../src/client/parse-log-line.js"

describe("parseLogLine", () => {
  describe("NDJSON format (Cloudron default)", () => {
    it("should parse a valid NDJSON log line", () => {
      const line =
        '{"realtimeTimestamp":"2025-12-24T12:00:00.000Z","message":"Application started"}'

      const result = parseLogLine(line)

      expect(result.timestamp).toBe("2025-12-24T12:00:00.000Z")
      expect(result.severity).toBe("INFO")
      expect(result.message).toBe("Application started")
    })

    it("should parse NDJSON with extra fields (ignores them)", () => {
      const line =
        '{"realtimeTimestamp":"2025-01-01T00:00:00Z","message":"hello","extra":"ignored"}'

      const result = parseLogLine(line)

      expect(result.timestamp).toBe("2025-01-01T00:00:00Z")
      expect(result.message).toBe("hello")
    })

    it("should fall through to regex if NDJSON lacks required fields", () => {
      const line = '{"foo":"bar"}'

      // Falls through all parsers, ends up as plain text
      const result = parseLogLine(line)

      expect(result.severity).toBe("INFO")
      expect(result.message).toBe('{"foo":"bar"}')
    })

    it("should fall through to regex if NDJSON is malformed JSON", () => {
      const line = "{broken json"

      const result = parseLogLine(line)

      expect(result.severity).toBe("INFO")
      expect(result.message).toBe("{broken json")
    })
  })

  describe("ISO timestamp format", () => {
    it("should parse ISO timestamp with bracketed severity", () => {
      const line = "2025-12-24T12:00:00Z [INFO] Application started"

      const result = parseLogLine(line)

      expect(result.timestamp).toBe("2025-12-24T12:00:00Z")
      expect(result.severity).toBe("INFO")
      expect(result.message).toBe("Application started")
    })

    it("should parse ISO timestamp with unbracketed severity", () => {
      const line = "2025-12-24T12:00:00Z ERROR Something went wrong"

      const result = parseLogLine(line)

      expect(result.timestamp).toBe("2025-12-24T12:00:00Z")
      expect(result.severity).toBe("ERROR")
      expect(result.message).toBe("Something went wrong")
    })

    it("should parse ISO timestamp with milliseconds", () => {
      const line = "2025-12-24T12:00:00.123Z [DEBUG] Debug message"

      const result = parseLogLine(line)

      expect(result.timestamp).toBe("2025-12-24T12:00:00.123Z")
      expect(result.severity).toBe("DEBUG")
      expect(result.message).toBe("Debug message")
    })
  })

  describe("Syslog format", () => {
    it("should parse syslog format with service and pid", () => {
      const line =
        "Dec 24 12:00:00 cloudron nginx[1234]: [INFO] Service started"

      const result = parseLogLine(line)

      expect(result.timestamp).toBe("Dec 24 12:00:00")
      expect(result.severity).toBe("INFO")
      expect(result.message).toBe("Service started")
    })

    it("should parse syslog format with ERROR severity", () => {
      const line =
        "Dec 24 12:01:00 cloudron nginx[1234]: [ERROR] Port binding failed"

      const result = parseLogLine(line)

      expect(result.timestamp).toBe("Dec 24 12:01:00")
      expect(result.severity).toBe("ERROR")
      expect(result.message).toBe("Port binding failed")
    })
  })

  describe("Simple bracket format", () => {
    it("should parse bracketed severity", () => {
      const line = "[WARN] Memory usage high"

      const result = parseLogLine(line)

      expect(result.severity).toBe("WARN")
      expect(result.message).toBe("Memory usage high")
      // Timestamp should be current time (ISO format)
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it("should parse unbracketed severity", () => {
      const line = "FATAL Out of disk space"

      const result = parseLogLine(line)

      expect(result.severity).toBe("FATAL")
      expect(result.message).toBe("Out of disk space")
    })

    it("should not treat random uppercase word as severity", () => {
      const line = "HELLO world"

      const result = parseLogLine(line)

      // "HELLO" is not a recognized severity level
      expect(result.severity).toBe("INFO")
      expect(result.message).toBe("HELLO world")
    })
  })

  describe("Plain text fallback", () => {
    it("should treat plain text as INFO with current timestamp", () => {
      const line = "Plain text log entry without formatting"

      const result = parseLogLine(line)

      expect(result.severity).toBe("INFO")
      expect(result.message).toBe("Plain text log entry without formatting")
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe("Edge cases", () => {
    it("should handle empty string", () => {
      const result = parseLogLine("")

      expect(result.severity).toBe("INFO")
      expect(result.message).toBe("")
    })

    it("should trim whitespace from message", () => {
      const line = "[INFO]   padded message   "

      const result = parseLogLine(line)

      expect(result.message).toBe("padded message")
    })
  })
})
