/**
 * Tests for cloudron_update_app tool
 */

import { CloudronClient } from "../src/cloudron-client"
import { appHandlers } from "../src/tools/handlers/apps"
import {
  cleanupTestEnv,
  createMockFetch,
  mockApps,
  setupTestEnv,
} from "./helpers/cloudron-mock"
import { assertHasTextContent, assertSuccess } from "./helpers/mcp-assert"

describe("cloudron_update_app tool", () => {
  beforeAll(() => {
    setupTestEnv()
  })

  afterAll(() => {
    cleanupTestEnv()
  })

  describe("Happy path", () => {
    it("should update app to latest version", async () => {
      global.fetch = createMockFetch({
        // Validation: get app
        "GET https://my.example.com/api/v1/apps/app-1": {
          ok: true,
          status: 200,
          data: mockApps[0],
        },
        // Update operation
        "POST https://my.example.com/api/v1/apps/app-1/update": {
          ok: true,
          status: 202,
          data: { taskId: "task-update-123" },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_update_app(
        { appId: "app-1" },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("initiated successfully")
      expect(text).toContain("task-update-123")
      expect(text).toContain("latest version")
    })

    it("should update app to specific version", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/app-1": {
          ok: true,
          status: 200,
          data: mockApps[0],
        },
        "POST https://my.example.com/api/v1/apps/app-1/update": {
          ok: true,
          status: 202,
          data: { taskId: "task-update-456" },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_update_app(
        { appId: "app-1", version: "6.5.0" },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("task-update-456")
      expect(text).toContain("version 6.5.0")
    })

    it("should force update when requested", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/app-1": {
          ok: true,
          status: 200,
          data: mockApps[0],
        },
        "POST https://my.example.com/api/v1/apps/app-1/update": {
          ok: true,
          status: 202,
          data: { taskId: "task-update-789" },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_update_app(
        { appId: "app-1", force: true },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("task-update-789")
    })
  })

  describe("Error handling", () => {
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
        appHandlers.cloudron_update_app({ appId: "nonexistent" }, client),
      ).rejects.toThrow("does not exist")
    })
  })

  describe("Validation", () => {
    it("should throw error for missing appId", async () => {
      const client = new CloudronClient()
      await expect(appHandlers.cloudron_update_app({}, client)).rejects.toThrow(
        "appId is required",
      )
    })
  })
})
