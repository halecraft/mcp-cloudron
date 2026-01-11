import { CloudronClient } from "../../src/cloudron-client"
import type { App } from "../../src/types"

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix: string): string {
  return `mcp-test-${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

/**
 * Wait for a task to complete
 */
export async function waitForTask(
  client: CloudronClient,
  taskId: string,
  timeoutMs = 300000, // 5 minutes default
): Promise<void> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    const status = await client.getTaskStatus(taskId)
    if (status.state === "success") {
      return
    }
    if (status.state === "error") {
      throw new Error(`Task failed: ${status.error?.message || status.message}`)
    }
    if (status.state === "cancelled") {
      throw new Error("Task cancelled")
    }
    // Wait 2 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error(`Task timed out after ${timeoutMs}ms`)
}

/**
 * Ensure a test app exists
 * Tries to find an app named "mcp-integration-test-app"
 * If not found, installs "io.cloudron.surfer" (Surfer)
 */
export async function ensureTestApp(client: CloudronClient): Promise<App> {
  const apps = await client.listApps()
  const existingApp = apps.find((app) => app.location === "mcp-test")
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
  const newApp = newApps.find((app) => app.location === "mcp-test")
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
