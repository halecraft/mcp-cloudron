/**
 * Cloudron MCP Tool Definitions
 * Registry of all available tools for the MCP server
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { APP_TOOLS } from './apps.js';
import { SYSTEM_TOOLS } from './system.js';

/**
 * All tool definitions exported for MCP server ListTools handler
 */
export const TOOL_DEFINITIONS: Tool[] = [
  ...APP_TOOLS,
  ...SYSTEM_TOOLS,
];
