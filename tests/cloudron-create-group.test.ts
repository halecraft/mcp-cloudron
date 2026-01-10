/**
 * Tests for cloudron_create_group MCP tool
 * Create a new group on the Cloudron instance
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
import type { Group } from "../src/types.js"
import {
  cleanupTestEnv,
  createMockFetch,
  mockGroup,
  setupTestEnv,
} from "./helpers/cloudron-mock.js"

describe("cloudron_create_group tool", () => {
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

  // Test: Happy path - create group
  it("should create group successfully", async () => {
    const newGroup: Group = mockGroup({
      id: "group-new",
      name: "New Group",
    })

    global.fetch = createMockFetch({
      "POST https://my.example.com/api/v1/groups": {
        ok: true,
        status: 201,
        data: newGroup,
      },
    })

    const client = new CloudronClient()
    const group = await client.createGroup({ name: "New Group" })

    expect(group.id).toBe("group-new")
    expect(group.name).toBe("New Group")
  })

  it("should send correct request body", async () => {
    const newGroup: Group = mockGroup({ name: "Test Group" })

    let capturedBody: unknown = null
    global.fetch = vi.fn(async (_url, options) => {
      if (options?.body) {
        capturedBody = JSON.parse(options.body as string)
      }
      return {
        ok: true,
        status: 201,
        json: async () => newGroup,
        text: async () => JSON.stringify(newGroup),
      } as Response
    })

    const client = new CloudronClient()
    await client.createGroup({ name: "Test Group" })

    expect(capturedBody).toEqual({ name: "Test Group" })
  })

  // Test: Error handling - duplicate group name
  it("should handle duplicate group name with 409", async () => {
    global.fetch = createMockFetch({
      "POST https://my.example.com/api/v1/groups": {
        ok: false,
        status: 409,
        data: { message: "Group with name already exists" },
      },
    })

    const client = new CloudronClient()

    await expect(
      client.createGroup({ name: "Existing Group" }),
    ).rejects.toThrow("Group with name already exists")
  })

  // Test: Validation - empty name
  it("should reject empty group name", async () => {
    const client = new CloudronClient()

    await expect(client.createGroup({ name: "" })).rejects.toThrow(
      "Group name is required and cannot be empty",
    )
  })

  it("should reject whitespace-only group name", async () => {
    const client = new CloudronClient()

    await expect(client.createGroup({ name: "   " })).rejects.toThrow(
      "Group name is required and cannot be empty",
    )
  })

  it("should handle authentication error", async () => {
    global.fetch = createMockFetch({
      "POST https://my.example.com/api/v1/groups": {
        ok: false,
        status: 401,
        data: { message: "Invalid token" },
      },
    })

    const client = new CloudronClient()

    await expect(client.createGroup({ name: "Test" })).rejects.toThrow(
      "Invalid token",
    )
  })

  it("should handle server error", async () => {
    global.fetch = createMockFetch({
      "POST https://my.example.com/api/v1/groups": {
        ok: false,
        status: 500,
        data: { message: "Internal server error" },
      },
    })

    const client = new CloudronClient()

    await expect(client.createGroup({ name: "Test" })).rejects.toThrow(
      "Internal server error",
    )
  })
})
