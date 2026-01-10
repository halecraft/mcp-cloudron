/**
 * Tests for cloudron_repair_app tool
 */

import { CloudronClient } from "../src/cloudron-client"
import { appHandlers } from "../src/tools/handlers/apps"
import {
  cleanupTestEnv,
  createMockFetch,
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

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_repair_app(
        { appId: "app-1" },
        client,
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

      const client = new CloudronClient()
      await expect(
        appHandlers.cloudron_repair_app({ appId: "app-1" }, client),
      ).rejects.toThrow()
    })
  })

  describe("Validation", () => {
    it("should throw error for missing appId", async () => {
      const client = new CloudronClient()
      await expect(appHandlers.cloudron_repair_app({}, client)).rejects.toThrow(
        "appId is required",
      )
    })
  })
})
