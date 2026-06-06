/**
 * Integration test: log retrieval against real Cloudron instance
 *
 * Usage:
 *   pnpm test:integration tests/integration/logs.integration.test.ts
 *
 * Requires .env with:
 *   CLOUDRON_BASE_URL=https://my.cloudron.io
 *   CLOUDRON_API_TOKEN=your-token
 *
 * Optional .env overrides:
 *   CLOUDRON_TEST_SERVICE=<service-id>     # platform service id, defaults to "mysql"
 *                                          # (must be a Cloudron infrastructure
 *                                          # service like mysql/postgresql/mail,
 *                                          # NOT an installed app)
 */

import { beforeAll, describe, expect, it } from "vitest"
import type { CloudronContext } from "../../src/client/context"
import { createCloudronContext } from "../../src/client/context"

// Capture real env vars before global setup overwrites them with mock values
const BASE_URL = process.env.CLOUDRON_BASE_URL
const API_TOKEN = process.env.CLOUDRON_API_TOKEN
const TEST_SERVICE = process.env.CLOUDRON_TEST_SERVICE || "mysql"
const skip = !BASE_URL || !API_TOKEN

describe.runIf(!skip)("cloudron_get_logs integration", () => {
  let ctx: CloudronContext

  beforeAll(() => {
    // Restore real env vars (overwritten by global setupTestEnv)
    process.env.CLOUDRON_BASE_URL = BASE_URL
    process.env.CLOUDRON_API_TOKEN = API_TOKEN
    ctx = createCloudronContext()
  })

  it("should retrieve service logs without JSON parse errors", async () => {
    // Fetch last 50 lines from the configured test service
    const entries = await ctx.logs.getLogs(TEST_SERVICE, "service", 50)

    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)

    // Each entry should have the LogEntry shape after parsing
    for (const entry of entries) {
      expect(entry).toHaveProperty("timestamp")
      expect(entry).toHaveProperty("severity")
      expect(entry).toHaveProperty("message")
      expect(typeof entry.timestamp).toBe("string")
      expect(typeof entry.message).toBe("string")
    }

    // Sanity check: timestamps should look reasonable
    const first = entries[0]
    if (first) {
      expect(first.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  })

  it("should retrieve app logs without JSON parse errors", async () => {
    // List apps and pick the first one
    const apps = await ctx.apps.listApps()
    if (apps.length === 0) {
      console.warn("No apps found — skipping app logs test")
      return
    }

    const app = apps[0]
    const entries = await ctx.logs.getLogs(app.id, "app", 25)

    expect(Array.isArray(entries)).toBe(true)
    // An installed app should have at least some log entries
    if (app.installationState === "installed") {
      expect(entries.length).toBeGreaterThan(0)
    }

    for (const entry of entries) {
      expect(entry).toHaveProperty("timestamp")
      expect(entry).toHaveProperty("severity")
      expect(entry).toHaveProperty("message")
    }
  })

  it("should reject invalid type", async () => {
    await expect(
      ctx.logs.getLogs("anything", "invalid" as any),
    ).rejects.toThrow("Invalid type")
  })
})
