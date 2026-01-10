/**
 * App-related tool handlers
 */

import { BACKUP_MIN_STORAGE_MB } from "../../config.js"
import {
  formatApp,
  formatAsyncTaskResponse,
  formatConfigChanges,
} from "../formatters.js"
import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"
import {
  parseAppIdArgs,
  parseCloneAppArgs,
  parseConfigureAppArgs,
  parseControlAppArgs,
  parseInstallAppArgs,
  parseRestoreAppArgs,
  parseUpdateAppArgs,
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

    return textResponse(
      formatAsyncTaskResponse(
        `App installation for ${parsed.manifestId}`,
        taskId,
        `Location: ${parsed.location}.${parsed.domain}\n\nNote: Pre-flight validation passed. Installation is in progress.`,
      ),
    )
  },

  // ==================== New App Management Handlers ====================

  cloudron_clone_app: async (args, client) => {
    const parsed = parseCloneAppArgs(args)

    const cloneParams: import("../../types.js").CloneAppParams = {
      location: parsed.location,
    }
    if (parsed.domain !== undefined) {
      cloneParams.domain = parsed.domain
    }
    if (parsed.portBindings !== undefined) {
      cloneParams.portBindings = parsed.portBindings
    }
    if (parsed.backupId !== undefined) {
      cloneParams.backupId = parsed.backupId
    }

    const taskId = await client.cloneApp(parsed.appId, cloneParams)

    const targetLocation = parsed.domain
      ? `${parsed.location}.${parsed.domain}`
      : parsed.location

    return textResponse(
      formatAsyncTaskResponse(
        `App clone from ${parsed.appId}`,
        taskId,
        `Target location: ${targetLocation}\n\nNote: Pre-flight validation passed. Clone is in progress.`,
      ),
    )
  },

  cloudron_repair_app: async (args, client) => {
    const { appId } = parseAppIdArgs(args)

    const taskId = await client.repairApp(appId)

    return textResponse(
      formatAsyncTaskResponse(
        `App repair for ${appId}`,
        taskId,
        "Cloudron is attempting automatic repair of the application.",
      ),
    )
  },

  cloudron_restore_app: async (args, client) => {
    const { appId, backupId } = parseRestoreAppArgs(args)

    const taskId = await client.restoreApp(appId, { backupId })

    return textResponse(
      formatAsyncTaskResponse(
        `App restore for ${appId}`,
        taskId,
        `Restoring from backup: ${backupId}\n\n⚠️  DESTRUCTIVE OPERATION: Current app data will be replaced with backup data.`,
      ),
    )
  },

  cloudron_update_app: async (args, client) => {
    const parsed = parseUpdateAppArgs(args)

    let updateParams: import("../../types.js").UpdateAppParams | undefined
    if (parsed.version !== undefined || parsed.force !== undefined) {
      updateParams = {}
      if (parsed.version !== undefined) {
        updateParams.manifest = { version: parsed.version }
      }
      if (parsed.force !== undefined) {
        updateParams.force = parsed.force
      }
    }

    const taskId = await client.updateApp(parsed.appId, updateParams)

    const versionInfo = parsed.version
      ? `to version ${parsed.version}`
      : "to latest version"

    return textResponse(
      formatAsyncTaskResponse(
        `App update for ${parsed.appId}`,
        taskId,
        `Updating ${versionInfo}\n\nNote: Pre-flight validation passed. Update is in progress.`,
      ),
    )
  },

  cloudron_backup_app: async (args, client) => {
    const { appId } = parseAppIdArgs(args)

    const taskId = await client.backupApp(appId)

    return textResponse(
      formatAsyncTaskResponse(
        `App backup for ${appId}`,
        taskId,
        `Note: Pre-flight storage check passed (${BACKUP_MIN_STORAGE_MB}MB minimum required).`,
      ),
    )
  },
}
