/**
 * User-related tool handlers
 */

import type { UserRole } from "../../types.js"
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
  cloudron_list_users: async (_args, ctx) => {
    const users = await ctx.users.listUsers()

    if (users.length === 0) {
      return textResponse("No users found.")
    }

    const formatted = users.map((user, i) => formatUser(user, i)).join("\n\n")

    return textResponse(`Found ${users.length} user(s):\n\n${formatted}`)
  },

  cloudron_create_user: async (args, ctx) => {
    const { email, username, password, role, displayName, fallbackEmail } =
      parseCreateUserArgs(args)
    const user = await ctx.users.createUser(
      email,
      username,
      password,
      role,
      displayName,
      fallbackEmail,
    )

    return textResponse(`User created successfully:
  ID: ${user.id}
  Email: ${user.email}
  Username: ${user.username}
  Role: ${user.role}
  Created: ${new Date(user.createdAt).toLocaleString()}`)
  },

  cloudron_get_user: async (args, ctx) => {
    const { userId } = parseGetUserArgs(args)
    const user = await ctx.users.getUser(userId)

    return textResponse(formatUserDetails(user))
  },

  cloudron_update_user: async (args, ctx) => {
    const { userId, email, displayName, role } = parseUpdateUserArgs(args)

    // Build params object conditionally (exactOptionalPropertyTypes)
    const params: {
      email?: string
      displayName?: string
      role?: UserRole
    } = {}

    if (email !== undefined) {
      params.email = email
    }
    if (displayName !== undefined) {
      params.displayName = displayName
    }
    if (role !== undefined) {
      // Cast to UserRole since parseUpdateUserArgs validates the role
      params.role = role as UserRole
    }

    const user = await ctx.users.updateUser(userId, params)

    return textResponse(`User updated successfully:
  ID: ${user.id}
  Email: ${user.email}
  Username: ${user.username}
  Role: ${user.role}
  Created: ${new Date(user.createdAt).toLocaleString()}`)
  },

  cloudron_delete_user: async (args, ctx) => {
    const { userId } = parseDeleteUserArgs(args)
    await ctx.users.deleteUser(userId)

    return textResponse(`User '${userId}' deleted successfully.`)
  },
}
