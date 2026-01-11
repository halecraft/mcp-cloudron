/**
 * Package Index
 * Maps App Store IDs to Git Repositories
 */

import type { GitLabProject } from "./cloudron-git-client.js"
import { CloudronGitClient } from "./cloudron-git-client.js"

export class PackageIndex {
  private projects: GitLabProject[] | null = null
  private client: CloudronGitClient

  constructor() {
    this.client = new CloudronGitClient()
  }

  /**
   * Find the repository for a given App Store ID
   * Uses heuristics and verification to find the correct repo
   */
  async findRepo(appId: string): Promise<GitLabProject | null> {
    if (!this.projects) {
      this.projects = await this.client.getProjects()
    }

    // 1. Exact match (unlikely but possible)
    const exact = this.projects.find(p => p.path === appId)
    if (exact) return exact

    // 2. Heuristic search
    // Normalize path: ackee-app -> ackee
    // Check if the normalized path is part of the App ID
    const candidates = this.projects.filter(p => {
      const normalizedPath = p.path.replace(/-app$/, "").toLowerCase()
      // Skip very short names to avoid false positives
      if (normalizedPath.length < 3) return false
      return appId.toLowerCase().includes(normalizedPath)
    })

    // Sort candidates by length (longest match first) to prioritize specific matches
    candidates.sort((a, b) => b.path.length - a.path.length)

    // 3. Verify candidates by checking manifest
    for (const project of candidates) {
      try {
        const manifestContent = await this.client.getRawFile(
          project.path,
          project.default_branch,
          "CloudronManifest.json",
        )
        const manifest = JSON.parse(manifestContent)
        if (manifest.id === appId) {
          return project
        }
      } catch {}
    }

    return null
  }
}
