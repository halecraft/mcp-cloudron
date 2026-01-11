/**
 * Advanced Operations Integration Tests
 * Covers: Backup App -> Restore App -> Clone App -> System Backup (Cancel)
 */

import { CloudronClient } from "../../src/cloudron-client"
import type { App } from "../../src/types"
import { ensureTestApp, generateTestId, waitForTask } from "./helpers"

const CLOUDRON_BASE_URL = process.env.CLOUDRON_BASE_URL
const CLOUDRON_API_TOKEN = process.env.CLOUDRON_API_TOKEN

const describeIntegration =
  CLOUDRON_BASE_URL && CLOUDRON_API_TOKEN ? describe : describe.skip

describeIntegration("Advanced Operations Integration Tests", () => {
  let client: CloudronClient
  let testApp: App
  let backupId: string
  let cloneAppId: string

  beforeAll(async () => {
    client = new CloudronClient({
      baseUrl: CLOUDRON_BASE_URL!,
      token: CLOUDRON_API_TOKEN!,
    })
    testApp = await ensureTestApp(client)
  })

  afterAll(async () => {
    // Cleanup clone
    if (cloneAppId) {
      try {
        const { taskId } = await client.uninstallApp(cloneAppId)
        await waitForTask(client, taskId)
      } catch (error) {
        console.warn("Failed to cleanup clone app:", error)
      }
    }
  })

  it("should create an app backup", async () => {
    console.log("Creating app backup...")
    const taskId = await client.backupApp(testApp.id)
    await waitForTask(client, taskId)

    // Find the backup
    const backups = await client.listBackups()
    expect(backups.length).toBeGreaterThan(0)
    backupId = backups[0].id // Assume the newest is ours
  }, 300000)

  it("should restore the app from backup", async () => {
    if (!backupId) {
      console.warn("Skipping restore test - no backup created")
      return
    }
    console.log(`Restoring app from backup ${backupId}...`)
    const taskId = await client.restoreApp(testApp.id, { backupId })
    await waitForTask(client, taskId)

    const app = await client.getApp(testApp.id)
    expect(app.runState).toBe("running")
  }, 300000)

  it("should clone the app", async () => {
    const cloneLocation = generateTestId("clone")
    console.log(`Cloning app to ${cloneLocation}...`)
    
    const taskId = await client.cloneApp(testApp.id, {
      location: cloneLocation
    })
    await waitForTask(client, taskId)

    // Verify clone
    const apps = await client.listApps()
    const clone = apps.find(a => a.location === cloneLocation)
    expect(clone).toBeDefined()
    cloneAppId = clone!.id
  }, 600000)

  it("should start and cancel a system backup", async () => {
    console.log("Starting system backup...")
    const taskId = await client.createBackup()
    
    console.log(`Cancelling task ${taskId}...`)
    const task = await client.cancelTask(taskId)
    expect(task.state).toBe("cancelled")
  })
})
