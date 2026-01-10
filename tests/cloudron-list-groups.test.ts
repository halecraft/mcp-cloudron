/**
 * Tests for cloudron_list_groups MCP tool
 * List all groups on the Cloudron instance
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
  mockGroups,
  setupTestEnv,
} from "./helpers/cloudron-mock.js"

describe("cloudron_list_groups tool", () => {
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

  // Test: Happy path - list groups
  it("should list all groups successfully", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/groups": {
        ok: true,
        status: 200,
        data: { groups: mockGroups },
      },
    })

    const client = new CloudronClient()
    const groups = await client.listGroups()

    expect(groups).toHaveLength(3)
    expect(groups[0].name).toBe("Administrators")
    expect(groups[1].name).toBe("Developers")
    expect(groups[2].name).toBe("Users")
  })

  it("should sort groups alphabetically by name", async () => {
    const unsortedGroups = [
      { id: "g3", name: "Zebra", createdAt: "2024-01-03T00:00:00Z" },
      { id: "g1", name: "Alpha", createdAt: "2024-01-01T00:00:00Z" },
      { id: "g2", name: "Beta", createdAt: "2024-01-02T00:00:00Z" },
    ]

    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/groups": {
        ok: true,
        status: 200,
        data: { groups: unsortedGroups },
      },
    })

    const client = new CloudronClient()
    const groups = await client.listGroups()

    expect(groups[0].name).toBe("Alpha")
    expect(groups[1].name).toBe("Beta")
    expect(groups[2].name).toBe("Zebra")
  })

  // Test: Empty list
  it("should handle empty groups list", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/groups": {
        ok: true,
        status: 200,
        data: { groups: [] },
      },
    })

    const client = new CloudronClient()
    const groups = await client.listGroups()

    expect(groups).toHaveLength(0)
  })

  // Test: Error handling
  it("should handle authentication error", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/groups": {
        ok: false,
        status: 401,
        data: { message: "Invalid token" },
      },
    })

    const client = new CloudronClient()

    await expect(client.listGroups()).rejects.toThrow("Invalid token")
  })

  it("should handle server error", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/groups": {
        ok: false,
        status: 500,
        data: { message: "Internal server error" },
      },
    })

    const client = new CloudronClient()

    await expect(client.listGroups()).rejects.toThrow("Internal server error")
  })

  it("should handle network error", async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("Network connection failed")),
    )

    const client = new CloudronClient()

    await expect(client.listGroups()).rejects.toThrow("Network error")
  })
})
