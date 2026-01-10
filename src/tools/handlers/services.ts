/**
 * Services-related tool handlers (read-only diagnostics)
 */

import { formatServiceList } from "../formatters.js"
import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"

export const serviceHandlers: ToolRegistry = {
  cloudron_list_services: async (_args, client) => {
    const services = await client.listServices()
    return textResponse(formatServiceList(services))
  },
}
