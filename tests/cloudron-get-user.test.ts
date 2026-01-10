/**
 * Tests for cloudron_get_user MCP tool
 * Get detailed information about a specific user by ID
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
import type { User } from "../src/types.js"
import {
  cleanupTestEnv,
  createMockFetch,
  mockUser,
  setupTestEnv,
} from "./helpers/cloudron-mock.js"

describe("cloudron_get_user tool", () => {
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

  // Test: Happy path - get user by ID
  it("should get user by ID successfully", async () => {
    const testUser: User = mockUser({
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      role: "user",
    })

    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/users/user-123": {
        ok: true,
        status: 200,
        data: testUser,
      },
    })

    const client = new CloudronClient()
    const user = await client.getUser("user-123")

    expect(user.id).toBe("user-123")
    expect(user.email).toBe("test@example.com")
    expect(user.username).toBe("testuser")
    expect(user.role).toBe("user")
  })

  it("should get admin user successfully", async () => {
    const adminUser: User = mockUser({
      id: "user-admin",
      email: "admin@example.com",
      username: "admin",
      role: "admin",
    })

    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/users/user-admin": {
        ok: true,
        status: 200,
        data: adminUser,
      },
    })

    const client = new CloudronClient()
    const user = await client.getUser("user-admin")

    expect(user.role).toBe("admin")
  })

  // Test: Error handling - user not found
  it("should handle user not found with 404", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/users/nonexistent": {
        ok: false,
        status: 404,
        data: { message: "User not found" },
      },
    })

    const client = new CloudronClient()

    await expect(client.getUser("nonexistent")).rejects.toThrow(
      "User not found",
    )
  })

  it("should handle authentication error", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/users/user-123": {
        ok: false,
        status: 401,
        data: { message: "Invalid token" },
      },
    })

    const client = new CloudronClient()

    await expect(client.getUser("user-123")).rejects.toThrow("Invalid token")
  })

  // Test: Validation - empty userId
  it("should reject empty userId", async () => {
    const client = new CloudronClient()

    await expect(client.getUser("")).rejects.toThrow("userId is required")
  })

  it("should handle network error", async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("Network connection failed")),
    )

    const client = new CloudronClient()

    await expect(client.getUser("user-123")).rejects.toThrow("Network error")
  })
})
