/**
 * User-related tool handlers
 */

import { formatUser, formatUserDetails } from "../formatters.js"
import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"
import {
  parseCreateUserArgs,
  parseDeleteUserArgs,
  parseGetUserArgs,
  parseUpdateUserArgs,
} from "../validators.js"

export const userHandlers: ToolRegistry = {
  cloudron_list_users: async (_args, client) => {
    const users = await client.listUsers()

    if (users.length === 0) {
      return textResponse("No users found.")
    }

    const formatted = users.map((user, i) => formatUser(user, i)).join("\n\n")

    return textResponse(`Found ${users.length} user(s):\n\n${formatted}`)
  },

  cloudron_create_user: async (args, client) => {
    const { email, password, role } = parseCreateUserArgs(args)
    const user = await client.createUser(email, password, role)

    return textResponse(`User created successfully:
  ID: ${user.id}
  Email: ${user.email}
  Username: ${user.username}
  Role: ${user.role}
  Created: ${new Date(user.createdAt).toLocaleString()}`)
  },

  cloudron_get_user: async (args, client) => {
    const { userId } = parseGetUserArgs(args)
    const user = await client.getUser(userId)

    return textResponse(formatUserDetails(user))
  },

  cloudron_update_user: async (args, client) => {
    const { userId, email, displayName, role, password } =
      parseUpdateUserArgs(args)

    // Build params object conditionally (exactOptionalPropertyTypes)
    const params: {
      email?: string
      displayName?: string
      role?: "admin" | "user" | "guest"
      password?: string
    } = {}

    if (email !== undefined) {
      params.email = email
    }
    if (displayName !== undefined) {
      params.displayName = displayName
    }
    if (role !== undefined) {
      params.role = role
    }
    if (password !== undefined) {
      params.password = password
    }

    const user = await client.updateUser(userId, params)

    return textResponse(`User updated successfully:
  ID: ${user.id}
  Email: ${user.email}
  Username: ${user.username}
  Role: ${user.role}
  Created: ${new Date(user.createdAt).toLocaleString()}`)
  },

  cloudron_delete_user: async (args, client) => {
    const { userId } = parseDeleteUserArgs(args)
    await client.deleteUser(userId)

    return textResponse(`User '${userId}' deleted successfully.`)
  },
}
