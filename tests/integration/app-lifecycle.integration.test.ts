/**
 * App Lifecycle Integration Tests
 * Covers: Install -> Configure -> Control -> Uninstall
 */

import { CloudronClient } from "../../src/cloudron-client"
import { generateTestId, waitForTask } from "./helpers"

const CLOUDRON_BASE_URL = process.env.CLOUDRON_BASE_URL
const CLOUDRON_API_TOKEN = process.env.CLOUDRON_API_TOKEN

const describeIntegration =
  CLOUDRON_BASE_URL && CLOUDRON_API_TOKEN ? describe : describe.skip

describeIntegration("App Lifecycle Integration Tests", () => {
  let client: CloudronClient
  let appId: string
  const testLocation = generateTestId("app")

  beforeAll(() => {
    client = new CloudronClient({
      baseUrl: CLOUDRON_BASE_URL!,
      token: CLOUDRON_API_TOKEN!,
    })
  })

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
    const installedApp = apps.find((a) => a.location === testLocation)
    expect(installedApp).toBeDefined()
    expect(installedApp?.installationState).toBe("installed")
    
    appId = installedApp!.id
  }, 600000) // 10 minute timeout for install

  it("should configure the app", async () => {
    expect(appId).toBeDefined()
    
    const config = {
      env: {
        TEST_VAR: "lifecycle_test_value"
      }
    }

    const result = await client.configureApp(appId, config)
    expect(result.app.id).toBe(appId)

    // Verify config change (if possible via getApp, otherwise just trust the call succeeded)
    // Surfer might not expose env vars in getApp, but we can check if it's running
    const app = await client.getApp(appId)
    expect(app.runState).toBe("running")
  })

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
