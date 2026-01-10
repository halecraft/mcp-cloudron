#!/usr/bin/env node
/**
 * Cloudron MCP Server
 * Provides tools for managing Cloudron instances via MCP protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

import { CloudronClient } from "./cloudron-client.js"
import { isCloudronError } from "./errors.js"
import { TOOLS } from "./tools/definitions.js"
import { allHandlers } from "./tools/handlers/index.js"
import { errorResponse } from "./tools/response.js"

// Create server instance
const server = new Server(
  {
    name: "cloudron-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

// Lazy-initialize client (validates env vars on first use)
let client: CloudronClient | null = null

function getClient(): CloudronClient {
  if (!client) {
    client = new CloudronClient()
  }
  return client
}

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}))

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params

  try {
    const cloudron = getClient()

    // Look up handler in registry
    const handler = allHandlers[name]
    if (!handler) {
      return errorResponse(`Unknown tool: ${name}`)
    }

    // Execute handler
    return await handler(args, cloudron)
  } catch (error) {
    const message = isCloudronError(error)
      ? `Cloudron API Error: ${error.message} (${error.statusCode ?? "unknown"})`
      : error instanceof Error
        ? error.message
        : "Unknown error occurred"

    return errorResponse(message)
  }
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
