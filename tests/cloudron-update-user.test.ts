/**
 * Tests for cloudron_update_user MCP tool
 * Update user properties (email, displayName, role)
 *
 * Per OpenAPI spec:
 * - Profile updates (email, displayName): POST /api/v1/users/:userId/profile
 * - Role updates: PUT /api/v1/users/:userId/role
 * - Both return 204 No Content
 * - updateUser() fetches updated user via GET /api/v1/users/:userId
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

    // Mock: POST /profile returns 204, then GET /users/:id returns updated user
    global.fetch = vi.fn(
      async (url: string | URL | Request, options?: RequestInit) => {
        const urlString = typeof url === "string" ? url : url.toString()
        const method = options?.method || "GET"

        if (method === "POST" && urlString.includes("/profile")) {
          return {
            ok: true,
            status: 204,
            json: async () => undefined,
            text: async () => "",
          } as Response
        }
        if (method === "GET" && urlString.includes("/users/user-123")) {
          return {
            ok: true,
            status: 200,
            json: async () => updatedUser,
            text: async () => JSON.stringify(updatedUser),
          } as Response
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({ message: "Not found" }),
          text: async () => '{"message":"Not found"}',
        } as Response
      },
    )

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

    // Mock: PUT /role returns 204, then GET /users/:id returns updated user
    global.fetch = vi.fn(
      async (url: string | URL | Request, options?: RequestInit) => {
        const urlString = typeof url === "string" ? url : url.toString()
        const method = options?.method || "GET"

        if (method === "PUT" && urlString.includes("/role")) {
          return {
            ok: true,
            status: 204,
            json: async () => undefined,
            text: async () => "",
          } as Response
        }
        if (method === "GET" && urlString.includes("/users/user-123")) {
          return {
            ok: true,
            status: 200,
            json: async () => updatedUser,
            text: async () => JSON.stringify(updatedUser),
          } as Response
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({ message: "Not found" }),
          text: async () => '{"message":"Not found"}',
        } as Response
      },
    )

    const client = new CloudronClient()
    const user = await client.updateUser("user-123", { role: "admin" })

    expect(user.role).toBe("admin")
  })

  it("should update multiple fields at once", async () => {
    const updatedUser: User = mockUser({
      id: "user-123",
      email: "updated@example.com",
      displayName: "Updated User",
      username: "testuser",
      role: "admin",
    })

    const capturedCalls: { url: string; method: string; body?: unknown }[] = []

    global.fetch = vi.fn(
      async (url: string | URL | Request, options?: RequestInit) => {
        const urlString = typeof url === "string" ? url : url.toString()
        const method = options?.method || "GET"
        const body = options?.body
          ? JSON.parse(options.body as string)
          : undefined

        capturedCalls.push({ url: urlString, method, body })

        if (method === "POST" && urlString.includes("/profile")) {
          return {
            ok: true,
            status: 204,
            json: async () => undefined,
            text: async () => "",
          } as Response
        }
        if (method === "PUT" && urlString.includes("/role")) {
          return {
            ok: true,
            status: 204,
            json: async () => undefined,
            text: async () => "",
          } as Response
        }
        if (method === "GET" && urlString.includes("/users/user-123")) {
          return {
            ok: true,
            status: 200,
            json: async () => updatedUser,
            text: async () => JSON.stringify(updatedUser),
          } as Response
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({ message: "Not found" }),
          text: async () => '{"message":"Not found"}',
        } as Response
      },
    )

    const client = new CloudronClient()
    await client.updateUser("user-123", {
      email: "updated@example.com",
      role: "admin",
      displayName: "Updated User",
    })

    // Should have called profile endpoint with email and displayName
    const profileCall = capturedCalls.find(c => c.url.includes("/profile"))
    expect(profileCall).toBeDefined()
    expect(profileCall?.body).toEqual({
      email: "updated@example.com",
      displayName: "Updated User",
    })

    // Should have called role endpoint with role
    const roleCall = capturedCalls.find(c => c.url.includes("/role"))
    expect(roleCall).toBeDefined()
    expect(roleCall?.body).toEqual({ role: "admin" })
  })

  // Test: Error handling - user not found
  it("should handle user not found with 404", async () => {
    global.fetch = vi.fn(async () => {
      return {
        ok: false,
        status: 404,
        json: async () => ({ message: "User not found" }),
        text: async () => '{"message":"User not found"}',
      } as Response
    })

    const client = new CloudronClient()

    await expect(
      client.updateUser("nonexistent", { email: "new@example.com" }),
    ).rejects.toThrow("User not found")
  })

  it("should handle duplicate email with 409", async () => {
    global.fetch = vi.fn(async () => {
      return {
        ok: false,
        status: 409,
        json: async () => ({ message: "Email already in use" }),
        text: async () => '{"message":"Email already in use"}',
      } as Response
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
      client.updateUser("user-123", { role: "superadmin" as any }),
    ).rejects.toThrow(
      "Invalid role: superadmin. Valid options: owner, admin, usermanager, mailmanager, user",
    )
  })

  // Note: password is no longer part of UpdateUserParams per OpenAPI spec
  // Password changes are handled via separate endpoint (password reset)
})
