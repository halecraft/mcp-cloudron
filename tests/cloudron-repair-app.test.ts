/**
 * Tests for cloudron_repair_app tool
 */

import { appHandlers } from "../src/tools/handlers/apps"
import {
  cleanupTestEnv,
  createMockFetch,
  createTestContext,
  setupTestEnv,
} from "./helpers/cloudron-mock"
import { assertHasTextContent, assertSuccess } from "./helpers/mcp-assert"

describe("cloudron_repair_app tool", () => {
  beforeAll(() => {
    setupTestEnv()
  })

  afterAll(() => {
    cleanupTestEnv()
  })

  describe("Happy path", () => {
    it("should repair app and return task ID", async () => {
      global.fetch = createMockFetch({
        "POST https://my.example.com/api/v1/apps/app-1/repair": {
          ok: true,
          status: 202,
          data: { taskId: "task-repair-123" },
        },
      })

      const ctx = createTestContext()
      const response = await appHandlers.cloudron_repair_app(
        { appId: "app-1" },
        ctx,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("initiated successfully")
      expect(text).toContain("task-repair-123")
      expect(text).toContain("automatic repair")
    })
  })

  describe("Error handling", () => {
    it("should handle API error", async () => {
      global.fetch = createMockFetch({
        "POST https://my.example.com/api/v1/apps/app-1/repair": {
          ok: false,
          status: 500,
          data: { message: "Internal server error" },
        },
      })

      const ctx = createTestContext()
      await expect(
        appHandlers.cloudron_repair_app({ appId: "app-1" }, ctx),
      ).rejects.toThrow()
    })
  })

  describe("Validation", () => {
    it("should throw error for missing appId", async () => {
      const ctx = createTestContext()
      await expect(appHandlers.cloudron_repair_app({}, ctx)).rejects.toThrow(
        "appId is required",
      )
    })
  })
})
