/**
 * Tests for cloudron_clone_app tool
 */

import { appHandlers } from "../src/tools/handlers/apps"
import {
  cleanupTestEnv,
  createMockFetch,
  createTestContext,
  mockApps,
  setupTestEnv,
} from "./helpers/cloudron-mock"
import { assertHasTextContent, assertSuccess } from "./helpers/mcp-assert"

describe("cloudron_clone_app tool", () => {
  beforeAll(() => {
    setupTestEnv()
  })

  afterAll(() => {
    cleanupTestEnv()
  })

  describe("Happy path", () => {
    it("should clone app with required parameters only", async () => {
      global.fetch = createMockFetch({
        // Validation: get source app
        "GET https://my.example.com/api/v1/apps/app-1": {
          ok: true,
          status: 200,
          data: mockApps[0],
        },
        // Validation: list apps to check target location
        "GET https://my.example.com/api/v1/apps": {
          ok: true,
          status: 200,
          data: { apps: mockApps },
        },
        // Clone operation
        "POST https://my.example.com/api/v1/apps/app-1/clone": {
          ok: true,
          status: 202,
          data: { taskId: "task-clone-123" },
        },
      })

      const ctx = createTestContext()
      const response = await appHandlers.cloudron_clone_app(
        { appId: "app-1", location: "newapp" },
        ctx,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("initiated successfully")
      expect(text).toContain("task-clone-123")
      expect(text).toContain("newapp")
    })

    it("should clone app with all optional parameters", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/app-1": {
          ok: true,
          status: 200,
          data: mockApps[0],
        },
        "GET https://my.example.com/api/v1/apps": {
          ok: true,
          status: 200,
          data: { apps: mockApps },
        },
        "POST https://my.example.com/api/v1/apps/app-1/clone": {
          ok: true,
          status: 202,
          data: { taskId: "task-clone-456" },
        },
      })

      const ctx = createTestContext()
      const response = await appHandlers.cloudron_clone_app(
        {
          appId: "app-1",
          location: "cloned",
          domain: "other.com",
          backupId: "backup-123",
        },
        ctx,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("task-clone-456")
      expect(text).toContain("cloned.other.com")
    })
  })

  describe("Error handling", () => {
    it("should fail when source app does not exist", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/nonexistent": {
          ok: false,
          status: 404,
          data: { message: "App not found" },
        },
      })

      const ctx = createTestContext()
      await expect(
        appHandlers.cloudron_clone_app(
          { appId: "nonexistent", location: "newapp" },
          ctx,
        ),
      ).rejects.toThrow("does not exist")
    })

    it("should fail when target location is already in use", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/app-1": {
          ok: true,
          status: 200,
          data: mockApps[0], // WordPress at blog.example.com
        },
        "GET https://my.example.com/api/v1/apps": {
          ok: true,
          status: 200,
          data: { apps: mockApps },
        },
      })

      const ctx = createTestContext()
      // Try to clone to existing location "blog" on same domain
      await expect(
        appHandlers.cloudron_clone_app(
          { appId: "app-1", location: "blog" },
          ctx,
        ),
      ).rejects.toThrow("already in use")
    })
  })

  describe("Validation", () => {
    it("should throw error for missing appId", async () => {
      const ctx = createTestContext()
      await expect(
        appHandlers.cloudron_clone_app({ location: "newapp" }, ctx),
      ).rejects.toThrow("appId is required")
    })

    it("should throw error for missing location", async () => {
      const ctx = createTestContext()
      await expect(
        appHandlers.cloudron_clone_app({ appId: "app-1" }, ctx),
      ).rejects.toThrow("location is required")
    })
  })
})
