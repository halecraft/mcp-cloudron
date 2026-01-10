/**
 * Tests for cloudron_apply_update MCP tool
 * Apply available Cloudron platform update
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { CloudronClient } from "../src/cloudron-client.js"
import {
  cleanupTestEnv,
  createMockFetch,
  mockBackups,
  mockUpdateAvailable,
  mockUpdateNotAvailable,
  setupTestEnv,
} from "./helpers/cloudron-mock.js"

describe("cloudron_apply_update tool", () => {
  let originalFetch: typeof global.fetch

  beforeAll(() => {
    setupTestEnv()
    originalFetch = global.fetch
  })

  afterAll(() => {
    cleanupTestEnv()
    global.fetch = originalFetch
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test: Happy path - apply update
  it("should apply update successfully when update is available", async () => {
    global.fetch = createMockFetch({
      // Check for updates
      "GET https://my.example.com/api/v1/updates": {
        ok: true,
        status: 200,
        data: mockUpdateAvailable,
      },
      // Check for recent backups
      "GET https://my.example.com/api/v1/backups": {
        ok: true,
        status: 200,
        data: { backups: mockBackups },
      },
      // Apply update
      "POST https://my.example.com/api/v1/updates": {
        ok: true,
        status: 202,
        data: { taskId: "task-update-123" },
      },
    })

    const client = new CloudronClient()
    const taskId = await client.applyUpdate()

    expect(taskId).toBe("task-update-123")
  })

  // Test: Error handling - no update available
  it("should reject when no update is available", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/updates": {
        ok: true,
        status: 200,
        data: mockUpdateNotAvailable,
      },
      "GET https://my.example.com/api/v1/backups": {
        ok: true,
        status: 200,
        data: { backups: mockBackups },
      },
    })

    const client = new CloudronClient()

    await expect(client.applyUpdate()).rejects.toThrow(
      "No update available. Cloudron is already up to date.",
    )
  })

  it("should warn but proceed when no recent backup exists", async () => {
    // Create old backups (more than 24 hours ago)
    const oldBackups = mockBackups.map(b => ({
      ...b,
      creationTime: "2020-01-01T00:00:00Z",
    }))

    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/updates": {
        ok: true,
        status: 200,
        data: mockUpdateAvailable,
      },
      "GET https://my.example.com/api/v1/backups": {
        ok: true,
        status: 200,
        data: { backups: oldBackups },
      },
      "POST https://my.example.com/api/v1/updates": {
        ok: true,
        status: 202,
        data: { taskId: "task-update-456" },
      },
    })

    const client = new CloudronClient()
    // Should still succeed but with warning (validation passes with warnings)
    const taskId = await client.applyUpdate()

    expect(taskId).toBe("task-update-456")
  })

  it("should handle missing taskId in response", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/updates": {
        ok: true,
        status: 200,
        data: mockUpdateAvailable,
      },
      "GET https://my.example.com/api/v1/backups": {
        ok: true,
        status: 200,
        data: { backups: mockBackups },
      },
      "POST https://my.example.com/api/v1/updates": {
        ok: true,
        status: 202,
        data: {},
      },
    })

    const client = new CloudronClient()

    await expect(client.applyUpdate()).rejects.toThrow(
      "Apply update response missing taskId",
    )
  })

  // Test: Error handling
  it("should handle authentication error", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/updates": {
        ok: false,
        status: 401,
        data: { message: "Invalid token" },
      },
    })

    const client = new CloudronClient()

    await expect(client.applyUpdate()).rejects.toThrow("Invalid token")
  })

  it("should handle server error during update check", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/updates": {
        ok: false,
        status: 500,
        data: { message: "Internal server error" },
      },
    })

    const client = new CloudronClient()

    await expect(client.applyUpdate()).rejects.toThrow("Internal server error")
  })

  it("should handle server error during apply", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/updates": {
        ok: true,
        status: 200,
        data: mockUpdateAvailable,
      },
      "GET https://my.example.com/api/v1/backups": {
        ok: true,
        status: 200,
        data: { backups: mockBackups },
      },
      "POST https://my.example.com/api/v1/updates": {
        ok: false,
        status: 500,
        data: { message: "Update failed" },
      },
    })

    const client = new CloudronClient()

    await expect(client.applyUpdate()).rejects.toThrow("Update failed")
  })
})
