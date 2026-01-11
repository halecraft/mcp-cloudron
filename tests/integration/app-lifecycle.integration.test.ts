/**
 * App Lifecycle Integration Tests
 * Covers: Install -> Configure -> Control -> Uninstall
 */

import { CloudronClient } from "../../src/cloudron-client"
import { cleanupOldTestApps, generateTestId, waitForTask } from "./helpers"

const CLOUDRON_BASE_URL = process.env.CLOUDRON_BASE_URL
const CLOUDRON_API_TOKEN = process.env.CLOUDRON_API_TOKEN

const describeIntegration =
  CLOUDRON_BASE_URL && CLOUDRON_API_TOKEN ? describe : describe.skip

describeIntegration("App Lifecycle Integration Tests", () => {
  let client: CloudronClient
  let appId: string
  const testLocation = generateTestId("app")

  beforeAll(async () => {
    client = new CloudronClient({
      baseUrl: CLOUDRON_BASE_URL!,
      token: CLOUDRON_API_TOKEN!,
    })

    // Clean up any old test apps before running tests
    console.log("Cleaning up old test apps...")
    await cleanupOldTestApps(client)
  }, 600000) // 10 minute timeout for cleanup

  afterAll(async () => {
    // Cleanup if test failed before uninstall
    if (appId) {
      try {
        const app = await client.getApp(appId).catch(() => null)
        if (app) {
          console.log(`Cleaning up test app ${appId}...`)
          const { taskId } = await client.uninstallApp(appId)
          await waitForTask(client, taskId)
        }
      } catch (error) {
        console.warn("Failed to cleanup test app:", error)
      }
    }
  })

  it("should install an app (Surfer)", async () => {
    const domains = await client.listDomains()
    if (domains.length === 0) {
      throw new Error("No domains available for installation")
    }
    const domain = domains[0].domain

    console.log(`Installing Surfer at ${testLocation}.${domain}...`)
    const taskId = await client.installApp({
      manifestId: "io.cloudron.surfer",
      location: testLocation,
      domain: domain,
      accessRestriction: null,
    })

    await waitForTask(client, taskId)

    // Verify installation
    const apps = await client.listApps()
    console.log(
      `Looking for app with location '${testLocation}' among ${apps.length} apps`,
    )
    console.log(`Available locations: ${apps.map(a => a.location).join(", ")}`)
    const installedApp = apps.find(a => a.location === testLocation)
    if (!installedApp) {
      // Try to find by partial match
      const partialMatch = apps.find(a => a.location?.includes("mcp-test-app"))
      if (partialMatch) {
        console.log(
          `Found partial match: ${partialMatch.location} (id: ${partialMatch.id})`,
        )
      }
    }
    expect(installedApp).toBeDefined()
    expect(installedApp?.installationState).toBe("installed")

    appId = installedApp!.id
  }, 600000) // 10 minute timeout for install

  it("should configure the app", async () => {
    expect(appId).toBeDefined()

    const config = {
      env: {
        TEST_VAR: "lifecycle_test_value",
      },
    }

    const result = await client.configureApp(appId, config)
    expect(result.app.id).toBe(appId)

    // If restart is required, wait for the app to be ready again
    if (result.restartRequired) {
      console.log(
        "Config change requires restart, waiting for app to be ready...",
      )
      // Poll until app is in 'installed' state and 'running'
      let attempts = 0
      const maxAttempts = 60 // 60 * 3s = 3 minutes max
      while (attempts < maxAttempts) {
        const app = await client.getApp(appId)
        if (
          app.installationState === "installed" &&
          app.runState === "running"
        ) {
          console.log("App is ready after config change")
          break
        }
        console.log(
          `Waiting for app... state=${app.installationState}, runState=${app.runState}`,
        )
        await new Promise(resolve => setTimeout(resolve, 3000))
        attempts++
      }
    }

    // Verify app is running
    const app = await client.getApp(appId)
    expect(app.runState).toBe("running")
  }, 300000) // 5 minute timeout for config + restart

  it("should control the app (Stop -> Start -> Restart)", async () => {
    expect(appId).toBeDefined()

    // Stop
    console.log("Stopping app...")
    const stopTask = await client.stopApp(appId)
    await waitForTask(client, stopTask.taskId)
    let app = await client.getApp(appId)
    expect(app.runState).toBe("stopped")

    // Start
    console.log("Starting app...")
    const startTask = await client.startApp(appId)
    await waitForTask(client, startTask.taskId)
    app = await client.getApp(appId)
    expect(app.runState).toBe("running")

    // Restart
    console.log("Restarting app...")
    const restartTask = await client.restartApp(appId)
    await waitForTask(client, restartTask.taskId)
    app = await client.getApp(appId)
    expect(app.runState).toBe("running")
  }, 300000) // 5 minute timeout

  it("should uninstall the app", async () => {
    expect(appId).toBeDefined()

    console.log("Uninstalling app...")
    const { taskId } = await client.uninstallApp(appId)
    await waitForTask(client, taskId)

    // Verify removal
    try {
      await client.getApp(appId)
      fail("App should not exist after uninstall")
    } catch (error: any) {
      expect(error.statusCode).toBe(404)
    }

    // Clear appId so afterAll doesn't try to cleanup again
    appId = ""
  }, 300000)
})
