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
import type { App, SystemStatus, TaskStatus, StorageInfo, ValidatableOperation, ValidationResult, Backup, User, LogType, LogEntry, ManifestValidationResult } from './types.js';

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
    description: 'Get the status of an async operation (backup, install, restore, etc.) by task ID. Returns state (pending/running/success/error/cancelled), progress (0-100%), and message.',
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
    name: 'cloudron_cancel_task',
    description: 'Cancel a running async operation (kill switch). Returns updated task status with state "cancelled". Already completed tasks cannot be cancelled. Cancelled tasks cleanup resources (e.g., partial backups deleted).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: {
          type: 'string',
          description: 'The unique identifier of the task to cancel',
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
    name: 'cloudron_configure_app',
    description: 'Update application configuration including environment variables, memory limits, and access control settings. Returns 200 OK with updated app config and restart requirement flag.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The unique identifier of the application to configure',
        },
        config: {
          type: 'object',
          description: 'Configuration object with env vars, memoryLimit, and/or accessRestriction',
          properties: {
            env: {
              type: 'object',
              description: 'Environment variables as key-value pairs (optional)',
              additionalProperties: { type: 'string' },
            },
            memoryLimit: {
              type: 'number',
              description: 'Memory limit in MB (optional)',
            },
            accessRestriction: {
              type: ['string', 'null'],
              description: 'Access control settings (optional)',
            },
          },
        },
      },
      required: ['appId', 'config'],
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
    name: 'cloudron_create_backup',
    description: 'Create a new backup of the Cloudron instance. Performs F36 pre-flight storage check (requires 5GB minimum). Returns task ID for tracking backup progress via cloudron_task_status (F34).',
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
  {
    name: 'cloudron_validate_manifest',
    description: 'Validate app manifest before installation (pre-flight safety check). Checks storage sufficiency via F36, dependency availability, and manifest schema validity. Returns validation report with errors and warnings.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The App Store ID to validate',
        },
      },
      required: ['appId'],
    },
  },
  {
    name: 'cloudron_create_user',
    description: 'Create a new user on the Cloudron instance with role assignment (atomic operation). Password must be at least 8 characters long and contain at least 1 uppercase letter and 1 number. Returns 201 Created with user object.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        email: {
          type: 'string',
          description: 'User email address (must be valid format)',
        },
        password: {
          type: 'string',
          description: 'User password (8+ characters, 1 uppercase, 1 number)',
        },
        role: {
          type: 'string',
          enum: ['admin', 'user', 'guest'],
          description: 'User role: admin (full access), user (standard access), or guest (limited access)',
        },
      },
      required: ['email', 'password', 'role'],
    },
  },
  {
    name: 'cloudron_get_logs',
    description: 'Get logs for an app or service. Logs are formatted with timestamps and severity levels for readability. Type parameter determines endpoint: "app" calls GET /api/v1/apps/:id/logs, "service" calls GET /api/v1/services/:id/logs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        resourceId: {
          type: 'string',
          description: 'App ID or service ID to retrieve logs for',
        },
        type: {
          type: 'string',
          enum: ['app', 'service'],
          description: 'Type of resource: "app" for application logs, "service" for system service logs',
        },
        lines: {
          type: 'number',
          description: 'Optional: Number of log lines to retrieve (default 100, max 1000)',
        },
      },
      required: ['resourceId', 'type'],
    },
  },
  {
    name: 'cloudron_uninstall_app',
    description: 'Uninstall an application with pre-flight safety validation. DESTRUCTIVE OPERATION. First validates via cloudron_validate_operation (checks app exists, no dependencies, backup recommended), then calls DELETE /api/v1/apps/:id. Returns 202 Accepted with task ID for async operation tracking.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        appId: {
          type: 'string',
          description: 'The unique identifier of the application to uninstall',
        },
      },
      required: ['appId'],
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

        if (taskStatus.state === 'cancelled') {
          statusText += '\n  ℹ️  Task was cancelled by user request';
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

      case 'cloudron_cancel_task': {
        const taskId = (args as { taskId: string }).taskId;
        const taskStatus = await cloudron.cancelTask(taskId);

        let statusText = `Task Cancellation:
  Task ID: ${taskStatus.id}
  New State: ${taskStatus.state}
  Message: ${taskStatus.message}`;

        if (taskStatus.state === 'cancelled') {
          statusText += '\n\n✅ Task successfully cancelled. Resources have been cleaned up.';
        } else {
          statusText += `\n\n⚠️  Task is in state '${taskStatus.state}' (expected 'cancelled'). Cancellation may not have completed.`;
        }

        statusText += `\n\nUse cloudron_task_status with taskId '${taskId}' to verify final state.`;

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

      case 'cloudron_configure_app': {
        const { appId, config } = args as { appId: string; config: Record<string, unknown> };

        // Validate config object is provided and not empty
        if (!config || Object.keys(config).length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Config object is required and cannot be empty. Provide at least one of: env, memoryLimit, accessRestriction',
              },
            ],
            isError: true,
          };
        }

        const result = await cloudron.configureApp(appId, config);

        // Format config changes summary
        const configChanges = Object.keys(config).map(key => {
          if (key === 'env') {
            const envCount = Object.keys(config.env as object).length;
            return `  - Environment variables: ${envCount} variable(s) updated`;
          } else if (key === 'memoryLimit') {
            return `  - Memory limit: ${config.memoryLimit} MB`;
          } else if (key === 'accessRestriction') {
            return `  - Access restriction: ${config.accessRestriction ?? 'none'}`;
          } else {
            return `  - ${key}: updated`;
          }
        }).join('\n');

        const restartNote = result.restartRequired
          ? '\n⚠️  App restart required for configuration changes to take effect. Use cloudron_control_app with action "restart".'
          : '\n✓ Configuration applied. No restart required.';

        return {
          content: [
            {
              type: 'text' as const,
              text: `App configuration updated successfully.
App ID: ${appId}

Configuration changes:
${configChanges}
${restartNote}`,
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

      case 'cloudron_create_backup': {
        // F36 pre-flight storage check performed in createBackup()
        const taskId = await cloudron.createBackup();

        return {
          content: [
            {
              type: 'text' as const,
              text: `Backup creation started successfully.

Task ID: ${taskId}

Use cloudron_task_status with taskId="${taskId}" to track backup progress.

Note: Pre-flight storage check passed (5GB minimum required).`,
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

      case 'cloudron_validate_manifest': {
        const { appId } = args as { appId: string };
        const result = await cloudron.validateManifest(appId);

        if (result.valid) {
          const warningText = result.warnings.length > 0
            ? `\n\nWarnings:\n${result.warnings.map(w => `  - ${w}`).join('\n')}`
            : '';

          return {
            content: [
              {
                type: 'text' as const,
                text: `Manifest validation passed for app: ${appId}

App is ready for installation.${warningText}`,
              },
            ],
          };
        } else {
          const errorsText = result.errors.map(e => `  - ${e}`).join('\n');
          const warningsText = result.warnings.length > 0
            ? `\n\nWarnings:\n${result.warnings.map(w => `  - ${w}`).join('\n')}`
            : '';

          return {
            content: [
              {
                type: 'text' as const,
                text: `Manifest validation failed for app: ${appId}

Errors (must be resolved):
${errorsText}${warningsText}`,
              },
            ],
          };
        }
      }

      case 'cloudron_create_user': {
        const { email, password, role } = args as { email: string; password: string; role: 'admin' | 'user' | 'guest' };
        const user = await cloudron.createUser(email, password, role);

        return {
          content: [
            {
              type: 'text' as const,
              text: `User created successfully:
  ID: ${user.id}
  Email: ${user.email}
  Username: ${user.username}
  Role: ${user.role}
  Created: ${new Date(user.createdAt).toLocaleString()}`,
            },
          ],
        };
      }

      case 'cloudron_get_logs': {
        const { resourceId, type, lines } = args as { resourceId: string; type: LogType; lines?: number };
        const logEntries = await cloudron.getLogs(resourceId, type, lines);

        // Format logs for display
        const formattedLogs = logEntries.map(entry =>
          `[${entry.timestamp}] [${entry.severity}] ${entry.message}`
        ).join('\n');

        const logType = type === 'app' ? 'Application' : 'Service';

        return {
          content: [
            {
              type: 'text' as const,
              text: `${logType} logs for ${resourceId} (${logEntries.length} entries):\n\n${formattedLogs}`,
            },
          ],
        };
      }

      case 'cloudron_uninstall_app': {
        const { appId } = args as { appId: string };
        const result = await cloudron.uninstallApp(appId);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Uninstall operation initiated for app: ${appId}
  Task ID: ${result.taskId}
  Status: Pending (202 Accepted)

Use cloudron_task_status with taskId '${result.taskId}' to track uninstall progress.

Note: This is a DESTRUCTIVE operation. The app and its data will be removed once the task completes.`,
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
