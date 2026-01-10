/**
 * Tool Handler Registry
 *
 * Maps tool names to their handler functions.
 * This pattern replaces the giant switch statement in server.ts.
 */

import type { CloudronContext } from "../client/index.js"
import type { MCPToolResponse } from "./response.js"

/**
 * Tool handler function signature
 */
export type ToolHandler = (
  args: unknown,
  ctx: CloudronContext,
) => Promise<MCPToolResponse>

/**
 * Registry of tool handlers
 */
export type ToolRegistry = Record<string, ToolHandler>

/**
 * Create a combined registry from multiple handler modules
 */
export function createRegistry(...registries: ToolRegistry[]): ToolRegistry {
  return Object.assign({}, ...registries)
}
