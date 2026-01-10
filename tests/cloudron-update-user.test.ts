/**
 * Tests for cloudron_update_user MCP tool
 * Update user properties (email, displayName, role, password)
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

describe("cloudron_update_user tool", () => {
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

  // Test: Happy path - update email
  it("should update user email successfully", async () => {
    const updatedUser: User = mockUser({
      id: "user-123",
      email: "newemail@example.com",
      username: "testuser",
      role: "user",
    })

    global.fetch = createMockFetch({
      "PUT https://my.example.com/api/v1/users/user-123": {
        ok: true,
        status: 200,
        data: updatedUser,
      },
    })

    const client = new CloudronClient()
    const user = await client.updateUser("user-123", {
      email: "newemail@example.com",
    })

    expect(user.email).toBe("newemail@example.com")
  })

  it("should update user role successfully", async () => {
    const updatedUser: User = mockUser({
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      role: "admin",
    })

    global.fetch = createMockFetch({
      "PUT https://my.example.com/api/v1/users/user-123": {
        ok: true,
        status: 200,
        data: updatedUser,
      },
    })

    const client = new CloudronClient()
    const user = await client.updateUser("user-123", { role: "admin" })

    expect(user.role).toBe("admin")
  })

  it("should update multiple fields at once", async () => {
    const updatedUser: User = mockUser({
      id: "user-123",
      email: "updated@example.com",
      username: "testuser",
      role: "admin",
    })

    let capturedBody: unknown = null
    global.fetch = vi.fn(async (_url, options) => {
      if (options?.body) {
        capturedBody = JSON.parse(options.body as string)
      }
      return {
        ok: true,
        status: 200,
        json: async () => updatedUser,
        text: async () => JSON.stringify(updatedUser),
      } as Response
    })

    const client = new CloudronClient()
    await client.updateUser("user-123", {
      email: "updated@example.com",
      role: "admin",
      displayName: "Updated User",
    })

    expect(capturedBody).toEqual({
      email: "updated@example.com",
      role: "admin",
      displayName: "Updated User",
    })
  })

  // Test: Error handling - user not found
  it("should handle user not found with 404", async () => {
    global.fetch = createMockFetch({
      "PUT https://my.example.com/api/v1/users/nonexistent": {
        ok: false,
        status: 404,
        data: { message: "User not found" },
      },
    })

    const client = new CloudronClient()

    await expect(
      client.updateUser("nonexistent", { email: "new@example.com" }),
    ).rejects.toThrow("User not found")
  })

  it("should handle duplicate email with 409", async () => {
    global.fetch = createMockFetch({
      "PUT https://my.example.com/api/v1/users/user-123": {
        ok: false,
        status: 409,
        data: { message: "Email already in use" },
      },
    })

    const client = new CloudronClient()

    await expect(
      client.updateUser("user-123", { email: "existing@example.com" }),
    ).rejects.toThrow("Email already in use")
  })

  // Test: Validation - empty params
  it("should reject empty params object", async () => {
    const client = new CloudronClient()

    await expect(client.updateUser("user-123", {})).rejects.toThrow(
      "params object cannot be empty",
    )
  })

  it("should reject empty userId", async () => {
    const client = new CloudronClient()

    await expect(
      client.updateUser("", { email: "test@example.com" }),
    ).rejects.toThrow("userId is required")
  })

  it("should reject invalid email format", async () => {
    const client = new CloudronClient()

    await expect(
      client.updateUser("user-123", { email: "not-an-email" }),
    ).rejects.toThrow("Invalid email format")
  })

  it("should reject invalid role", async () => {
    const client = new CloudronClient()

    await expect(
      client.updateUser("user-123", { role: "superadmin" as "admin" }),
    ).rejects.toThrow(
      "Invalid role: superadmin. Valid options: admin, user, guest",
    )
  })

  it("should reject weak password", async () => {
    const client = new CloudronClient()

    await expect(
      client.updateUser("user-123", { password: "weak" }),
    ).rejects.toThrow(
      "Password must be at least 8 characters long and contain at least 1 uppercase letter and 1 number",
    )
  })

  it("should accept valid password", async () => {
    const updatedUser: User = mockUser({ id: "user-123" })

    global.fetch = createMockFetch({
      "PUT https://my.example.com/api/v1/users/user-123": {
        ok: true,
        status: 200,
        data: updatedUser,
      },
    })

    const client = new CloudronClient()
    const user = await client.updateUser("user-123", {
      password: "StrongPass1",
    })

    expect(user.id).toBe("user-123")
  })
})
