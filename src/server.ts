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
import type { App, SystemStatus, TaskStatus, StorageInfo, ValidatableOperation, ValidationResult, Backup, User } from './types.js';

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
  {
    name: 'cloudron_validate_operation',
    description: 'Pre-flight validation for destructive operations (uninstall app, delete user, restore backup). Returns validation result with blocking errors, warnings, and recommendations.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        operation: {
          type: 'string',
          enum: ['uninstall_app', 'delete_user', 'restore_backup'],
          description: 'Type of destructive operation to validate',
        },
        resourceId: {
          type: 'string',
          description: 'ID of the resource being operated on (appId, userId, or backupId)',
        },
      },
      required: ['operation', 'resourceId'],
    },
  },
  {
    name: 'cloudron_control_app',
    description: 'Control app lifecycle (start, stop, restart). Returns 202 Accepted with task ID for async operation tracking via cloudron_task_status.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The unique identifier of the application to control',
        },
        action: {
          type: 'string',
          enum: ['start', 'stop', 'restart'],
          description: 'Action to perform on the app',
        },
      },
      required: ['appId', 'action'],
    },
  },
  {
    name: 'cloudron_list_backups',
    description: 'List all backups available on the Cloudron instance. Returns backup details including ID, timestamp, size, app count, and status. Backups are sorted by timestamp (newest first).',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'cloudron_list_users',
    description: 'List all users on the Cloudron instance. Returns user details including ID, email, username, role, and creation date. Users are sorted by role (admin, user, guest) then email.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'cloudron_search_apps',
    description: 'Search the Cloudron App Store for available applications. Returns app details including name, description, version, icon URL, and install count. Results are sorted by relevance score. Empty query returns all available apps.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query to filter apps (optional - empty returns all apps)',
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

      case 'cloudron_validate_operation': {
        const { operation, resourceId } = args as { operation: ValidatableOperation; resourceId: string };
        const validationResult = await cloudron.validateOperation(operation, resourceId);

        let statusText = `Validation Result for ${operation} on resource '${resourceId}':
  Valid: ${validationResult.valid ? 'Yes' : 'No'}`;

        if (validationResult.errors.length > 0) {
          statusText += '\n\nBlocking Errors:';
          validationResult.errors.forEach((error, i) => {
            statusText += `\n  ${i + 1}. ${error}`;
          });
        }

        if (validationResult.warnings.length > 0) {
          statusText += '\n\nWarnings:';
          validationResult.warnings.forEach((warning, i) => {
            statusText += `\n  ${i + 1}. ${warning}`;
          });
        }

        if (validationResult.recommendations.length > 0) {
          statusText += '\n\nRecommendations:';
          validationResult.recommendations.forEach((rec, i) => {
            statusText += `\n  ${i + 1}. ${rec}`;
          });
        }

        if (validationResult.valid) {
          statusText += '\n\n✅ Operation can proceed (warnings should be reviewed)';
        } else {
          statusText += '\n\n❌ Operation blocked due to errors listed above';
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

      case 'cloudron_control_app': {
        const { appId, action } = args as { appId: string; action: 'start' | 'stop' | 'restart' };

        // Validate action enum
        if (!['start', 'stop', 'restart'].includes(action)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Invalid action: ${action}. Valid options: start, stop, restart`,
              },
            ],
            isError: true,
          };
        }

        // Execute action
        let result: { taskId: string };
        switch (action) {
          case 'start':
            result = await cloudron.startApp(appId);
            break;
          case 'stop':
            result = await cloudron.stopApp(appId);
            break;
          case 'restart':
            result = await cloudron.restartApp(appId);
            break;
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `App ${action} initiated successfully.
  App ID: ${appId}
  Task ID: ${result.taskId}

Use cloudron_task_status with taskId '${result.taskId}' to track completion.`,
            },
          ],
        };
      }

      case 'cloudron_list_backups': {
        const backups = await cloudron.listBackups();

        if (backups.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No backups found.',
              },
            ],
          };
        }

        const formatted = backups.map((backup, i) => {
          const timestamp = new Date(backup.creationTime).toLocaleString();
          const size = backup.size ? `${Math.round(backup.size / 1024 / 1024)} MB` : 'N/A';
          const appCount = backup.appCount !== undefined ? backup.appCount : 'N/A';

          return `${i + 1}. Backup ${backup.id}
  Timestamp: ${timestamp}
  Version: ${backup.version}
  Type: ${backup.type}
  State: ${backup.state}
  Size: ${size}
  App Count: ${appCount}${backup.errorMessage ? `\n  Error: ${backup.errorMessage}` : ''}`;
        }).join('\n\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Found ${backups.length} backup(s):\n\n${formatted}`,
            },
          ],
        };
      }

      case 'cloudron_list_users': {
        const users = await cloudron.listUsers();

        if (users.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No users found.',
              },
            ],
          };
        }

        const formatted = users.map((user, i) => {
          const createdAt = new Date(user.createdAt).toLocaleString();

          return `${i + 1}. ${user.username} (${user.email})
  ID: ${user.id}
  Role: ${user.role}
  Created: ${createdAt}`;
        }).join('\n\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Found ${users.length} user(s):\n\n${formatted}`,
            },
          ],
        };
      }

      case 'cloudron_search_apps': {
        const { query } = args as { query?: string };
        const apps = await cloudron.searchApps(query);

        if (apps.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: query
                  ? `No apps found matching query: "${query}"`
                  : 'No apps available in the App Store.',
              },
            ],
          };
        }

        const formatted = apps.map((app, i) => {
          const installCount = app.installCount !== undefined ? app.installCount : 'N/A';
          const iconUrl = app.iconUrl || 'N/A';
          const score = app.relevanceScore !== undefined ? app.relevanceScore.toFixed(2) : 'N/A';

          return `${i + 1}. ${app.name} (${app.id})
  Version: ${app.version}
  Description: ${app.description}
  Install Count: ${installCount}
  Icon URL: ${iconUrl}
  Relevance Score: ${score}`;
        }).join('\n\n');

        const searchInfo = query ? `Search results for "${query}"` : 'All available apps';

        return {
          content: [
            {
              type: 'text' as const,
              text: `${searchInfo}:\n\nFound ${apps.length} app(s):\n\n${formatted}`,
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
