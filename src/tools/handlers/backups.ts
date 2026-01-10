/**
 * Backup-related tool handlers
 */

import { BACKUP_MIN_STORAGE_MB } from "../../config.js"
import { formatBackup } from "../formatters.js"
import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"

export const backupHandlers: ToolRegistry = {
  cloudron_list_backups: async (_args, ctx) => {
    const backups = await ctx.backups.listBackups()

    if (backups.length === 0) {
      return textResponse("No backups found.")
    }

    const formatted = backups
      .map((backup, i) => formatBackup(backup, i))
      .join("\n\n")

    return textResponse(`Found ${backups.length} backup(s):\n\n${formatted}`)
  },

  cloudron_create_backup: async (_args, ctx) => {
    // F36 pre-flight storage check performed in createBackup()
    const taskId = await ctx.backups.createBackup()

    return textResponse(`Backup creation started successfully.

Task ID: ${taskId}

Use cloudron_task_status with taskId="${taskId}" to track backup progress.

Note: Pre-flight storage check passed (${BACKUP_MIN_STORAGE_MB}MB minimum required).`)
  },
}
