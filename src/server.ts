#!/usr/bin/env node
/**
 * Cloudron MCP Server
 * Provides tools for managing Cloudron instances via MCP protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { CloudronClient } from './cloudron-client.js';
import { isCloudronError } from './errors.js';
import type { App, SystemStatus, TaskStatus, StorageInfo } from './types.js';

// Tool definitions
const TOOLS = [
  {
    name: 'cloudron_list_apps',
    description: 'List all installed applications on the Cloudron instance. Returns app details including name, domain, status, and health.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'cloudron_get_app',
    description: 'Get detailed information about a specific application by its ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The unique identifier of the application',
        },
      },
      required: ['appId'],
    },
  },
  {
    name: 'cloudron_get_status',
    description: 'Get the current status and configuration of the Cloudron instance.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'cloudron_task_status',
    description: 'Get the status of an async operation (backup, install, restore, etc.) by task ID. Returns state (pending/running/success/error), progress (0-100%), and message.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: {
          type: 'string',
          description: 'The unique identifier of the task to check',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'cloudron_check_storage',
    description: 'Check available disk space before operations that create data (backup, install). Returns available/total/used disk space in MB, plus warning and critical threshold alerts.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        requiredMB: {
          type: 'number',
          description: 'Optional: Required disk space in MB. If provided, checks if available >= requiredMB',
        },
      },
      required: [],
    },
  },
];

// Create server instance
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

// Lazy-initialize client (validates env vars on first use)
let client: CloudronClient | null = null;

function getClient(): CloudronClient {
  if (!client) {
    client = new CloudronClient();
  }
  return client;
}

// Format app for display
function formatApp(app: App): string {
  const fqdn = app.location ? `${app.location}.${app.domain}` : app.domain;
  return `${app.manifest.title} (${fqdn})
  ID: ${app.id}
  State: ${app.installationState}
  Health: ${app.health ?? 'unknown'}
  Memory: ${Math.round(app.memoryLimit / 1024 / 1024)} MB`;
}

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const cloudron = getClient();

    switch (name) {
      case 'cloudron_list_apps': {
        const apps = await cloudron.listApps();
        const formatted = apps.map(formatApp).join('\n\n');
        return {
          content: [
            {
              type: 'text' as const,
              text: `Found ${apps.length} apps:\n\n${formatted}`,
            },
          ],
        };
      }

      case 'cloudron_get_app': {
        const appId = (args as { appId: string }).appId;
        const app = await cloudron.getApp(appId);
        return {
          content: [
            {
              type: 'text' as const,
              text: formatApp(app),
            },
          ],
        };
      }

      case 'cloudron_get_status': {
        const status = await cloudron.getStatus();
        return {
          content: [
            {
              type: 'text' as const,
              text: `Cloudron Status:
  Name: ${status.cloudronName}
  Version: ${status.version}
  Admin URL: ${status.adminFqdn}
  Provider: ${status.provider}
  Demo Mode: ${status.isDemo}`,
            },
          ],
        };
      }

      case 'cloudron_task_status': {
        const taskId = (args as { taskId: string }).taskId;
        const taskStatus = await cloudron.getTaskStatus(taskId);

        let statusText = `Task Status:
  ID: ${taskStatus.id}
  State: ${taskStatus.state}
  Progress: ${taskStatus.progress}%
  Message: ${taskStatus.message}`;

        if (taskStatus.state === 'success' && taskStatus.result) {
          statusText += `\n  Result: ${JSON.stringify(taskStatus.result, null, 2)}`;
        }

        if (taskStatus.state === 'error' && taskStatus.error) {
          statusText += `\n  Error: ${taskStatus.error.message}`;
          if (taskStatus.error.code) {
            statusText += `\n  Error Code: ${taskStatus.error.code}`;
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: statusText,
            },
          ],
        };
      }

      case 'cloudron_check_storage': {
        const requiredMB = (args as { requiredMB?: number }).requiredMB;
        const storageInfo = await cloudron.checkStorage(requiredMB);

        let statusText = `Storage Status:
  Available: ${storageInfo.available_mb} MB
  Total: ${storageInfo.total_mb} MB
  Used: ${storageInfo.used_mb} MB`;

        if (requiredMB !== undefined) {
          statusText += `\n  Required: ${requiredMB} MB`;
          statusText += `\n  Sufficient: ${storageInfo.sufficient ? 'Yes' : 'No'}`;
        }

        if (storageInfo.critical) {
          statusText += '\n  ⚠️  CRITICAL: Less than 5% disk space remaining!';
        } else if (storageInfo.warning) {
          statusText += '\n  ⚠️  WARNING: Less than 10% disk space remaining';
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: statusText,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = isCloudronError(error)
      ? `Cloudron API Error: ${error.message} (${error.statusCode ?? 'unknown'})`
      : error instanceof Error
        ? error.message
        : 'Unknown error occurred';

    return {
      content: [{ type: 'text' as const, text: message }],
      isError: true,
    };
  }
});

// Main entry point
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cloudron MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
