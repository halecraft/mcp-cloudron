/**
 * Git Fetch Tool Handler
 * Fetches package examples from git.cloudron.io
 */

import { CloudronGitClient } from "../../git/cloudron-git-client.js"
import { PackageIndex } from "../../git/package-index.js"
import type { ToolRegistry } from "../registry.js"
import { textResponse } from "../response.js"
import { parseAppIdArgs } from "../validators.js"

const gitClient = new CloudronGitClient()

export const gitFetchHandlers: ToolRegistry = {
  cloudron_fetch_package_example: async (args, _ctx) => {
    const packageIndex = new PackageIndex()
    const { appId } = parseAppIdArgs(args)

    const repo = await packageIndex.findRepo(appId)
    if (!repo) {
      return textResponse(
        `Could not find a repository for App ID: ${appId}.
        
This tool searches git.cloudron.io for a repository matching the App ID.
Please verify the App ID is correct (e.g., 'com.electerious.ackee').`,
      )
    }

    // Fetch key files
    const files = ["CloudronManifest.json", "Dockerfile", "start.sh"]
    const results: Record<string, string> = {}

    for (const file of files) {
      try {
        results[file] = await gitClient.getRawFile(
          repo.path,
          repo.default_branch,
          file,
        )
      } catch (e) {
        results[file] =
          `(File not found or error: ${e instanceof Error ? e.message : String(e)})`
      }
    }

    return textResponse(
      `Found repository: ${repo.name} (${repo.http_url_to_repo})
Branch: ${repo.default_branch}

${files.map(f => `--- ${f} ---\n${results[f]}\n`).join("\n")}`,
    )
  },
}
