/**
 * Domain-related tool handlers
 */

import { formatDomain } from "../formatters.js"
import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"

export const domainHandlers: ToolRegistry = {
  cloudron_list_domains: async (_args, ctx) => {
    const domains = await ctx.system.listDomains()

    const domainList = domains.map(formatDomain).join("\n\n")

    return textResponse(
      `Configured domains (${domains.length}):\n\n${domainList}`,
    )
  },
}
