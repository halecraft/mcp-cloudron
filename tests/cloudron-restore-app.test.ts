/**
 * Tests for cloudron_restore_app tool
 */

import { CloudronClient } from "../src/cloudron-client"
import { appHandlers } from "../src/tools/handlers/apps"
import {
  cleanupTestEnv,
  createMockFetch,
  mockApps,
  mockBackups,
  mockCloudronStatus,
  setupTestEnv,
} from "./helpers/cloudron-mock"
import { assertHasTextContent, assertSuccess } from "./helpers/mcp-assert"

describe("cloudron_restore_app tool", () => {
  beforeAll(() => {
    setupTestEnv()
  })

  afterAll(() => {
    cleanupTestEnv()
  })

  describe("Happy path", () => {
    it("should restore app from backup", async () => {
      global.fetch = createMockFetch({
        // Validation: get app
        "GET https://my.example.com/api/v1/apps/app-1": {
          ok: true,
          status: 200,
          data: mockApps[0],
        },
        // Validation: check storage
        "GET https://my.example.com/api/v1/cloudron/status": {
          ok: true,
          status: 200,
          data: mockCloudronStatus,
        },
        // Validation: list backups
        "GET https://my.example.com/api/v1/backups": {
          ok: true,
          status: 200,
          data: { backups: mockBackups },
        },
        // Restore operation
        "POST https://my.example.com/api/v1/apps/app-1/restore": {
          ok: true,
          status: 202,
          data: { taskId: "task-restore-123" },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_restore_app(
        { appId: "app-1", backupId: "backup-1" },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("initiated successfully")
      expect(text).toContain("task-restore-123")
      expect(text).toContain("DESTRUCTIVE")
    })
  })

  describe("Error handling", () => {
    it("should fail when backup does not exist", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/app-1": {
          ok: true,
          status: 200,
          data: mockApps[0],
        },
        "GET https://my.example.com/api/v1/cloudron/status": {
          ok: true,
          status: 200,
          data: mockCloudronStatus,
        },
        "GET https://my.example.com/api/v1/backups": {
          ok: true,
          status: 200,
          data: { backups: mockBackups },
        },
      })

      const client = new CloudronClient()
      await expect(
        appHandlers.cloudron_restore_app(
          { appId: "app-1", backupId: "nonexistent-backup" },
          client,
        ),
      ).rejects.toThrow("not found")
    })

    it("should fail when app does not exist", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/nonexistent": {
          ok: false,
          status: 404,
          data: { message: "App not found" },
        },
      })

      const client = new CloudronClient()
      await expect(
        appHandlers.cloudron_restore_app(
          { appId: "nonexistent", backupId: "backup-1" },
          client,
        ),
      ).rejects.toThrow("does not exist")
    })
  })

  describe("Validation", () => {
    it("should throw error for missing appId", async () => {
      const client = new CloudronClient()
      await expect(
        appHandlers.cloudron_restore_app({ backupId: "backup-1" }, client),
      ).rejects.toThrow("appId is required")
    })

    it("should throw error for missing backupId", async () => {
      const client = new CloudronClient()
      await expect(
        appHandlers.cloudron_restore_app({ appId: "app-1" }, client),
      ).rejects.toThrow("backupId is required")
    })
  })
})
