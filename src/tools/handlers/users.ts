/**
 * User-related tool handlers
 */

import { formatUser } from "../formatters.js"
import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"
import { parseCreateUserArgs } from "../validators.js"

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
}
