/**
 * MCP Response Helpers
 *
 * Utility functions for creating consistent MCP tool responses.
 */

/**
 * MCP content item structure
 */
export interface MCPContentItem {
  type: "text"
  text: string
}

/**
 * MCP tool response structure
 * Uses index signature to satisfy MCP SDK's ServerResult type
 */
export interface MCPToolResponse {
  content: MCPContentItem[]
  isError?: boolean
  [key: string]: unknown
}

/**
 * Create a successful text response
 */
export function textResponse(text: string): MCPToolResponse {
  return {
    content: [{ type: "text", text }],
  }
}

/**
 * Create an error response
 */
export function errorResponse(message: string): MCPToolResponse {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  }
}

/**
 * Create a response with multiple text items
 */
export function multiTextResponse(texts: string[]): MCPToolResponse {
  return {
    content: texts.map(text => ({ type: "text" as const, text })),
  }
}
