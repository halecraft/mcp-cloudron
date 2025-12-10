/**
 * System Status Tools
 * MCP tool schemas for Cloudron system operations
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const SYSTEM_TOOLS: Tool[] = [
  {
    name: 'cloudron_status',
    description: 'Get current system status and health metrics including version, uptime, disk usage, memory usage, and overall health status.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
