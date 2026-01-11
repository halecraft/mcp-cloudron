#!/usr/bin/env node
/**
 * Cloudron MCP Server
 * Provides tools for managing Cloudron instances via MCP protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

import { type CloudronContext, createCloudronContext } from "./client/index.js"
import { isCloudronError } from "./errors.js"
import {
  getFullPackagingGuide,
  PACKAGING_GUIDE_URI,
  RESOURCES,
} from "./resources/index.js"
import { TOOLS } from "./tools/definitions.js"
import { allHandlers } from "./tools/handlers/index.js"
import { errorResponse } from "./tools/response.js"

/**
 * Validate that all defined tools have corresponding handlers
 * Catches tool↔handler mismatches at startup rather than runtime
 */
function validateToolHandlerAlignment(): void {
  const missingHandlers: string[] = []

  for (const tool of TOOLS) {
    if (!allHandlers[tool.name]) {
      missingHandlers.push(tool.name)
    }
  }

  if (missingHandlers.length > 0) {
    throw new Error(
      `Tool↔Handler mismatch: The following tools are defined but have no handler: ${missingHandlers.join(", ")}`,
    )
  }
}

// Validate tool↔handler alignment at module load time
validateToolHandlerAlignment()

// Create server instance
const server = new Server(
  {
    name: "cloudron-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
)

// Lazy-initialize context (validates env vars on first use)
let ctx: CloudronContext | null = null

function getContext(): CloudronContext {
  if (!ctx) {
    ctx = createCloudronContext()
  }
  return ctx
}

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}))

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params

  try {
    const context = getContext()

    // Look up handler in registry
    const handler = allHandlers[name]
    if (!handler) {
      return errorResponse(`Unknown tool: ${name}`)
    }

    // Execute handler
    return await handler(args, context)
  } catch (error) {
    const message = isCloudronError(error)
      ? `Cloudron API Error: ${error.message} (${error.statusCode ?? "unknown"})`
      : error instanceof Error
        ? error.message
        : "Unknown error occurred"

    return errorResponse(message)
  }
})

// Handle list resources request
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: RESOURCES,
}))

// Handle read resource request
server.setRequestHandler(ReadResourceRequestSchema, async request => {
  const { uri } = request.params

  if (uri === PACKAGING_GUIDE_URI) {
    return {
      contents: [
        {
          uri: PACKAGING_GUIDE_URI,
          mimeType: "text/markdown",
          text: getFullPackagingGuide(),
        },
      ],
    }
  }

  throw new Error(`Unknown resource: ${uri}`)
})

// Main entry point
async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("Cloudron MCP server running on stdio")
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
