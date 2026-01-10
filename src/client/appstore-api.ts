/**
 * App Store API
 * App store search operations
 */

import type { AppStoreApp, AppStoreResponse } from "../types.js"
import type { HttpClient } from "./http-client.js"

/**
 * App Store API for Cloudron app store operations
 */
export class AppStoreApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Search Cloudron App Store for available applications
   * GET /api/v1/appstore/apps?search={query}
   * @param query - Optional search query (empty returns all apps)
   * @returns Array of app store apps sorted by relevance score
   */
  async searchApps(query?: string): Promise<AppStoreApp[]> {
    const endpoint = query
      ? `/api/v1/appstore/apps?search=${encodeURIComponent(query)}`
      : "/api/v1/appstore/apps"

    const response = await this.http.get<AppStoreResponse>(endpoint)

    // Sort results by relevance score (highest first) if available
    const apps = response.apps || []
    return apps.sort((a, b) => {
      const scoreA = a.relevanceScore ?? 0
      const scoreB = b.relevanceScore ?? 0
      return scoreB - scoreA // Descending order (highest relevance first)
    })
  }
}
