/**
 * Tool Handler Functions
 * Implements MCP tool execution by calling Cloudron API client
 */

import { CloudronClient } from '../cloudron-client.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { toMCPErrorMessage } from '../errors.js';

/**
 * Handle cloudron_list_apps tool call
 */
export async function handleListApps(
  client: CloudronClient,
  _args: Record<string, unknown>
): Promise<CallToolResult> {
  try {
    const apps = await client.listApps({});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ apps, count: apps.length }, null, 2),
        },
      ],
    };
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
}

/**
 * Handle cloudron_restart_app tool call
 */
export async function handleRestartApp(
  client: CloudronClient,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  try {
    const appId = args.appId as string;
    if (!appId) {
      throw new Error('appId parameter is required');
    }

    await client.restartApp({ appId });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Application ${appId} restart initiated`,
            },
            null,
            2
          ),
        },
      ],
    };
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
}

/**
 * Handle cloudron_status tool call
 */
export async function handleStatus(
  client: CloudronClient,
  _args: Record<string, unknown>
): Promise<CallToolResult> {
  try {
    const status = await client.getStatus({});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ status }, null, 2),
        },
      ],
    };
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
}
