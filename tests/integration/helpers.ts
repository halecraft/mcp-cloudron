import type { CloudronClient } from "../../src/cloudron-client"
import type { App } from "../../src/types"

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix: string): string {
  return `mcp-test-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

/**
 * Wait for a task to complete
 * @param client - CloudronClient instance
 * @param taskId - Task ID to wait for
 * @param timeoutMs - Timeout in milliseconds (default 10 minutes for app operations)
 */
export async function waitForTask(
  client: CloudronClient,
  taskId: string,
  timeoutMs = 600000, // 10 minutes default (app install can take 5-8 minutes)
): Promise<void> {
  const startTime = Date.now()
  let lastProgress = 0
  while (Date.now() - startTime < timeoutMs) {
    const status = await client.getTaskStatus(taskId)
    if (status.state === "success") {
      console.log(`Task ${taskId} completed successfully`)
      return
    }
    if (status.state === "error") {
      throw new Error(`Task failed: ${status.error?.message || status.message}`)
    }
    if (status.state === "cancelled") {
      throw new Error("Task cancelled")
    }
    // Log progress if changed
    if (status.progress !== undefined && status.progress !== lastProgress) {
      console.log(
        `Task ${taskId}: ${status.progress}% - ${status.message || ""}`,
      )
      lastProgress = status.progress
    }
    // Wait 3 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  throw new Error(`Task timed out after ${timeoutMs}ms`)
}

/**
 * Clean up old test apps that match the mcp-test prefix
 * This ensures tests can run fresh without conflicts
 */
export async function cleanupOldTestApps(
  client: CloudronClient,
): Promise<void> {
  const apps = await client.listApps()
  const testApps = apps.filter(
    app => app.location?.startsWith("mcp-test-") || app.location === "mcp-test",
  )

  if (testApps.length === 0) {
    console.log("No old test apps to clean up")
    return
  }

  console.log(`Found ${testApps.length} old test app(s) to clean up...`)

  for (const app of testApps) {
    try {
      console.log(`Uninstalling old test app: ${app.location} (${app.id})...`)
      const { taskId } = await client.uninstallApp(app.id)
      await waitForTask(client, taskId)
      console.log(`Successfully uninstalled ${app.location}`)
    } catch (error) {
      console.warn(`Failed to uninstall ${app.location}:`, error)
      // Continue with other apps even if one fails
    }
  }
}

/**
 * Ensure a test app exists
 * Tries to find an app named "mcp-test"
 * If not found, installs "io.cloudron.surfer" (Surfer)
 */
export async function ensureTestApp(client: CloudronClient): Promise<App> {
  const apps = await client.listApps()
  const existingApp = apps.find(app => app.location === "mcp-test")
  if (existingApp) {
    return existingApp
  }

  // Install Surfer as a lightweight test app
  // We need a domain. We'll assume the first domain in the list is usable.
  const domains = await client.listDomains()
  if (domains.length === 0) {
    throw new Error("No domains found to install test app")
  }
  const domain = domains[0].domain

  console.log(`Installing test app (Surfer) on mcp-test.${domain}...`)
  const taskId = await client.installApp({
    manifestId: "io.cloudron.surfer",
    location: "mcp-test",
    domain: domain,
    accessRestriction: null,
  })

  await waitForTask(client, taskId)

  // Fetch the installed app
  const newApps = await client.listApps()
  const newApp = newApps.find(app => app.location === "mcp-test")
  if (!newApp) {
    throw new Error("Failed to find installed test app")
  }
  return newApp
}

/**
 * Cleanup test resources
 */
export async function cleanupTestResources(
  client: CloudronClient,
  resources: { appIds?: string[]; userIds?: string[]; groupIds?: string[] },
): Promise<void> {
  if (resources.appIds) {
    for (const appId of resources.appIds) {
      try {
        console.log(`Uninstalling app ${appId}...`)
        const { taskId } = await client.uninstallApp(appId)
        await waitForTask(client, taskId)
      } catch (error) {
        console.warn(`Failed to uninstall app ${appId}:`, error)
      }
    }
  }
  // Add user/group cleanup later when those APIs are implemented/tested
}
