/**
 * Handler-level tests for user-related tools
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { userHandlers } from "../src/tools/handlers/users"
import {
  cleanupTestEnv,
  createMockFetch,
  createTestContext,
  mockUsers,
  setupTestEnv,
} from "./helpers/cloudron-mock"
import { assertHasTextContent, assertSuccess } from "./helpers/mcp-assert"

// Non-admin user for safe-deletion testing
const regularUser = { ...mockUsers[0], role: "user" as const }

describe("User Handlers", () => {
  beforeAll(() => setupTestEnv())
  afterAll(() => cleanupTestEnv())

  describe("cloudron_list_users", () => {
    it("should return formatted list of users", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/users": {
          ok: true,
          status: 200,
          data: { users: mockUsers },
        },
      })
      const ctx = createTestContext()
      const response = await userHandlers.cloudron_list_users({}, ctx)
      assertSuccess(response)
      expect(assertHasTextContent(response)).toContain("admin@example.com")
    })

    it("should handle empty user list", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/users": {
          ok: true,
          status: 200,
          data: { users: [] },
        },
      })
      const ctx = createTestContext()
      const response = await userHandlers.cloudron_list_users({}, ctx)
      assertSuccess(response)
      expect(assertHasTextContent(response)).toContain("No users found")
    })
  })

  describe("cloudron_get_user", () => {
    it("should return formatted user details", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/users/user-1": {
          ok: true,
          status: 200,
          data: mockUsers[0],
        },
      })
      const ctx = createTestContext()
      const response = await userHandlers.cloudron_get_user(
        { userId: "user-1" },
        ctx,
      )
      assertSuccess(response)
      expect(assertHasTextContent(response)).toContain("admin@example.com")
    })

    it("should throw error for missing userId", async () => {
      const ctx = createTestContext()
      await expect(userHandlers.cloudron_get_user({}, ctx)).rejects.toThrow(
        "userId is required",
      )
    })
  })

  describe("cloudron_create_user", () => {
    it("should create user and return details", async () => {
      global.fetch = createMockFetch({
        "POST https://my.example.com/api/v1/users": {
          ok: true,
          status: 201,
          data: {
            id: "new",
            email: "new@example.com",
            username: "new",
            role: "user",
            createdAt: new Date().toISOString(),
          },
        },
      })
      const ctx = createTestContext()
      const response = await userHandlers.cloudron_create_user(
        {
          email: "new@example.com",
          username: "new",
          password: "P@ssw0rd!",
          role: "user",
        },
        ctx,
      )
      assertSuccess(response)
      expect(assertHasTextContent(response)).toContain("new@example.com")
    })

    it("should reject invalid email format", async () => {
      const ctx = createTestContext()
      await expect(
        userHandlers.cloudron_create_user(
          {
            email: "invalid",
            username: "new",
            password: "P@ssw0rd!",
            role: "user",
          },
          ctx,
        ),
      ).rejects.toThrow("Invalid email format")
    })

    it("should reject weak password", async () => {
      const ctx = createTestContext()
      await expect(
        userHandlers.cloudron_create_user(
          {
            email: "test@example.com",
            username: "new",
            password: "short",
            role: "user",
          },
          ctx,
        ),
      ).rejects.toThrow("Password")
    })
  })

  describe("cloudron_delete_user", () => {
    it("should delete user with pre-flight validation", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/users/user-1": {
          ok: true,
          status: 200,
          data: regularUser,
        },
        "GET https://my.example.com/api/v1/users": {
          ok: true,
          status: 200,
          data: { users: [regularUser, ...mockUsers.slice(1)] },
        },
        "DELETE https://my.example.com/api/v1/users/user-1": {
          ok: true,
          status: 204,
        },
      })
      const ctx = createTestContext()
      const response = await userHandlers.cloudron_delete_user(
        { userId: "user-1" },
        ctx,
      )
      assertSuccess(response)
      expect(assertHasTextContent(response)).toContain("deleted")
    })
  })
})
