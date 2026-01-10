/**
 * Tests for cloudron_backup_app tool
 */

import { CloudronClient } from "../src/cloudron-client"
import { appHandlers } from "../src/tools/handlers/apps"
import {
  cleanupTestEnv,
  createMockFetch,
  mockCloudronStatus,
  setupTestEnv,
} from "./helpers/cloudron-mock"
import { assertHasTextContent, assertSuccess } from "./helpers/mcp-assert"

describe("cloudron_backup_app tool", () => {
  beforeAll(() => {
    setupTestEnv()
  })

  afterAll(() => {
    cleanupTestEnv()
  })

  describe("Happy path", () => {
    it("should create app backup and return task ID", async () => {
      global.fetch = createMockFetch({
        // Storage check
        "GET https://my.example.com/api/v1/cloudron/status": {
          ok: true,
          status: 200,
          data: mockCloudronStatus,
        },
        // Backup operation
        "POST https://my.example.com/api/v1/apps/app-1/backup": {
          ok: true,
          status: 202,
          data: { taskId: "task-backup-123" },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_backup_app(
        { appId: "app-1" },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("initiated successfully")
      expect(text).toContain("task-backup-123")
      expect(text).toContain("storage check passed")
    })
  })

  describe("Error handling", () => {
    it("should fail when storage is insufficient", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/cloudron/status": {
          ok: true,
          status: 200,
          data: {
            ...mockCloudronStatus,
            disk: {
              total: 107374182400,
              used: 106837319680, // 99.5% used
              free: 536862720, // 512 MB free
              percent: 99.5,
            },
          },
        },
      })

      const client = new CloudronClient()
      await expect(
        appHandlers.cloudron_backup_app({ appId: "app-1" }, client),
      ).rejects.toThrow("Insufficient storage")
    })

    it("should handle API error", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/cloudron/status": {
          ok: true,
          status: 200,
          data: mockCloudronStatus,
        },
        "POST https://my.example.com/api/v1/apps/app-1/backup": {
          ok: false,
          status: 500,
          data: { message: "Internal server error" },
        },
      })

      const client = new CloudronClient()
      await expect(
        appHandlers.cloudron_backup_app({ appId: "app-1" }, client),
      ).rejects.toThrow()
    })
  })

  describe("Validation", () => {
    it("should throw error for missing appId", async () => {
      const client = new CloudronClient()
      await expect(appHandlers.cloudron_backup_app({}, client)).rejects.toThrow(
        "appId is required",
      )
    })
  })
})
