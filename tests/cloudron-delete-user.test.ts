/**
 * Tests for cloudron_delete_user MCP tool
 * Delete user with pre-flight validation (not last admin)
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
  mockUser,
  mockUserSingleAdmin,
  mockUsers,
  setupTestEnv,
} from "./helpers/cloudron-mock.js"

describe("cloudron_delete_user tool", () => {
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

  // Test: Happy path - delete regular user
  it("should delete regular user successfully", async () => {
    const targetUser = mockUser({
      id: "user-to-delete",
      role: "user",
    })

    global.fetch = createMockFetch({
      // Get user to validate
      "GET https://my.example.com/api/v1/users/user-to-delete": {
        ok: true,
        status: 200,
        data: targetUser,
      },
      // List users to check admin count
      "GET https://my.example.com/api/v1/users": {
        ok: true,
        status: 200,
        data: { users: mockUsers },
      },
      // Delete user
      "DELETE https://my.example.com/api/v1/users/user-to-delete": {
        ok: true,
        status: 204,
        data: null,
      },
    })

    const client = new CloudronClient()
    await expect(client.deleteUser("user-to-delete")).resolves.toBeUndefined()
  })

  it("should delete admin user when other admins exist", async () => {
    const targetAdmin = mockUser({
      id: "admin-to-delete",
      role: "admin",
    })

    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/users/admin-to-delete": {
        ok: true,
        status: 200,
        data: targetAdmin,
      },
      "GET https://my.example.com/api/v1/users": {
        ok: true,
        status: 200,
        data: { users: mockUsers }, // Has 2 admins
      },
      "DELETE https://my.example.com/api/v1/users/admin-to-delete": {
        ok: true,
        status: 204,
        data: null,
      },
    })

    const client = new CloudronClient()
    await expect(client.deleteUser("admin-to-delete")).resolves.toBeUndefined()
  })

  // Test: Error handling - cannot delete last admin
  it("should reject deleting the last admin user", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/users/last-admin": {
        ok: true,
        status: 200,
        data: mockUserSingleAdmin,
      },
      "GET https://my.example.com/api/v1/users": {
        ok: true,
        status: 200,
        data: { users: [mockUserSingleAdmin] }, // Only one admin
      },
    })

    const client = new CloudronClient()

    await expect(client.deleteUser("last-admin")).rejects.toThrow(
      "Cannot delete the last admin user",
    )
  })

  it("should handle user not found with 404", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/users/nonexistent": {
        ok: false,
        status: 404,
        data: { message: "User not found" },
      },
    })

    const client = new CloudronClient()

    await expect(client.deleteUser("nonexistent")).rejects.toThrow(
      "does not exist",
    )
  })

  // Test: Validation - empty userId
  it("should reject empty userId", async () => {
    const client = new CloudronClient()

    await expect(client.deleteUser("")).rejects.toThrow("userId is required")
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

    await expect(client.deleteUser("user-123")).rejects.toThrow("Invalid token")
  })
})
