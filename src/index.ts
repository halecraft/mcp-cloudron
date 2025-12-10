/**
 * Cloudron MCP Server Entry Point
 * Initializes MCP server with stdio transport and tool handlers
 *
 * TODO: Implement core MCP server setup
 * - Initialize Server from @modelcontextprotocol/sdk
 * - Set up ListToolsRequest handler
 * - Set up CallToolRequest handler
 * - Connect to StdioServerTransport
 * - Load Cloudron API credentials from environment
 * - Validate connection on startup
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

// TODO: Initialize Cloudron client from environment variables
// const config: CloudronConfig = {
//   baseUrl: process.env.CLOUDRON_BASE_URL!,
//   token: process.env.CLOUDRON_API_TOKEN!,
//   timeout: process.env.CLOUDRON_TIMEOUT ? parseInt(process.env.CLOUDRON_TIMEOUT) : 30000,
//   retryAttempts: process.env.CLOUDRON_RETRY_ATTEMPTS ? parseInt(process.env.CLOUDRON_RETRY_ATTEMPTS) : 3,
// };
//
// const client = new CloudronClient(config);

// TODO: Create MCP server instance
// const server = new Server({
//   name: 'cloudron-mcp',
//   version: '1.0.0',
// }, {
//   capabilities: {
//     tools: {},
//   },
// });

// TODO: Register ListTools handler
// server.setRequestHandler(ListToolsRequestSchema, async () => {
//   return {
//     tools: [
//       // Define MCP tools for:
//       // - cloudron_list_apps
//       // - cloudron_get_status
//       // - cloudron_restart_app
//     ],
//   };
// });

// TODO: Register CallTool handler
// server.setRequestHandler(CallToolRequestSchema, async (request) => {
//   try {
//     // Route tool calls to appropriate client methods
//     // Handle inputs and format outputs
//   } catch (error) {
//     return {
//       content: [{
//         type: 'text',
//         text: toMCPErrorMessage(error),
//       }],
//       isError: true,
//     };
//   }
// });

// TODO: Connect to stdio transport and start server
// async function main() {
//   try {
//     // Validate Cloudron connection
//     await client.validateConnection();
//     console.error('Cloudron connection validated');
//
//     // Connect to MCP transport
//     await server.connect(new StdioServerTransport());
//     console.error('Cloudron MCP server started');
//   } catch (error) {
//     console.error('Failed to start Cloudron MCP server:', error);
//     process.exit(1);
//   }
// }
//
// main().catch(error => {
//   console.error('Unexpected error:', error);
//   process.exit(1);
// });

export { CloudronClient };
export type { CloudronConfig };
export * from './types.js';
export * from './errors.js';
