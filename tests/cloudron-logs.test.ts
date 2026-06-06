/**
 * Handler-level tests for cloudron_get_logs
 * Pure parseLogLine tests are in tests/client/parse-log-line.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { logHandlers } from "../src/tools/handlers/logs"
import {
  cleanupTestEnv,
  createMockFetch,
  createTestContext,
  setupTestEnv,
} from "./helpers/cloudron-mock"
import { assertHasTextContent, assertSuccess } from "./helpers/mcp-assert"

const ndjsonLines = [
  '{"realtimeTimestamp":"2025-01-01T12:00:00.000Z","message":"Server started on port 3000"}',
  '{"realtimeTimestamp":"2025-01-01T12:00:01.000Z","message":"Connected to database"}',
]
const ndjsonText = ndjsonLines.join("\n")

describe("cloudron_get_logs", () => {
  beforeAll(() => setupTestEnv())
  afterAll(() => cleanupTestEnv())

  describe("app logs", () => {
    it("should return formatted app logs with entry count", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/app-1/logs?lines=100": {
          ok: true,
          status: 200,
          data: ndjsonText,
        },
      })

      const ctx = createTestContext()
      const response = await logHandlers.cloudron_get_logs(
        { resourceId: "app-1", type: "app" },
        ctx,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("Application logs for app-1")
      expect(text).toContain("2 entries")
      expect(text).toContain("Server started on port 3000")
      expect(text).toContain("Connected to database")
    })

    it("should clamp lines parameter to max 1000", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/app-1/logs?lines=1000": {
          ok: true,
          status: 200,
          data: ndjsonText,
        },
      })

      const ctx = createTestContext()
      const response = await logHandlers.cloudron_get_logs(
        { resourceId: "app-1", type: "app", lines: 5000 },
        ctx,
      )

      assertSuccess(response)
      // Verify the correct clamped endpoint was called (mock key matched)
      expect(assertHasTextContent(response)).toContain("2 entries")
    })

    it("should handle empty logs", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/app-1/logs?lines=100": {
          ok: true,
          status: 200,
          data: "",
        },
      })

      const ctx = createTestContext()
      const response = await logHandlers.cloudron_get_logs(
        { resourceId: "app-1", type: "app" },
        ctx,
      )

      assertSuccess(response)
      expect(assertHasTextContent(response)).toContain("0 entries")
    })
  })

  describe("service logs", () => {
    it("should return formatted service logs with entry count", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/services/nginx/logs?lines=100": {
          ok: true,
          status: 200,
          data: '{"realtimeTimestamp":"2025-01-01T00:00:00Z","message":"nginx started"}',
        },
      })

      const ctx = createTestContext()
      const response = await logHandlers.cloudron_get_logs(
        { resourceId: "nginx", type: "service" },
        ctx,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("Service logs for nginx")
      expect(text).toContain("1 entries")
    })
  })

  describe("validation", () => {
    it("should throw for missing resourceId", async () => {
      const ctx = createTestContext()
      await expect(
        logHandlers.cloudron_get_logs({ resourceId: "", type: "app" }, ctx),
      ).rejects.toThrow("resourceId is required")
    })

    it("should throw for invalid type", async () => {
      const ctx = createTestContext()
      await expect(
        logHandlers.cloudron_get_logs(
          { resourceId: "x", type: "invalid" },
          ctx,
        ),
      ).rejects.toThrow("Invalid type")
    })
  })
})
