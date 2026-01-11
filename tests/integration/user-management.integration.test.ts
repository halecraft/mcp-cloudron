/**
 * User & Group Management Integration Tests
 * Covers: Create User -> Update User -> Create Group -> Delete User
 */

import { CloudronClient } from "../../src/cloudron-client"
import { generateTestId } from "./helpers"

const CLOUDRON_BASE_URL = process.env.CLOUDRON_BASE_URL
const CLOUDRON_API_TOKEN = process.env.CLOUDRON_API_TOKEN

const describeIntegration =
  CLOUDRON_BASE_URL && CLOUDRON_API_TOKEN ? describe : describe.skip

describeIntegration("User & Group Management Integration Tests", () => {
  let client: CloudronClient
  let userId: string
  let groupId: string
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = "Password123!"

  beforeAll(() => {
    client = new CloudronClient({
      baseUrl: CLOUDRON_BASE_URL!,
      token: CLOUDRON_API_TOKEN!,
    })
  })

  afterAll(async () => {
    // Cleanup user if test failed before delete
    if (userId) {
      try {
        await client.deleteUser(userId).catch(() => {})
      } catch (error) {
        console.warn("Failed to cleanup test user:", error)
      }
    }
    // Cleanup group (API not implemented yet for deleteGroup, so we skip)
  })

  it("should create a new user", async () => {
    const user = await client.createUser(testEmail, testPassword, "user")
    expect(user).toHaveProperty("id")
    // Some API versions might not return email in response
    if (user.email) {
      expect(user.email).toBe(testEmail)
    }
    expect(user.role).toBe("user")
    userId = user.id
  })

  it("should update the user", async () => {
    expect(userId).toBeDefined()
    const updatedUser = await client.updateUser(userId, {
      role: "guest"
    })
    
    expect(updatedUser.id).toBe(userId)
    
    // Verify update via get
    const user = await client.getUser(userId)
    expect(user.role).toBe("guest")
  })

  it("should create a group", async () => {
    const groupName = generateTestId("group")
    const group = await client.createGroup({ name: groupName })
    expect(group).toHaveProperty("id")
    expect(group.name).toBe(groupName)
    groupId = group.id
  })

  it("should delete the user", async () => {
    expect(userId).toBeDefined()
    await client.deleteUser(userId)

    // Verify deletion
    try {
      await client.getUser(userId)
      fail("User should not exist after deletion")
    } catch (error: any) {
      expect(error.statusCode).toBe(404)
    }
    userId = ""
  })
})
