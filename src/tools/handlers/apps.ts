/**
 * App-related tool handlers
 */

import { formatApp, formatConfigChanges } from "../formatters.js"
import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"
import {
  parseAppIdArgs,
  parseConfigureAppArgs,
  parseControlAppArgs,
  parseInstallAppArgs,
} from "../validators.js"

export const appHandlers: ToolRegistry = {
  cloudron_list_apps: async (_args, client) => {
    const apps = await client.listApps()
    const formatted = apps.map(formatApp).join("\n\n")
    return textResponse(`Found ${apps.length} apps:\n\n${formatted}`)
  },

  cloudron_get_app: async (args, client) => {
    const { appId } = parseAppIdArgs(args)
    const app = await client.getApp(appId)
    return textResponse(formatApp(app))
  },

  cloudron_control_app: async (args, client) => {
    const { appId, action } = parseControlAppArgs(args)

    let result: { taskId: string }
    switch (action) {
      case "start":
        result = await client.startApp(appId)
        break
      case "stop":
        result = await client.stopApp(appId)
        break
      case "restart":
        result = await client.restartApp(appId)
        break
    }

    return textResponse(`App ${action} initiated successfully.
  App ID: ${appId}
  Task ID: ${result.taskId}

Use cloudron_task_status with taskId '${result.taskId}' to track completion.`)
  },

  cloudron_configure_app: async (args, client) => {
    const { appId, config } = parseConfigureAppArgs(args)
    const result = await client.configureApp(appId, config)

    const configChanges = formatConfigChanges(config)
    const restartNote = result.restartRequired
      ? '\n⚠️  App restart required for configuration changes to take effect. Use cloudron_control_app with action "restart".'
      : "\n✓ Configuration applied. No restart required."

    return textResponse(`App configuration updated successfully.
App ID: ${appId}

Configuration changes:
${configChanges}
${restartNote}`)
  },

  cloudron_uninstall_app: async (args, client) => {
    const { appId } = parseAppIdArgs(args)
    const result = await client.uninstallApp(appId)

    return textResponse(`Uninstall operation initiated for app: ${appId}
  Task ID: ${result.taskId}
  Status: Pending (202 Accepted)

Use cloudron_task_status with taskId '${result.taskId}' to track uninstall progress.

Note: This is a DESTRUCTIVE operation. The app and its data will be removed once the task completes.`)
  },

  cloudron_install_app: async (args, client) => {
    const parsed = parseInstallAppArgs(args)

    const taskId = await client.installApp(parsed)

    return textResponse(`Installation initiated for app: ${parsed.manifestId}
  Location: ${parsed.location}
  Task ID: ${taskId}
  Status: Pending (202 Accepted)

Use cloudron_task_status with taskId '${taskId}' to track installation progress.

Note: Pre-flight validation (F23a + F36) passed. Installation is in progress.`)
  },
}
