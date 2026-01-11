/**
 * Tests for cloudron_check_updates MCP tool
 * Check if Cloudron platform updates are available
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
  mockUpdateAvailable,
  mockUpdateNotAvailable,
  setupTestEnv,
} from "./helpers/cloudron-mock.js"

describe("cloudron_check_updates tool", () => {
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

  // Test: Happy path - update available
  it("should return update info when update is available", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/updater/updates": {
        ok: true,
        status: 200,
        data: { updates: mockUpdateAvailable },
      },
    })

    const client = new CloudronClient()
    const updateInfo = await client.checkUpdates()

    expect(updateInfo.available).toBe(true)
    expect(updateInfo.version).toBe("8.1.0")
    expect(updateInfo.changelog).toBe("https://cloudron.io/changelog/8.1.0")
  })

  // Test: No update available
  it("should return update info when no update is available", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/updater/updates": {
        ok: true,
        status: 200,
        data: { updates: mockUpdateNotAvailable },
      },
    })

    const client = new CloudronClient()
    const updateInfo = await client.checkUpdates()

    expect(updateInfo.available).toBe(false)
    expect(updateInfo.version).toBeUndefined()
  })

  it("should handle update with version but no changelog", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/updater/updates": {
        ok: true,
        status: 200,
        data: {
          updates: {
            available: true,
            version: "8.2.0",
          },
        },
      },
    })

    const client = new CloudronClient()
    const updateInfo = await client.checkUpdates()

    expect(updateInfo.available).toBe(true)
    expect(updateInfo.version).toBe("8.2.0")
    expect(updateInfo.changelog).toBeUndefined()
  })

  // Test: Error handling
  it("should handle authentication error", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/updater/updates": {
        ok: false,
        status: 401,
        data: { message: "Invalid token" },
      },
    })

    const client = new CloudronClient()

    await expect(client.checkUpdates()).rejects.toThrow("Invalid token")
  })

  it("should handle server error", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/updater/updates": {
        ok: false,
        status: 500,
        data: { message: "Internal server error" },
      },
    })

    const client = new CloudronClient()

    await expect(client.checkUpdates()).rejects.toThrow("Internal server error")
  })

  it("should handle network error", async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("Network connection failed")),
    )

    const client = new CloudronClient()

    await expect(client.checkUpdates()).rejects.toThrow("Network error")
  })
})
