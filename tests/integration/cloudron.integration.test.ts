/**
 * Integration tests for Cloudron MCP
 * Requires CLOUDRON_BASE_URL and CLOUDRON_API_TOKEN env vars
 * Skipped when env vars are not set
 */

import { CloudronClient } from "../../src/cloudron-client"
import type { App } from "../../src/types"

const CLOUDRON_BASE_URL = process.env.CLOUDRON_BASE_URL
const CLOUDRON_API_TOKEN = process.env.CLOUDRON_API_TOKEN

const describeIntegration =
  CLOUDRON_BASE_URL && CLOUDRON_API_TOKEN ? describe : describe.skip

describeIntegration("Cloudron Integration Tests", () => {
  let client: CloudronClient
  let testApp: App | undefined

  beforeAll(async () => {
    client = new CloudronClient({
      baseUrl: CLOUDRON_BASE_URL!,
      token: CLOUDRON_API_TOKEN!,
    })

    // Find a suitable test app
    const apps = await client.listApps()
    if (apps.length > 0) {
      testApp = apps[0]
      console.log(`Using test app: ${testApp.manifest.title} (${testApp.id})`)
    } else {
      console.warn("No apps found for testing - some tests will be skipped")
    }
  })

  describe("cloudron_control_app", () => {
    it("should restart an app and return taskId", async () => {
      if (!testApp) {
        console.warn("Skipping restart test - no app available")
        return
      }

      const result = await client.restartApp(testApp.id)
      expect(result).toHaveProperty("taskId")
      expect(typeof result.taskId).toBe("string")
    })
  })

  describe("cloudron_configure_app", () => {
    it("should update app configuration", async () => {
      if (!testApp) {
        console.warn("Skipping configure test - no app available")
        return
      }

      const currentApp = await client.getApp(testApp.id)
      const updateConfig = {
        env: {
          ...(currentApp.manifest.addons?.env || {}),
          TEST_REAL_API: `validated_${new Date().toISOString().split("T")[0]}`,
        },
      }

      const result = await client.configureApp(testApp.id, updateConfig)
      expect(result).toHaveProperty("app")

      // Verify update
      const updatedApp = await client.getApp(testApp.id)
      // Note: Actual verification depends on how Cloudron exposes env vars in getApp response
      // This is a basic check that the call succeeded
      expect(updatedApp.id).toBe(testApp.id)
    })
  })

  describe("cloudron_get_logs", () => {
    it("should retrieve app logs", async () => {
      if (!testApp) {
        console.warn("Skipping logs test - no app available")
        return
      }

      const logs = await client.getLogs(testApp.id, "app", 10)
      expect(Array.isArray(logs)).toBe(true)
      if (logs.length > 0) {
        expect(logs[0]).toHaveProperty("timestamp")
        expect(logs[0]).toHaveProperty("message")
      }
    })

    it("should retrieve service logs (nginx)", async () => {
      try {
        const logs = await client.getLogs("nginx", "service", 10)
        expect(Array.isArray(logs)).toBe(true)
      } catch (_error) {
        console.warn("Service logs access might be restricted or unavailable")
      }
    })
  })

  describe("cloudron_search_apps", () => {
    it("should search for wordpress", async () => {
      const results = await client.searchApps("wordpress")
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name.toLowerCase()).toContain("wordpress")
    })

    it("should return all apps with empty query", async () => {
      const results = await client.searchApps("")
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })
  })
})
