/**
 * Cloudron Git Client
 * Handles interaction with git.cloudron.io (GitLab)
 */

import { CloudronError } from "../errors.js"

export interface GitLabProject {
  id: number
  name: string
  path: string // repo name
  default_branch: string
  http_url_to_repo: string
}

export class CloudronGitClient {
  private readonly baseUrl = "https://git.cloudron.io"
  private readonly packagesGroupId = 16

  /**
   * Fetch all projects in the packages group
   * Handles pagination to get the complete list
   */
  async getProjects(): Promise<GitLabProject[]> {
    const projects: GitLabProject[] = []
    let page = 1
    const perPage = 100

    while (true) {
      try {
        const response = await fetch(
          `${this.baseUrl}/api/v4/groups/${this.packagesGroupId}/projects?per_page=${perPage}&page=${page}`,
        )

        if (!response.ok) {
          throw new CloudronError(
            `Failed to fetch projects from git.cloudron.io: ${response.statusText}`,
          )
        }

        const pageProjects = (await response.json()) as GitLabProject[]

        if (pageProjects.length === 0) {
          break
        }

        projects.push(...pageProjects)
        page++
      } catch (error) {
        throw new CloudronError(
          `Network error fetching projects: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    return projects
  }

  /**
   * Fetch a raw file from a repository
   */
  async getRawFile(
    repoPath: string,
    branch: string,
    filename: string,
  ): Promise<string> {
    const url = `${this.baseUrl}/packages/${repoPath}/-/raw/${branch}/${filename}`

    try {
      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          throw new CloudronError(`File not found: ${filename} in ${repoPath}`)
        }
        throw new CloudronError(
          `Failed to fetch file ${filename}: ${response.statusText}`,
        )
      }

      return await response.text()
    } catch (error) {
      if (error instanceof CloudronError) throw error
      throw new CloudronError(
        `Network error fetching file: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
