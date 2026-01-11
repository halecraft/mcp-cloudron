/**
 * System API
 * System status, storage, domains, and services operations
 */

import {
  STORAGE_CRITICAL_THRESHOLD,
  STORAGE_WARNING_THRESHOLD,
} from "../config.js"
import { CloudronError } from "../errors.js"
import type {
  DiskUsageResponse,
  Domain,
  Service,
  ServicesResponse,
  StorageInfo,
  SystemStatus,
} from "../types.js"
import type { HttpClient } from "./http-client.js"

/**
 * System API for Cloudron system operations
 */
export class SystemApi {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get Cloudron system status
   * GET /api/v1/cloudron/status
   */
  async getStatus(): Promise<SystemStatus> {
    return await this.http.get<SystemStatus>("/api/v1/cloudron/status")
  }

  /**
   * Get disk usage
   * GET /api/v1/system/disk_usage
   */
  async getDiskUsage(): Promise<DiskUsageResponse> {
    return await this.http.get<DiskUsageResponse>("/api/v1/system/disk_usage")
  }

  /**
   * Check available disk space for pre-flight validation
   * GET /api/v1/system/disk_usage
   * @param requiredMB - Optional required disk space in MB
   * @returns Storage info with availability and threshold checks
   */
  async checkStorage(requiredMB?: number): Promise<StorageInfo> {
    const diskUsage = await this.getDiskUsage()

    // Find the root filesystem or the one with largest space?
    // Spec example shows "/dev/nvme0n1p2" with mountpoint "/"
    // We'll look for mountpoint "/"
    let rootFs = Object.values(diskUsage.usage.filesystems).find(
      fs => fs.mountpoint === "/",
    )

    if (!rootFs) {
      // Fallback to first one if root not found
      rootFs = Object.values(diskUsage.usage.filesystems)[0]
    }

    if (!rootFs) {
      throw new CloudronError("Disk information not available")
    }

    // Convert bytes to MB
    const available_mb = Math.floor(rootFs.available / 1024 / 1024)
    const total_mb = Math.floor(rootFs.size / 1024 / 1024)
    const used_mb = Math.floor(rootFs.used / 1024 / 1024)

    // Check if sufficient space available (if requiredMB provided)
    const sufficient =
      requiredMB !== undefined ? available_mb >= requiredMB : true

    // Warning threshold: available < configured percentage of total
    const warning = available_mb < total_mb * STORAGE_WARNING_THRESHOLD

    // Critical threshold: available < configured percentage of total
    const critical = available_mb < total_mb * STORAGE_CRITICAL_THRESHOLD

    return {
      available_mb,
      total_mb,
      used_mb,
      sufficient,
      warning,
      critical,
    }
  }

  /**
   * List all configured domains on Cloudron instance
   * GET /api/v1/domains
   * @returns Array of domain configurations
   */
  async listDomains(): Promise<Domain[]> {
    const response = await this.http.get<{ domains: Domain[] }>(
      "/api/v1/domains",
    )
    return response.domains
  }

  /**
   * List all platform services (read-only diagnostics)
   * GET /api/v1/services
   * @returns Array of service status objects
   */
  async listServices(): Promise<Service[]> {
    const response = await this.http.get<ServicesResponse>("/api/v1/services")
    return response.services.map(name => ({
      name,
      status: "unknown",
    }))
  }
}
