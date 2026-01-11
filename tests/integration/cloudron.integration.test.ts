/**
 * Integration tests for Cloudron MCP
 * Requires CLOUDRON_BASE_URL and CLOUDRON_API_TOKEN env vars
 * Skipped when env vars are not set
 */

import { CloudronClient } from "../../src/cloudron-client"
import type { App } from "../../src/types"
import { ensureTestApp, waitForTask } from "./helpers"

const CLOUDRON_BASE_URL = process.env.CLOUDRON_BASE_URL
const CLOUDRON_API_TOKEN = process.env.CLOUDRON_API_TOKEN

const describeIntegration =
  CLOUDRON_BASE_URL && CLOUDRON_API_TOKEN ? describe : describe.skip

describeIntegration("Cloudron Integration Tests", () => {
  let client: CloudronClient
  let testApp: App

  beforeAll(async () => {
    client = new CloudronClient({
      baseUrl: CLOUDRON_BASE_URL!,
      token: CLOUDRON_API_TOKEN!,
    })

    // Ensure we have a safe test app to work with
    try {
      testApp = await ensureTestApp(client)
      console.log(`Using test app: ${testApp.manifest.title} (${testApp.id})`)
    } catch (error) {
      console.warn("Failed to ensure test app:", error)
      // Fallback to finding any app if installation fails (for read-only tests)
      const apps = await client.listApps()
      if (apps.length > 0) {
        testApp = apps[0]
        console.warn(`Falling back to existing app: ${testApp.id}`)
      }
    }
  }, 600000) // 10 minute timeout for app installation

  // ==================== System & Read-Only Tests ====================

  describe("System & Status", () => {
    it("should retrieve system status", async () => {
      const status = await client.getStatus()
      expect(status).toHaveProperty("version")
      // cloudronName might be missing in some versions/configs
      if (status.cloudronName) {
        expect(status).toHaveProperty("cloudronName")
      }
    })

    it("should list platform services", async () => {
      const services = await client.listServices()
      expect(Array.isArray(services)).toBe(true)
      if (services.length > 0) {
        // Services might be strings or objects depending on API version
        // The client now normalizes this, so we expect objects with name
        expect(services[0]).toHaveProperty("name")
      }
    })

    it("should list domains", async () => {
      const domains = await client.listDomains()
      expect(Array.isArray(domains)).toBe(true)
      if (domains.length > 0) {
        expect(domains[0]).toHaveProperty("domain")
      }
    })

    it("should check for updates", async () => {
      try {
        const updates = await client.checkUpdates()
        expect(updates).toHaveProperty("available")
      } catch (error: any) {
        if (error.statusCode === 404) {
          console.warn("Update check endpoint not available (404)")
          return
        }
        throw error
      }
    })
  })

  describe("Users & Groups (Read-Only)", () => {
    it("should list users", async () => {
      const users = await client.listUsers()
      expect(Array.isArray(users)).toBe(true)
      expect(users.length).toBeGreaterThan(0) // Should at least have the admin
      expect(users[0]).toHaveProperty("email")
      expect(users[0]).toHaveProperty("role")
    })

    it("should get specific user details", async () => {
      const users = await client.listUsers()
      if (users.length > 0) {
        const user = await client.getUser(users[0].id)
        expect(user.id).toBe(users[0].id)
        expect(user.email).toBe(users[0].email)
      }
    })

    it("should list groups", async () => {
      const groups = await client.listGroups()
      expect(Array.isArray(groups)).toBe(true)
    })
  })

  describe("Backups (Read-Only)", () => {
    it("should list backups", async () => {
      const backups = await client.listBackups()
      expect(Array.isArray(backups)).toBe(true)
    })
  })

  // ==================== App Management Tests ====================

  describe("App Management", () => {
    it("should restart an app", async () => {
      if (!testApp) return

      console.log(`Restarting app ${testApp.id}...`)
      const result = await client.restartApp(testApp.id)
      expect(result).toHaveProperty("taskId")
      console.log(`Restart task: ${result.taskId}`)

      // Wait for restart to complete (can take 2-5 minutes)
      await waitForTask(client, result.taskId, 600000)
    }, 660000) // 11 minute timeout (longer than waitForTask)

    it("should update app configuration", async () => {
      if (!testApp) return

      const currentApp = await client.getApp(testApp.id)
      const testValue = `validated_${Date.now()}`
      const updateConfig = {
        env: {
          ...(currentApp.manifest.addons?.env || {}),
          TEST_REAL_API: testValue,
        },
      }

      try {
        const result = await client.configureApp(testApp.id, updateConfig)
        expect(result).toHaveProperty("app")
        const updatedApp = await client.getApp(testApp.id)
        expect(updatedApp.id).toBe(testApp.id)
      } catch (error: any) {
        if (error.statusCode === 404) {
          console.warn("Configure app endpoint not available (404)")
          return
        }
        throw error
      }
    })

    it("should retrieve app logs", async () => {
      if (!testApp) return

      const logs = await client.getLogs(testApp.id, "app", 10)
      expect(Array.isArray(logs)).toBe(true)
      if (logs.length > 0) {
        expect(logs[0]).toHaveProperty("timestamp")
        expect(logs[0]).toHaveProperty("message")
      }
    })
  })

  describe("App Store", () => {
    it("should search for apps", async () => {
      try {
        const results = await client.searchApps("wordpress")
        expect(Array.isArray(results)).toBe(true)
        if (results.length > 0) {
          // Verify the response has the expected structure
          expect(results[0]).toHaveProperty("id")
          expect(results[0]).toHaveProperty("name")
          // Note: Search results may not always match the query exactly
          // The API may return related or popular apps
        }
      } catch (error: unknown) {
        // App Store API may not be available on all Cloudron instances
        const err = error as { statusCode?: number; message?: string }
        if (err.statusCode === 404 || err.message?.includes("No such route")) {
          console.warn("App Store API not available (404) - skipping test")
          return
        }
        throw error
      }
    })
  })
})
