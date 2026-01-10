/**
 * App Store-related tool handlers
 */

import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"
import { parseAppIdArgs, parseSearchAppsArgs } from "../validators.js"

export const appstoreHandlers: ToolRegistry = {
  cloudron_search_apps: async (args, ctx) => {
    const { query } = parseSearchAppsArgs(args)
    const apps = await ctx.appstore.searchApps(query)

    if (apps.length === 0) {
      return textResponse(
        query
          ? `No apps found matching query: "${query}"`
          : "No apps available in the App Store.",
      )
    }

    const formatted = apps
      .map((app, i) => {
        const installCount =
          app.installCount !== undefined ? app.installCount : "N/A"
        const iconUrl = app.iconUrl || "N/A"
        const score =
          app.relevanceScore !== undefined
            ? app.relevanceScore.toFixed(2)
            : "N/A"

        return `${i + 1}. ${app.name} (${app.id})
  Version: ${app.version}
  Description: ${app.description}
  Install Count: ${installCount}
  Icon URL: ${iconUrl}
  Relevance Score: ${score}`
      })
      .join("\n\n")

    const searchInfo = query
      ? `Search results for "${query}"`
      : "All available apps"

    return textResponse(
      `${searchInfo}:\n\nFound ${apps.length} app(s):\n\n${formatted}`,
    )
  },

  cloudron_validate_manifest: async (args, ctx) => {
    const { appId } = parseAppIdArgs(args)
    const result = await ctx.validation.validateManifest(appId)

    if (result.valid) {
      const warningText =
        result.warnings.length > 0
          ? `\n\nWarnings:\n${result.warnings.map(w => `  - ${w}`).join("\n")}`
          : ""

      return textResponse(`Manifest validation passed for app: ${appId}

App is ready for installation.${warningText}`)
    } else {
      const errorsText = result.errors.map(e => `  - ${e}`).join("\n")
      const warningsText =
        result.warnings.length > 0
          ? `\n\nWarnings:\n${result.warnings.map(w => `  - ${w}`).join("\n")}`
          : ""

      return textResponse(`Manifest validation failed for app: ${appId}

Errors (must be resolved):
${errorsText}${warningsText}`)
    }
  },
}
