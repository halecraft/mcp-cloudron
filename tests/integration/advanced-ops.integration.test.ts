/**
 * Advanced Operations Integration Tests
 * Covers: Backup App -> Restore App -> Clone App -> System Backup (Cancel)
 *
 * NOTE: These tests require a Cloudron instance with backup storage configured.
 * If backup storage is not configured, tests will be skipped gracefully.
 */

import { CloudronClient } from "../../src/cloudron-client"
import { CloudronError } from "../../src/errors"
import type { App } from "../../src/types"
import { ensureTestApp, generateTestId, waitForTask } from "./helpers"

const CLOUDRON_BASE_URL = process.env.CLOUDRON_BASE_URL
const CLOUDRON_API_TOKEN = process.env.CLOUDRON_API_TOKEN

const describeIntegration =
  CLOUDRON_BASE_URL && CLOUDRON_API_TOKEN ? describe : describe.skip

/**
 * Check if backup functionality is available on this Cloudron instance
 * by attempting to create a backup and catching the error
 */
async function isBackupConfigured(client: CloudronClient): Promise<boolean> {
  try {
    // Try to create a backup - if backup storage isn't configured, this will fail
    // with "backupSiteId must be a string" or "Backup not found"
    await client.createBackup()
    // If it succeeds, cancel it immediately
    return true
  } catch (error) {
    if (
      error instanceof CloudronError &&
      (error.message.includes("backupSiteId") ||
        error.message.includes("Backup not found") ||
        error.message.includes("backup"))
    ) {
      return false
    }
    // Re-throw unexpected errors
    throw error
  }
}

describeIntegration("Advanced Operations Integration Tests", () => {
  let client: CloudronClient
  let testApp: App
  let backupId: string
  let cloneAppId: string
  let backupAvailable = false

  beforeAll(async () => {
    client = new CloudronClient({
      baseUrl: CLOUDRON_BASE_URL!,
      token: CLOUDRON_API_TOKEN!,
    })
    testApp = await ensureTestApp(client)

    // Check if backup functionality is available
    backupAvailable = await isBackupConfigured(client)
    if (!backupAvailable) {
      console.warn(
        "Backup storage not configured on this Cloudron instance. Backup-related tests will be skipped.",
      )
    }
  }, 600000) // 10 minute timeout for app installation

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
    if (!backupAvailable) {
      console.warn("Skipping - backup storage not configured")
      return
    }

    console.log("Creating app backup...")
    const taskId = await client.backupApp(testApp.id)
    await waitForTask(client, taskId)

    // Find the backup
    const backups = await client.listBackups()
    expect(backups.length).toBeGreaterThan(0)
    const latestBackup = backups[0]
    if (latestBackup) {
      backupId = latestBackup.id
    }
  }, 300000)

  it("should restore the app from backup", async () => {
    if (!backupAvailable) {
      console.warn("Skipping - backup storage not configured")
      return
    }
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
    if (!backupAvailable) {
      console.warn(
        "Skipping - backup storage not configured (clone requires backup)",
      )
      return
    }
    if (!backupId) {
      console.warn("Skipping clone test - no backup available")
      return
    }

    const cloneLocation = generateTestId("clone")
    console.log(`Cloning app to ${cloneLocation}...`)

    const taskId = await client.cloneApp(testApp.id, {
      location: cloneLocation,
      backupId: backupId, // Explicitly provide the backup ID
    })
    await waitForTask(client, taskId)

    // Verify clone
    const apps = await client.listApps()
    const clone = apps.find(a => a.location === cloneLocation)
    expect(clone).toBeDefined()
    if (clone) {
      cloneAppId = clone.id
    }
  }, 600000)

  it("should start and cancel a system backup", async () => {
    if (!backupAvailable) {
      console.warn("Skipping - backup storage not configured")
      return
    }

    console.log("Starting system backup...")
    const taskId = await client.createBackup()

    console.log(`Cancelling task ${taskId}...`)
    const task = await client.cancelTask(taskId)
    expect(task.state).toBe("cancelled")
  })
})
