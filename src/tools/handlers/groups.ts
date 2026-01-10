/**
 * Group-related tool handlers
 */

import { formatGroup, formatGroupList } from "../formatters.js"
import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"
import { parseCreateGroupArgs } from "../validators.js"

export const groupHandlers: ToolRegistry = {
  cloudron_list_groups: async (_args, client) => {
    const groups = await client.listGroups()

    return textResponse(formatGroupList(groups))
  },

  cloudron_create_group: async (args, client) => {
    const { name } = parseCreateGroupArgs(args)
    const group = await client.createGroup({ name })

    return textResponse(`Group created successfully:

${formatGroup(group, 0)}`)
  },
}
