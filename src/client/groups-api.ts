/**
 * Groups API
 * Group management operations
 */

import { CloudronError } from "../errors.js"
import type { CreateGroupParams, Group, GroupsResponse } from "../types.js"
import type { HttpClient } from "./http-client.js"

/**
 * Groups API for Cloudron group management
 */
export class GroupsApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all groups on Cloudron instance
   * GET /api/v1/groups
   * @returns Array of groups sorted by name
   */
  async listGroups(): Promise<Group[]> {
    const response = await this.http.get<GroupsResponse>("/api/v1/groups")

    // Sort groups by name alphabetically
    const groups = response.groups || []
    return groups.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Create a new group
   * POST /api/v1/groups
   * @param params - Group creation parameters (name required)
   * @returns Created group object
   */
  async createGroup(params: CreateGroupParams): Promise<Group> {
    if (!params.name || params.name.trim() === "") {
      throw new CloudronError("Group name is required and cannot be empty")
    }

    return await this.http.post<Group>("/api/v1/groups", params)
  }
}
