/**
 * Cloudron MCP Server Entry Point
 * Initializes MCP server with stdio transport and tool handlers
 */

import {
  Server,
} from '@modelcontextprotocol/sdk/server/index.js';
import {
  StdioServerTransport,
} from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CloudronClient } from './cloudron-client.js';
import type { CloudronConfig } from './types.js';
import { toMCPErrorMessage } from './errors.js';
import { TOOL_DEFINITIONS } from './tools/index.js';
import {
  handleListApps,
  handleRestartApp,
  handleStatus,
} from './tools/handlers.js';

// Initialize Cloudron client from environment variables
const config: CloudronConfig = {
  baseUrl: process.env.CLOUDRON_BASE_URL || '',
  token: process.env.CLOUDRON_API_TOKEN || '',
  timeout: process.env.CLOUDRON_TIMEOUT
    ? parseInt(process.env.CLOUDRON_TIMEOUT)
    : 30000,
  retryAttempts: process.env.CLOUDRON_RETRY_ATTEMPTS
    ? parseInt(process.env.CLOUDRON_RETRY_ATTEMPTS)
    : 3,
};

const client = new CloudronClient(config);

// Create MCP server instance
const server = new Server(
  {
    name: 'cloudron-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register ListTools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOL_DEFINITIONS,
  };
});

// Register CallTool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args = {} } = request.params;

    switch (name) {
      case 'cloudron_list_apps':
        return await handleListApps(client, args);

      case 'cloudron_restart_app':
        return await handleRestartApp(client, args);

      case 'cloudron_status':
        return await handleStatus(client, args);

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: toMCPErrorMessage(error),
        },
      ],
      isError: true,
    };
  }
});

// Connect to stdio transport and start server
async function main() {
  try {
    // Validate Cloudron connection
    await client.validateConnection();
    console.error('Cloudron connection validated');

    // Connect to MCP transport
    await server.connect(new StdioServerTransport());
    console.error('Cloudron MCP server started');
  } catch (error) {
    console.error('Failed to start Cloudron MCP server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

export { CloudronClient };
export type { CloudronConfig };
export * from './types.js';
export * from './errors.js';
