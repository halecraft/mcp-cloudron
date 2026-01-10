/**
 * Tests for app-related tool handlers
 */

import { CloudronClient } from "../../src/cloudron-client"
import { appHandlers } from "../../src/tools/handlers/apps"
import {
  createMockFetch,
  mockApps,
  mockCloudronStatus,
} from "../helpers/cloudron-mock"
import { assertHasTextContent, assertSuccess } from "../helpers/mcp-assert"

describe("App Handlers", () => {
  describe("cloudron_list_apps", () => {
    it("should return formatted list of apps", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps": {
          ok: true,
          status: 200,
          data: { apps: mockApps },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_list_apps({}, client)

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("Found 3 apps")
      expect(text).toContain("WordPress")
      expect(text).toContain("Nextcloud")
      expect(text).toContain("GitLab")
    })

    it("should handle empty app list", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps": {
          ok: true,
          status: 200,
          data: { apps: [] },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_list_apps({}, client)

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("Found 0 apps")
    })
  })

  describe("cloudron_get_app", () => {
    it("should return formatted app details", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/app-1": {
          ok: true,
          status: 200,
          data: mockApps[0],
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_get_app(
        { appId: "app-1" },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("WordPress")
      expect(text).toContain("app-1")
      expect(text).toContain("installed")
    })

    it("should throw error for missing appId", async () => {
      const client = new CloudronClient()

      await expect(appHandlers.cloudron_get_app({}, client)).rejects.toThrow(
        "appId is required",
      )
    })

    it("should throw error for empty appId", async () => {
      const client = new CloudronClient()

      await expect(
        appHandlers.cloudron_get_app({ appId: "" }, client),
      ).rejects.toThrow("appId is required")
    })
  })

  describe("cloudron_control_app", () => {
    it("should start an app and return task ID", async () => {
      global.fetch = createMockFetch({
        "POST https://my.example.com/api/v1/apps/app-1/start": {
          ok: true,
          status: 202,
          data: { taskId: "task-start-123" },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_control_app(
        { appId: "app-1", action: "start" },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("start initiated successfully")
      expect(text).toContain("task-start-123")
    })

    it("should stop an app and return task ID", async () => {
      global.fetch = createMockFetch({
        "POST https://my.example.com/api/v1/apps/app-1/stop": {
          ok: true,
          status: 202,
          data: { taskId: "task-stop-123" },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_control_app(
        { appId: "app-1", action: "stop" },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("stop initiated successfully")
      expect(text).toContain("task-stop-123")
    })

    it("should restart an app and return task ID", async () => {
      global.fetch = createMockFetch({
        "POST https://my.example.com/api/v1/apps/app-1/restart": {
          ok: true,
          status: 202,
          data: { taskId: "task-restart-123" },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_control_app(
        { appId: "app-1", action: "restart" },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("restart initiated successfully")
      expect(text).toContain("task-restart-123")
    })

    it("should throw error for invalid action", async () => {
      const client = new CloudronClient()

      await expect(
        appHandlers.cloudron_control_app(
          { appId: "app-1", action: "invalid" },
          client,
        ),
      ).rejects.toThrow("Invalid action")
    })
  })

  describe("cloudron_configure_app", () => {
    it("should configure app and return result", async () => {
      global.fetch = createMockFetch({
        "PUT https://my.example.com/api/v1/apps/app-1/configure": {
          ok: true,
          status: 200,
          data: {
            app: mockApps[0],
            restartRequired: true,
          },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_configure_app(
        { appId: "app-1", config: { memoryLimit: 512 } },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("configuration updated successfully")
      expect(text).toContain("Memory limit: 512 MB")
      expect(text).toContain("restart required")
    })

    it("should throw error for empty config", async () => {
      const client = new CloudronClient()

      await expect(
        appHandlers.cloudron_configure_app(
          { appId: "app-1", config: {} },
          client,
        ),
      ).rejects.toThrow("config object cannot be empty")
    })
  })

  describe("cloudron_install_app", () => {
    it("should install app with pre-flight validation", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/appstore/apps?search=io.example.app":
          {
            ok: true,
            status: 200,
            data: {
              apps: [
                {
                  id: "io.example.app",
                  name: "Example App",
                  description: "Test application",
                  version: "1.0.0",
                  iconUrl: null,
                },
              ],
            },
          },
        "GET https://my.example.com/api/v1/cloudron/status": {
          ok: true,
          status: 200,
          data: mockCloudronStatus,
        },
        "POST https://my.example.com/api/v1/apps": {
          ok: true,
          status: 202,
          data: { taskId: "task-install-123" },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_install_app(
        {
          manifestId: "io.example.app",
          location: "myapp",
          domain: "example.com",
          accessRestriction: null,
        },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("Installation initiated")
      expect(text).toContain("task-install-123")
    })
  })

  describe("cloudron_uninstall_app", () => {
    it("should uninstall app with pre-flight validation", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/apps/app-1": {
          ok: true,
          status: 200,
          data: mockApps[0],
        },
        "POST https://my.example.com/api/v1/apps/app-1/uninstall": {
          ok: true,
          status: 202,
          data: { taskId: "task-uninstall-123" },
        },
      })

      const client = new CloudronClient()
      const response = await appHandlers.cloudron_uninstall_app(
        { appId: "app-1" },
        client,
      )

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("Uninstall operation initiated")
      expect(text).toContain("task-uninstall-123")
      expect(text).toContain("DESTRUCTIVE")
    })
  })
})
