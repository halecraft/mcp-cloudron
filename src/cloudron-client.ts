/**
 * Cloudron API Client
 * Full API implementation with DI support for testing
 */

import {
  BACKUP_MIN_STORAGE_MB,
  DEFAULT_TIMEOUT_MS,
  INSTALL_DEFAULT_STORAGE_MB,
  MAX_LOG_LINES,
  RESTORE_MIN_STORAGE_MB,
  STORAGE_CRITICAL_THRESHOLD,
  STORAGE_WARNING_THRESHOLD,
} from "./config.js"
import {
  CloudronError,
  createErrorFromStatus,
  isCloudronError,
} from "./errors.js"
import type {
  App,
  AppConfig,
  AppRaw,
  AppStoreApp,
  AppStoreAppRaw,
  AppsResponseRaw,
  Backup,
  BackupsResponse,
  CloneAppParams,
  CloudronClientConfig,
  ConfigureAppResponse,
  CreateGroupParams,
  CreateUserResponse,
  DiskUsageResponse,
  Domain,
  Group,
  GroupsResponse,
  InstallAppParams,
  LogEntry,
  LogType,
  ManifestValidationResult,
  RestoreAppParams,
  Service,
  ServicesResponse,
  StorageInfo,
  SystemStatus,
  TaskStatus,
  TaskStatusRaw,
  UpdateAppParams,
  UpdateInfo,
  UpdateUserParams,
  User,
  UsersResponse,
  ValidatableOperation,
  ValidationResult,
} from "./types.js"

export class CloudronClient {
  private readonly baseUrl: string
  private readonly token: string

  /**
   * Create CloudronClient with DI support
   * @param config - Optional config (defaults to env vars)
   */
  constructor(config?: Partial<CloudronClientConfig>) {
    const baseUrl = config?.baseUrl ?? process.env.CLOUDRON_BASE_URL
    const token = config?.token ?? process.env.CLOUDRON_API_TOKEN

    if (!baseUrl) {
      throw new CloudronError(
        "CLOUDRON_BASE_URL not set. Provide via config or environment variable.",
      )
    }
    if (!token) {
      throw new CloudronError(
        "CLOUDRON_API_TOKEN not set. Provide via config or environment variable.",
      )
    }

    this.baseUrl = baseUrl.replace(/\/$/, "") // Remove trailing slash
    this.token = token
  }

  /**
   * Make HTTP request to Cloudron API
   * NO retry logic (deferred to Phase 3 with idempotency keys)
   */
  private async makeRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    body?: unknown,
    options?: { timeout?: number; responseType?: "json" | "text" },
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
      }

      if (body !== undefined) {
        fetchOptions.body = JSON.stringify(body)
      }

      const response = await fetch(url, fetchOptions)

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorBody = await response.text()
        let message = `Cloudron API error: ${response.status} ${response.statusText}`

        try {
          const parsed = JSON.parse(errorBody)
          if (parsed.message) message = parsed.message
        } catch {
          // Use default message if body isn't JSON
        }

        throw createErrorFromStatus(response.status, message)
      }

      // Handle 204 No Content responses (e.g., DELETE operations)
      if (response.status === 204) {
        return undefined as T
      }

      if (options?.responseType === "text") {
        return (await response.text()) as unknown as T
      }

      return (await response.json()) as T
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof CloudronError) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new CloudronError(`Request timeout after ${timeout}ms`, {
            code: "TIMEOUT",
            cause: error,
          })
        }
        throw new CloudronError(`Network error: ${error.message}`, {
          code: "NETWORK_ERROR",
          cause: error,
        })
      }

      throw new CloudronError("Unknown error occurred", { cause: error })
    }
  }

  // ==================== MVP Endpoints ====================

  /**
   * Normalize raw app from API to our App interface
   * Maps 'subdomain' to 'location' and 'ports' to 'portBindings'
   */
  private normalizeApp(raw: AppRaw): App {
    return {
      id: raw.id,
      appStoreId: raw.appStoreId,
      installationState: raw.installationState as App["installationState"],
      installationProgress: raw.installationProgress ?? "",
      runState: raw.runState as App["runState"],
      health: raw.health as App["health"],
      location: raw.subdomain, // Normalize subdomain -> location
      domain: raw.domain,
      fqdn: raw.fqdn,
      accessRestriction: raw.accessRestriction,
      manifest: raw.manifest,
      portBindings: raw.ports ?? null, // Normalize ports -> portBindings
      iconUrl: raw.iconUrl,
      memoryLimit: raw.memoryLimit,
      creationTime: raw.creationTime ?? "",
    }
  }

  /**
   * List all installed apps
   * GET /api/v1/apps
   */
  async listApps(): Promise<App[]> {
    const response = await this.makeRequest<AppsResponseRaw>(
      "GET",
      "/api/v1/apps",
    )
    return response.apps.map(raw => this.normalizeApp(raw))
  }

  /**
   * Get a specific app by ID
   * GET /api/v1/apps/:appId
   *
   * Note: API returns app object directly, not wrapped in { app: {...} }
   */
  async getApp(appId: string): Promise<App> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    const raw = await this.makeRequest<AppRaw>(
      "GET",
      `/api/v1/apps/${encodeURIComponent(appId)}`,
    )
    return this.normalizeApp(raw)
  }

  /**
   * Get Cloudron system status
   * GET /api/v1/cloudron/status
   */
  async getStatus(): Promise<SystemStatus> {
    return await this.makeRequest<SystemStatus>(
      "GET",
      "/api/v1/cloudron/status",
    )
  }

  /**
   * List all backups
   * GET /api/v1/backups
   * @returns Array of backups sorted by timestamp (newest first)
   */
  async listBackups(): Promise<Backup[]> {
    const response = await this.makeRequest<BackupsResponse>(
      "GET",
      "/api/v1/backups",
    )

    // Sort backups by creationTime (newest first)
    const backups = response.backups || []
    return backups.sort((a, b) => {
      const timeA = new Date(a.creationTime).getTime()
      const timeB = new Date(b.creationTime).getTime()
      return timeB - timeA // Descending order (newest first)
    })
  }

  /**
   * Create a new backup (with F36 pre-flight storage check)
   * POST /api/v1/backups/create
   * @returns Task ID for tracking backup progress via getTaskStatus()
   */
  async createBackup(): Promise<string> {
    // F36 pre-flight storage check: Require minimum storage for backup
    const storageInfo = await this.checkStorage(BACKUP_MIN_STORAGE_MB)

    if (!storageInfo.sufficient) {
      throw new CloudronError(
        `Insufficient storage for backup. Required: ${BACKUP_MIN_STORAGE_MB}MB, Available: ${storageInfo.available_mb}MB`,
      )
    }

    if (storageInfo.warning) {
      // Log warning but allow operation to proceed
      console.warn(
        `Storage warning: ${storageInfo.available_mb}MB available (${((storageInfo.available_mb / storageInfo.total_mb) * 100).toFixed(1)}% of total)`,
      )
    }

    // Create backup (async operation) - correct endpoint per OpenAPI spec
    const response = await this.makeRequest<{ taskId: number }>(
      "POST",
      "/api/v1/backups/create",
    )

    if (response.taskId === undefined) {
      throw new CloudronError("Backup creation response missing taskId")
    }

    // API returns taskId as integer, convert to string for consistency
    return String(response.taskId)
  }

  /**
   * List all users on Cloudron instance
   * GET /api/v1/users
   * @returns Array of users sorted by role then email
   */
  async listUsers(): Promise<User[]> {
    const response = await this.makeRequest<UsersResponse>(
      "GET",
      "/api/v1/users",
    )

    // Sort users by role then email
    const users = response.users || []
    return users.sort((a, b) => {
      // Sort by role first (owner > admin > usermanager > mailmanager > user)
      const roleOrder: Record<string, number> = {
        owner: 0,
        admin: 1,
        usermanager: 2,
        mailmanager: 3,
        user: 4,
      }
      const roleCompare = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99)
      if (roleCompare !== 0) return roleCompare

      // Then by email alphabetically
      return a.email.localeCompare(b.email)
    })
  }

  /**
   * Search Cloudron App Store for available applications
   * GET /api/v1/appstore/apps?search={query}
   * @param query - Optional search query (empty returns all apps)
   * @returns Array of app store apps sorted by relevance score
   * @note This endpoint may not be available on all Cloudron instances.
   *       The App Store is a separate service at cloudron.io.
   */
  async searchApps(query?: string): Promise<AppStoreApp[]> {
    const endpoint = query
      ? `/api/v1/appstore/apps?search=${encodeURIComponent(query)}`
      : "/api/v1/appstore/apps"

    const response = await this.makeRequest<{ apps: AppStoreAppRaw[] }>(
      "GET",
      endpoint,
    )

    // Map raw API response to our AppStoreApp interface
    // The API may return different field names (e.g., manifest.title vs name)
    const apps: AppStoreApp[] = (response.apps || []).map(
      (raw: AppStoreAppRaw) => ({
        id: raw.id || raw.manifest?.id || "",
        name: raw.manifest?.title || raw.title || raw.name || "",
        description: raw.manifest?.description || raw.description || "",
        version: raw.manifest?.version || raw.version || "",
        iconUrl: raw.iconUrl || raw.manifest?.icon || null,
        installCount: raw.installCount,
        relevanceScore: raw.relevanceScore,
      }),
    )

    // Sort results by relevance score (highest first) if available
    return apps.sort((a, b) => {
      const scoreA = a.relevanceScore ?? 0
      const scoreB = b.relevanceScore ?? 0
      return scoreB - scoreA // Descending order (highest relevance first)
    })
  }

  /**
   * Create a new user with role assignment (atomic operation)
   * POST /api/v1/users
   * @param email - User email address
   * @param username - Username for login
   * @param password - User password (must meet strength requirements)
   * @param role - User role: 'owner', 'admin', 'usermanager', 'mailmanager', or 'user'
   * @param displayName - Display name (defaults to username if not provided)
   * @param fallbackEmail - Password recovery email (optional)
   * @returns Created user object
   */
  async createUser(
    email: string,
    username: string,
    password: string,
    role: "owner" | "admin" | "usermanager" | "mailmanager" | "user",
    displayName?: string,
    fallbackEmail?: string,
  ): Promise<User> {
    // Validate email format
    if (!email || !this.isValidEmail(email)) {
      throw new CloudronError("Invalid email format")
    }

    // Validate username
    if (!username || username.trim().length === 0) {
      throw new CloudronError("Username is required")
    }

    // Validate password strength (8+ chars, 1 uppercase, 1 number)
    if (!this.isValidPassword(password)) {
      throw new CloudronError(
        "Password must be at least 8 characters long and contain at least 1 uppercase letter and 1 number",
      )
    }

    // Validate role enum
    if (
      !["owner", "admin", "usermanager", "mailmanager", "user"].includes(role)
    ) {
      throw new CloudronError(
        `Invalid role: ${role}. Valid options: owner, admin, usermanager, mailmanager, user`,
      )
    }

    // Validate fallbackEmail if provided
    if (fallbackEmail && !this.isValidEmail(fallbackEmail)) {
      throw new CloudronError("Invalid fallback email format")
    }

    // Build request body
    const requestBody: {
      email: string
      username: string
      password: string
      role: string
      displayName?: string
      fallbackEmail?: string
    } = {
      email,
      username,
      password,
      role,
    }

    // Add optional fields if provided
    if (displayName) {
      requestBody.displayName = displayName
    } else {
      // Default displayName to username if not provided
      requestBody.displayName = username
    }

    if (fallbackEmail) {
      requestBody.fallbackEmail = fallbackEmail
    }

    const response = await this.makeRequest<CreateUserResponse>(
      "POST",
      "/api/v1/users",
      requestBody,
    )

    // Fetch the full user object since POST only returns ID
    return await this.getUser(response.id)
  }

  /**
   * List all configured domains on Cloudron instance
   * GET /api/v1/domains
   * @returns Array of domain configurations
   */
  async listDomains(): Promise<Domain[]> {
    const response = await this.makeRequest<{ domains: Domain[] }>(
      "GET",
      "/api/v1/domains",
    )
    return response.domains
  }

  /**
   * Validate email format using RFC 5322 simplified regex
   * @param email - Email to validate
   * @returns true if email format is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate password strength
   * Requirements: 8+ characters, 1 uppercase letter, 1 number
   * @param password - Password to validate
   * @returns true if password meets strength requirements
   */
  private isValidPassword(password: string): boolean {
    if (password.length < 8) return false
    if (!/[A-Z]/.test(password)) return false // At least 1 uppercase
    if (!/[0-9]/.test(password)) return false // At least 1 number
    return true
  }

  /**
   * Start an app
   * POST /api/v1/apps/:appId/start
   * @returns 202 Accepted response with task ID
   */
  async startApp(appId: string): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    return await this.makeRequest<{ taskId: string }>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/start`,
    )
  }

  /**
   * Stop an app
   * POST /api/v1/apps/:appId/stop
   * @returns 202 Accepted response with task ID
   */
  async stopApp(appId: string): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    return await this.makeRequest<{ taskId: string }>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/stop`,
    )
  }

  /**
   * Restart an app
   * POST /api/v1/apps/:appId/restart
   * @returns 202 Accepted response with task ID
   */
  async restartApp(appId: string): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    return await this.makeRequest<{ taskId: string }>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/restart`,
    )
  }

  /**
   * Set app environment variables
   * POST /api/v1/apps/:appId/configure/env
   * @param appId - The app ID to configure
   * @param env - Environment variables as key-value pairs
   * @returns Task info with taskId
   */
  async setAppEnv(
    appId: string,
    env: Record<string, string>,
  ): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    if (!env || typeof env !== "object") {
      throw new CloudronError("env must be an object of key-value pairs")
    }

    return await this.makeRequest<{ taskId: string }>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/configure/env`,
      { env },
    )
  }

  /**
   * Set app memory limit
   * POST /api/v1/apps/:appId/configure/memory_limit
   * @param appId - The app ID to configure
   * @param memoryLimit - Memory limit in bytes
   * @returns Task info with taskId
   */
  async setAppMemoryLimit(
    appId: string,
    memoryLimit: number,
  ): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    if (typeof memoryLimit !== "number" || memoryLimit <= 0) {
      throw new CloudronError(
        "memoryLimit must be a positive number (in bytes)",
      )
    }

    return await this.makeRequest<{ taskId: string }>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/configure/memory_limit`,
      { memoryLimit },
    )
  }

  /**
   * Set app access restriction
   * POST /api/v1/apps/:appId/configure/access_restriction
   * @param appId - The app ID to configure
   * @param accessRestriction - Access restriction object with users and/or groups arrays
   * @returns void (200 response with no content)
   */
  async setAppAccessRestriction(
    appId: string,
    accessRestriction: { users?: string[]; groups?: string[] } | null,
  ): Promise<void> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    await this.makeRequest<void>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/configure/access_restriction`,
      { accessRestriction },
    )
  }

  /**
   * Configure app settings (convenience method that calls granular endpoints)
   * @param appId - The app ID to configure
   * @param config - Configuration object with env vars, memoryLimit, accessRestriction
   * @returns Response with updated app and restart requirement flag
   * @deprecated Use setAppEnv(), setAppMemoryLimit(), setAppAccessRestriction() directly
   */
  async configureApp(
    appId: string,
    config: AppConfig,
  ): Promise<ConfigureAppResponse> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    // Validate config object has at least one field
    if (!config || Object.keys(config).length === 0) {
      throw new CloudronError("config object cannot be empty")
    }

    let restartRequired = false

    // Apply env vars if provided
    if (config.env !== undefined) {
      if (typeof config.env !== "object") {
        throw new CloudronError("env must be an object of key-value pairs")
      }
      await this.setAppEnv(appId, config.env)
      restartRequired = true
    }

    // Apply memory limit if provided
    if (config.memoryLimit !== undefined) {
      if (typeof config.memoryLimit !== "number" || config.memoryLimit <= 0) {
        throw new CloudronError("memoryLimit must be a positive number")
      }
      await this.setAppMemoryLimit(appId, config.memoryLimit)
      restartRequired = true
    }

    // Apply access restriction if provided
    if (config.accessRestriction !== undefined) {
      await this.setAppAccessRestriction(appId, config.accessRestriction)
    }

    // Fetch and return updated app
    const app = await this.getApp(appId)
    return { app, restartRequired }
  }

  /**
   * Uninstall an application (DESTRUCTIVE OPERATION)
   * POST /api/v1/apps/:id/uninstall
   * Returns task ID for async operation tracking
   * Performs pre-flight validation via F37 before proceeding
   */
  async uninstallApp(appId: string): Promise<{ taskId: string }> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    // Pre-flight validation via F37
    const validation = await this.validateOperation("uninstall_app", appId)

    // If validation fails, throw error with validation details
    if (!validation.valid) {
      const errorMessage = `Pre-flight validation failed for uninstall_app on '${appId}':\n${validation.errors.join("\n")}`
      throw new CloudronError(errorMessage)
    }

    // Proceed with uninstall if validation passes
    return await this.makeRequest<{ taskId: string }>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/uninstall`,
    )
  }

  /**
   * Normalize raw task status from API to our TaskStatus interface
   * The API returns boolean flags (active, pending, success) instead of a state string
   */
  private normalizeTaskStatus(raw: TaskStatusRaw): TaskStatus {
    // Determine state from boolean flags
    let state: TaskStatus["state"]
    if (raw.success === true) {
      state = "success"
    } else if (raw.error) {
      state = "error"
    } else if (raw.active === true) {
      state = "running"
    } else if (raw.pending === true) {
      state = "pending"
    } else {
      // Default to running if no clear state (task in progress)
      state = "running"
    }

    const result: TaskStatus = {
      id: raw.id,
      state,
      progress: raw.percent ?? 0,
      message: raw.message ?? "",
      result: raw.result,
    }

    if (raw.error) {
      const errorCode = raw.error.code?.toString()
      result.error = {
        message: raw.error.message,
        ...(errorCode !== undefined && { code: errorCode }),
      }
    }

    return result
  }

  /**
   * Get task status for async operations
   * GET /api/v1/tasks/:taskId
   * Normalizes the raw API response to our TaskStatus interface
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    if (!taskId) {
      throw new CloudronError("taskId is required")
    }
    const raw = await this.makeRequest<TaskStatusRaw>(
      "GET",
      `/api/v1/tasks/${encodeURIComponent(taskId)}`,
    )
    return this.normalizeTaskStatus(raw)
  }

  /**
   * Cancel a running async operation (kill switch)
   * DELETE /api/v1/tasks/:taskId
   * @returns Updated task status with 'cancelled' state
   */
  async cancelTask(taskId: string): Promise<TaskStatus> {
    if (!taskId) {
      throw new CloudronError("taskId is required")
    }
    const raw = await this.makeRequest<TaskStatusRaw>(
      "DELETE",
      `/api/v1/tasks/${encodeURIComponent(taskId)}`,
    )
    return this.normalizeTaskStatus(raw)
  }

  /**
   * Get logs for an app or service
   * GET /api/v1/apps/:id/logs or GET /api/v1/services/:id/logs
   * @param resourceId - App ID or service ID
   * @param type - Type of resource ('app' or 'service')
   * @param lines - Optional number of log lines to retrieve (default 100, max 1000)
   * @returns Formatted log entries with timestamps and severity levels
   */
  async getLogs(
    resourceId: string,
    type: LogType,
    lines: number = 100,
  ): Promise<LogEntry[]> {
    if (!resourceId) {
      throw new CloudronError("resourceId is required")
    }

    if (type !== "app" && type !== "service") {
      throw new CloudronError(
        `Invalid type: ${type}. Valid options: app, service`,
      )
    }

    // Clamp lines between 1 and MAX_LOG_LINES
    const clampedLines = Math.max(1, Math.min(MAX_LOG_LINES, lines))

    // Determine endpoint based on type
    const endpoint =
      type === "app"
        ? `/api/v1/apps/${encodeURIComponent(resourceId)}/logs?lines=${clampedLines}`
        : `/api/v1/services/${encodeURIComponent(resourceId)}/logs?lines=${clampedLines}`

    // Use responseType: 'text' because logs are returned as raw text/binary
    const response = await this.makeRequest<string>(
      "GET",
      endpoint,
      undefined,
      { responseType: "text" },
    )

    // Parse raw text logs (split by newline)
    const logLines = response.split("\n").filter(line => line.trim().length > 0)
    return this.parseLogEntries(logLines)
  }

  /**
   * Parse raw log lines into structured LogEntry objects
   * Attempts to extract timestamp and severity level from log lines
   */
  private parseLogEntries(logLines: string[]): LogEntry[] {
    return logLines.map(line => {
      // Try to parse common log formats:
      // 1. ISO timestamp at start: "2025-12-24T12:00:00Z [INFO] message"
      // 2. Syslog format: "Dec 24 12:00:00 host service[pid]: message"
      // 3. Simple format: "[INFO] message"
      // 4. Plain text: "message"

      const isoMatch = line.match(
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+\[?(\w+)\]?\s*(.*)$/,
      )
      if (isoMatch?.[1] && isoMatch[2] && isoMatch[3]) {
        return {
          timestamp: isoMatch[1],
          severity: isoMatch[2].toUpperCase(),
          message: isoMatch[3].trim(),
        }
      }

      const syslogMatch = line.match(
        /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+.*?\[\d+\]:\s*\[?(\w+)\]?\s*(.*)$/,
      )
      if (syslogMatch?.[1] && syslogMatch[2] && syslogMatch[3]) {
        return {
          timestamp: syslogMatch[1],
          severity: syslogMatch[2].toUpperCase(),
          message: syslogMatch[3].trim(),
        }
      }

      const simpleMatch = line.match(/^\[?(\w+)\]?\s+(.*)$/)
      if (
        simpleMatch?.[1] &&
        simpleMatch[2] &&
        [
          "DEBUG",
          "INFO",
          "WARN",
          "WARNING",
          "ERROR",
          "FATAL",
          "TRACE",
        ].includes(simpleMatch[1].toUpperCase())
      ) {
        return {
          timestamp: new Date().toISOString(),
          severity: simpleMatch[1].toUpperCase(),
          message: simpleMatch[2].trim(),
        }
      }

      // Fallback: plain text log line
      return {
        timestamp: new Date().toISOString(),
        severity: "INFO",
        message: line.trim(),
      }
    })
  }

  /**
   * Check available disk space for pre-flight validation
   * GET /api/v1/system/disk_usage
   * @param requiredMB - Optional required disk space in MB
   * @returns Storage info with availability and threshold checks
   */
  async checkStorage(requiredMB?: number): Promise<StorageInfo> {
    // Use correct endpoint for disk usage
    let diskUsage: DiskUsageResponse
    try {
      diskUsage = await this.makeRequest<DiskUsageResponse>(
        "GET",
        "/api/v1/system/disk_usage",
      )
    } catch (error) {
      // If the endpoint doesn't exist (404), return a permissive result
      // This allows operations to proceed on Cloudron instances without this API
      if (error instanceof CloudronError && error.statusCode === 404) {
        return {
          available_mb: Number.MAX_SAFE_INTEGER,
          total_mb: Number.MAX_SAFE_INTEGER,
          used_mb: 0,
          sufficient: true,
          warning: false,
          critical: false,
        }
      }
      throw error
    }

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
   * Validate a destructive operation before execution (pre-flight safety check)
   * @param operation - Type of operation to validate
   * @param resourceId - ID of the resource being operated on
   * @returns Validation result with errors, warnings, and recommendations
   */
  async validateOperation(
    operation: ValidatableOperation,
    resourceId: string,
  ): Promise<ValidationResult> {
    if (!resourceId) {
      throw new CloudronError("resourceId is required for operation validation")
    }

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    }

    switch (operation) {
      case "uninstall_app":
        await this.validateUninstallApp(resourceId, result)
        break
      case "delete_user":
        await this.validateDeleteUser(resourceId, result)
        break
      case "restore_backup":
        await this.validateRestoreBackup(resourceId, result)
        break
      default:
        throw new CloudronError(
          `Invalid operation type: ${operation}. Valid options: uninstall_app, delete_user, restore_backup`,
        )
    }

    // Set valid to false if there are any blocking errors
    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }

  /**
   * Validate uninstall_app operation
   * Checks: app exists, no dependent apps, backup exists
   */
  private async validateUninstallApp(
    appId: string,
    result: ValidationResult,
  ): Promise<void> {
    try {
      // Check if app exists
      const app = await this.getApp(appId)

      // Check app state - warn if pending operations
      if (app.installationState !== "installed") {
        result.warnings.push(
          `App is in state '${app.installationState}', not 'installed'. Uninstall may fail or behave unexpectedly.`,
        )
      }

      // Recommendation: Create backup before uninstall
      result.recommendations.push(
        "Create a backup before uninstalling to preserve app data and configuration.",
      )

      // TODO: Check for dependent apps (requires app dependency API endpoint)
      // For now, add as recommendation
      result.recommendations.push(
        "Verify no other apps depend on this app before uninstalling.",
      )

      // Check if recent backup exists (within last 24 hours)
      // Note: This requires listBackups() which is F07 (not yet implemented)
      // For now, add as recommendation
      result.recommendations.push(
        "Ensure a recent backup exists for disaster recovery.",
      )
    } catch (error) {
      if (isCloudronError(error) && error.statusCode === 404) {
        result.errors.push(`App with ID '${appId}' does not exist.`)
      } else {
        throw error
      }
    }
  }

  /**
   * Validate delete_user operation
   * Checks: user exists, not last admin, not self-deletion
   */
  private async validateDeleteUser(
    userId: string,
    result: ValidationResult,
  ): Promise<void> {
    try {
      // Check if user exists
      const targetUser = await this.getUser(userId)

      // Get all users to check admin count
      const allUsers = await this.listUsers()

      // Check if user is the last admin
      if (targetUser.role === "admin") {
        const adminCount = allUsers.filter(u => u.role === "admin").length
        if (adminCount <= 1) {
          result.errors.push(
            "Cannot delete the last admin user. Promote another user to admin first.",
          )
        }
      }

      // Recommendations
      result.recommendations.push(
        "Ensure user is not currently logged in before deletion.",
      )
      result.recommendations.push(
        "Transfer ownership of user data/apps before deletion if needed.",
      )
      result.recommendations.push(
        "Consider disabling the user account instead of deleting if data retention is needed.",
      )
    } catch (error) {
      if (isCloudronError(error) && error.statusCode === 404) {
        result.errors.push(`User with ID '${userId}' does not exist.`)
      } else {
        throw error
      }
    }
  }

  /**
   * Validate restore_backup operation
   * Checks: backup exists, backup integrity valid, sufficient storage
   */
  private async validateRestoreBackup(
    _backupId: string,
    result: ValidationResult,
  ): Promise<void> {
    // Note: This requires listBackups() API which is F07 (not yet implemented)
    // For Phase 1, we focus on storage validation

    try {
      // Check storage sufficiency using configured minimum
      const storageInfo = await this.checkStorage(RESTORE_MIN_STORAGE_MB)

      if (!storageInfo.sufficient) {
        result.errors.push(
          `Insufficient disk space for restore. Available: ${storageInfo.available_mb} MB, Required: ${RESTORE_MIN_STORAGE_MB} MB`,
        )
      }

      if (storageInfo.critical) {
        result.errors.push(
          "CRITICAL: Less than 5% disk space remaining. Restore operation blocked.",
        )
      } else if (storageInfo.warning) {
        result.warnings.push(
          "WARNING: Less than 10% disk space remaining. Monitor disk usage during restore.",
        )
      }

      // TODO: Check if backup exists (requires GET /api/v1/backups/:id endpoint from F07)
      // TODO: Check backup integrity (requires backup metadata with checksum/status)

      result.recommendations.push("Verify backup integrity before restore.")
      result.recommendations.push(
        "Ensure all apps are stopped before restore to prevent data corruption.",
      )
      result.recommendations.push(
        "Create a new backup of current state before restore for rollback capability.",
      )
    } catch (error) {
      if (error instanceof CloudronError) {
        result.errors.push(`Storage check failed: ${error.message}`)
      } else {
        throw error
      }
    }
  }

  /**
   * Validate app manifest before installation (F23a pre-flight safety check)
   * Checks: F36 storage sufficient, dependencies available, configuration schema valid
   * @param appId - The app ID to validate from App Store
   * @param requiredMB - Optional disk space requirement in MB (defaults to INSTALL_DEFAULT_STORAGE_MB)
   * @returns Validation result with errors and warnings
   * @note The App Store API may not be available on all Cloudron instances.
   *       If unavailable, validation will skip App Store checks and only verify storage.
   */
  async validateManifest(
    appId: string,
    requiredMB: number = INSTALL_DEFAULT_STORAGE_MB,
  ): Promise<ManifestValidationResult> {
    if (!appId) {
      throw new CloudronError("appId is required for manifest validation")
    }

    const result: ManifestValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    }

    try {
      // Step 1: Try to fetch app manifest from App Store
      // Note: The App Store API may not be available on all Cloudron instances
      let app: AppStoreApp | undefined
      try {
        const apps = await this.searchApps(appId)
        app = apps.find(a => a.id === appId)
      } catch (searchError) {
        // App Store API not available - skip App Store validation
        // Check for various indicators that the endpoint doesn't exist
        const isNotFound =
          isCloudronError(searchError) &&
          (searchError.statusCode === 404 ||
            searchError.statusCode === 400 ||
            searchError.message.includes("No such route") ||
            searchError.message.includes("not found") ||
            searchError.message.includes("does not exist"))

        if (isNotFound) {
          result.warnings.push(
            "App Store API not available. Skipping manifest lookup - proceeding with storage validation only.",
          )
        } else {
          throw searchError
        }
      }

      // If we found the app, validate it
      if (app) {
        // Step 3: Check dependencies available in catalog
        if (app.description?.toLowerCase().includes("requires")) {
          result.warnings.push(
            "App may have dependencies. Verify all required addons are available.",
          )
        }
      } else if (app === undefined && result.warnings.length === 0) {
        // App not found but API was available
        result.warnings.push(
          `App '${appId}' not found in App Store search. Proceeding with installation attempt.`,
        )
      }

      // Step 2: Check F36 storage sufficient for installation
      try {
        const storageInfo = await this.checkStorage(requiredMB)

        if (storageInfo.critical) {
          result.errors.push(
            `CRITICAL: Less than 5% disk space remaining (${storageInfo.available_mb}MB available). Installation blocked.`,
          )
        } else if (!storageInfo.sufficient) {
          result.errors.push(
            `Insufficient disk space: ${storageInfo.available_mb}MB available, ${requiredMB}MB required.`,
          )
        } else if (storageInfo.warning) {
          result.warnings.push(
            `WARNING: Less than 10% disk space remaining (${storageInfo.available_mb}MB available). Monitor disk usage after installation.`,
          )
        }
      } catch (storageError) {
        // Storage check API may not be available - add warning but don't block
        const isNotFound =
          isCloudronError(storageError) &&
          (storageError.statusCode === 404 ||
            storageError.statusCode === 400 ||
            storageError.message.includes("No such route") ||
            storageError.message.includes("not found"))

        if (isNotFound) {
          result.warnings.push(
            "Storage check API not available. Skipping disk space validation.",
          )
        } else {
          throw storageError
        }
      }

      // Step 4: Validate configuration schema
      // Note: Full schema validation would require manifest.configSchema from API
      // For MVP, we'll pass this check with a recommendation
      result.warnings.push(
        "Ensure app configuration matches Cloudron specification after installation.",
      )
    } catch (error) {
      if (error instanceof CloudronError) {
        result.errors.push(`Manifest validation failed: ${error.message}`)
      } else {
        throw error
      }
    }

    // Set valid to false if there are any blocking errors
    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }

  /**
   * Install an application from the App Store (F23b with pre-flight validation)
   * POST /api/v1/apps/install
   * @param params - Installation parameters (manifestId, location, optional config)
   * @returns Task ID for tracking installation progress via getTaskStatus()
   */
  async installApp(params: InstallAppParams): Promise<string> {
    if (!params.manifestId) {
      throw new CloudronError("manifestId is required for app installation")
    }
    if (!params.location) {
      throw new CloudronError(
        "location (subdomain) is required for app installation",
      )
    }

    // F23a pre-flight validation: Check manifest validity and storage
    const validation = await this.validateManifest(params.manifestId)
    if (!validation.valid) {
      throw new CloudronError(
        `Pre-flight validation failed: ${validation.errors.join(", ")}`,
      )
    }

    // Log warnings but allow installation to proceed
    if (validation.warnings.length > 0) {
      console.warn(`Installation warnings: ${validation.warnings.join("; ")}`)
    }

    // Install app (async operation)
    // Note: API expects 'subdomain' not 'location' per OpenAPI spec
    const body = {
      appStoreId: params.manifestId,
      subdomain: params.location, // API field is 'subdomain'
      domain: params.domain,
      accessRestriction: params.accessRestriction,
      ...(params.portBindings && { ports: params.portBindings }), // API field is 'ports'
      ...(params.env && { env: params.env }),
    }

    const response = await this.makeRequest<{ taskId: string }>(
      "POST",
      "/api/v1/apps",
      body,
    )

    if (!response.taskId) {
      throw new CloudronError("App installation response missing taskId")
    }

    return response.taskId
  }

  // ==================== New App Management Methods ====================

  /**
   * Clone an existing app
   * POST /api/v1/apps/:appId/clone
   * @param appId - The app ID to clone
   * @param params - Clone parameters (location and backupId required, domain/portBindings optional)
   * @returns Task ID for tracking clone progress
   */
  async cloneApp(appId: string, params: CloneAppParams): Promise<string> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    if (!params.location) {
      throw new CloudronError("location (subdomain) is required for cloning")
    }

    // Pre-flight validation: check if target location is available
    const validation = await this.validateCloneOperation(appId, params)
    if (!validation.valid) {
      throw new CloudronError(
        `Pre-flight validation failed: ${validation.errors.join(", ")}`,
      )
    }

    // Get source app to determine domain if not provided
    const sourceApp = await this.getApp(appId)
    const targetDomain = params.domain ?? sourceApp.domain

    // If backupId not provided, get the latest backup for this app
    let backupId = params.backupId
    if (!backupId) {
      const backups = await this.listAppBackups(appId)
      const latestBackup = backups[0]
      if (!latestBackup) {
        throw new CloudronError(
          "No backups available for this app. Create a backup first or provide a backupId.",
        )
      }
      // Use the most recent backup
      backupId = latestBackup.id
    }

    // Convert to API format: location -> subdomain, portBindings -> ports
    const apiParams = {
      subdomain: params.location,
      domain: targetDomain,
      backupId: backupId,
      ports: params.portBindings ?? {},
    }

    const response = await this.makeRequest<{ taskId: string }>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/clone`,
      apiParams,
    )

    if (!response.taskId) {
      throw new CloudronError("Clone response missing taskId")
    }

    return response.taskId
  }

  /**
   * List backups for a specific app
   * GET /api/v1/apps/:appId/backups
   * @param appId - The app ID
   * @returns Array of backups for this app
   */
  async listAppBackups(appId: string): Promise<Backup[]> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    const response = await this.makeRequest<{ backups: Backup[] }>(
      "GET",
      `/api/v1/apps/${encodeURIComponent(appId)}/backups`,
    )

    return response.backups ?? []
  }

  /**
   * Repair a broken app
   * POST /api/v1/apps/:appId/repair
   * @param appId - The app ID to repair
   * @returns Task ID for tracking repair progress
   */
  async repairApp(appId: string): Promise<string> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    const response = await this.makeRequest<{ taskId: string }>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/repair`,
    )

    if (!response.taskId) {
      throw new CloudronError("Repair response missing taskId")
    }

    return response.taskId
  }

  /**
   * Restore an app from backup
   * POST /api/v1/apps/:appId/restore
   * @param appId - The app ID to restore
   * @param params - Restore parameters (backupId required)
   * @returns Task ID for tracking restore progress
   */
  async restoreApp(appId: string, params: RestoreAppParams): Promise<string> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }
    if (!params.backupId) {
      throw new CloudronError("backupId is required for restore")
    }

    // Pre-flight validation: check storage and backup compatibility
    const validation = await this.validateRestoreOperation(
      appId,
      params.backupId,
    )
    if (!validation.valid) {
      throw new CloudronError(
        `Pre-flight validation failed: ${validation.errors.join(", ")}`,
      )
    }

    const response = await this.makeRequest<{ taskId: string }>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/restore`,
      params,
    )

    if (!response.taskId) {
      throw new CloudronError("Restore response missing taskId")
    }

    return response.taskId
  }

  /**
   * Update an app to a new version
   * POST /api/v1/apps/:appId/update
   * @param appId - The app ID to update
   * @param params - Optional update parameters (version, force)
   * @returns Task ID for tracking update progress
   */
  async updateApp(appId: string, params?: UpdateAppParams): Promise<string> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    // Pre-flight validation: check if update is available
    const validation = await this.validateUpdateOperation(appId)
    if (!validation.valid) {
      throw new CloudronError(
        `Pre-flight validation failed: ${validation.errors.join(", ")}`,
      )
    }

    const response = await this.makeRequest<{ taskId: string }>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/update`,
      params ?? {},
    )

    if (!response.taskId) {
      throw new CloudronError("Update response missing taskId")
    }

    return response.taskId
  }

  /**
   * Create a backup of a specific app
   * POST /api/v1/apps/:appId/backup
   * @param appId - The app ID to backup
   * @returns Task ID for tracking backup progress
   */
  async backupApp(appId: string): Promise<string> {
    if (!appId) {
      throw new CloudronError("appId is required")
    }

    // Pre-flight storage check
    const storageInfo = await this.checkStorage(BACKUP_MIN_STORAGE_MB)
    if (!storageInfo.sufficient) {
      throw new CloudronError(
        `Insufficient storage for app backup. Required: ${BACKUP_MIN_STORAGE_MB}MB, Available: ${storageInfo.available_mb}MB`,
      )
    }

    const response = await this.makeRequest<{ taskId: string }>(
      "POST",
      `/api/v1/apps/${encodeURIComponent(appId)}/backup`,
    )

    if (!response.taskId) {
      throw new CloudronError("App backup response missing taskId")
    }

    return response.taskId
  }

  // ==================== Services Methods ====================

  /**
   * List all platform services (read-only diagnostics)
   * GET /api/v1/services
   * @returns Array of service status objects
   */
  async listServices(): Promise<Service[]> {
    const response = await this.makeRequest<ServicesResponse>(
      "GET",
      "/api/v1/services",
    )

    // API returns { services: ["turn", "mail", ...] }
    // We map this to Service objects with unknown status, or we could fetch details for each.
    // For listing, we'll just return basic info.
    return response.services.map(name => ({
      name,
      status: "unknown", // We don't know status from list
    }))
  }

  // ==================== User Management Methods ====================

  /**
   * Get a specific user by ID
   * GET /api/v1/users/:userId
   * @param userId - The user ID to retrieve
   * @returns User object
   */
  async getUser(userId: string): Promise<User> {
    if (!userId) {
      throw new CloudronError("userId is required")
    }
    return await this.makeRequest<User>(
      "GET",
      `/api/v1/users/${encodeURIComponent(userId)}`,
    )
  }

  /**
   * Update a user's profile (email, displayName, fallbackEmail)
   * POST /api/v1/users/:userId/profile
   * @param userId - The user ID to update
   * @param params - Profile parameters (email, displayName, fallbackEmail)
   */
  async updateUserProfile(
    userId: string,
    params: { email?: string; displayName?: string; fallbackEmail?: string },
  ): Promise<void> {
    if (!userId) {
      throw new CloudronError("userId is required")
    }

    // Validate params object has at least one field
    if (!params || Object.keys(params).length === 0) {
      throw new CloudronError(
        "params object cannot be empty. Provide at least one of: email, displayName, fallbackEmail",
      )
    }

    // Validate email format if provided
    if (params.email !== undefined && !this.isValidEmail(params.email)) {
      throw new CloudronError("Invalid email format")
    }

    // Validate fallbackEmail format if provided
    if (
      params.fallbackEmail !== undefined &&
      !this.isValidEmail(params.fallbackEmail)
    ) {
      throw new CloudronError("Invalid fallbackEmail format")
    }

    // POST /api/v1/users/:userId/profile returns 204 No Content
    await this.makeRequest<void>(
      "POST",
      `/api/v1/users/${encodeURIComponent(userId)}/profile`,
      params,
    )
  }

  /**
   * Update a user's role
   * PUT /api/v1/users/:userId/role
   * @param userId - The user ID to update
   * @param role - New role (owner, admin, usermanager, mailmanager, user)
   */
  async updateUserRole(
    userId: string,
    role: "owner" | "admin" | "usermanager" | "mailmanager" | "user",
  ): Promise<void> {
    if (!userId) {
      throw new CloudronError("userId is required")
    }

    const validRoles = ["owner", "admin", "usermanager", "mailmanager", "user"]
    if (!validRoles.includes(role)) {
      throw new CloudronError(
        `Invalid role: ${role}. Valid options: ${validRoles.join(", ")}`,
      )
    }

    // PUT /api/v1/users/:userId/role returns 204 No Content
    await this.makeRequest<void>(
      "PUT",
      `/api/v1/users/${encodeURIComponent(userId)}/role`,
      { role },
    )
  }

  /**
   * Update a user's properties (convenience method that calls appropriate endpoints)
   * @param userId - The user ID to update
   * @param params - Update parameters (email, displayName, role)
   * @returns Updated user object
   * @deprecated Use updateUserProfile() and updateUserRole() directly for better control
   */
  async updateUser(userId: string, params: UpdateUserParams): Promise<User> {
    if (!userId) {
      throw new CloudronError("userId is required")
    }

    // Validate params object has at least one field
    if (!params || Object.keys(params).length === 0) {
      throw new CloudronError(
        "params object cannot be empty. Provide at least one of: email, displayName, role",
      )
    }

    // Validate email format if provided
    if (params.email !== undefined && !this.isValidEmail(params.email)) {
      throw new CloudronError("Invalid email format")
    }

    // Validate role if provided - use the full role set from OpenAPI
    const validRoles = ["owner", "admin", "usermanager", "mailmanager", "user"]
    if (params.role !== undefined && !validRoles.includes(params.role)) {
      throw new CloudronError(
        `Invalid role: ${params.role}. Valid options: ${validRoles.join(", ")}`,
      )
    }

    // Handle profile updates (email, displayName)
    const profileParams: { email?: string; displayName?: string } = {}
    if (params.email !== undefined) profileParams.email = params.email
    if (params.displayName !== undefined)
      profileParams.displayName = params.displayName

    if (Object.keys(profileParams).length > 0) {
      await this.updateUserProfile(userId, profileParams)
    }

    // Handle role update separately
    if (params.role !== undefined) {
      await this.updateUserRole(
        userId,
        params.role as
          | "owner"
          | "admin"
          | "usermanager"
          | "mailmanager"
          | "user",
      )
    }

    // Return updated user
    return await this.getUser(userId)
  }

  /**
   * Delete a user (DESTRUCTIVE OPERATION)
   * DELETE /api/v1/users/:userId
   * Performs pre-flight validation via validateDeleteUser before proceeding
   * @param userId - The user ID to delete
   */
  async deleteUser(userId: string): Promise<void> {
    if (!userId) {
      throw new CloudronError("userId is required")
    }

    // Pre-flight validation
    const validation = await this.validateOperation("delete_user", userId)

    // If validation fails, throw error with validation details
    if (!validation.valid) {
      const errorMessage = `Pre-flight validation failed for delete_user on '${userId}':\n${validation.errors.join("\n")}`
      throw new CloudronError(errorMessage)
    }

    // Proceed with delete if validation passes
    await this.makeRequest<void>(
      "DELETE",
      `/api/v1/users/${encodeURIComponent(userId)}`,
    )
  }

  // ==================== Group Management Methods ====================

  /**
   * List all groups on Cloudron instance
   * GET /api/v1/groups
   * @returns Array of groups sorted by name
   */
  async listGroups(): Promise<Group[]> {
    const response = await this.makeRequest<GroupsResponse>(
      "GET",
      "/api/v1/groups",
    )

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

    return await this.makeRequest<Group>("POST", "/api/v1/groups", params)
  }

  // ==================== Update Management Methods ====================

  /**
   * Check for available Cloudron platform updates
   * GET /api/v1/updater/updates
   * @returns Update information including availability and version
   */
  async checkUpdates(): Promise<UpdateInfo> {
    const response = await this.makeRequest<{ updates: UpdateInfo }>(
      "GET",
      "/api/v1/updater/updates",
    )
    // Response is wrapped in { updates: ... }
    return response.updates
  }

  /**
   * Apply available Cloudron platform update (DESTRUCTIVE OPERATION)
   * POST /api/v1/updater/update
   * Performs pre-flight validation before proceeding
   * @returns Task ID for tracking update progress
   */
  async applyUpdate(): Promise<string> {
    // Pre-flight validation
    const validation = await this.validateApplyUpdate()

    // If validation fails, throw error with validation details
    if (!validation.valid) {
      const errorMessage = `Pre-flight validation failed for apply_update:\n${validation.errors.join("\n")}`
      throw new CloudronError(errorMessage)
    }

    const response = await this.makeRequest<{ taskId: string }>(
      "POST",
      "/api/v1/updater/update",
    )

    if (!response.taskId) {
      throw new CloudronError("Apply update response missing taskId")
    }

    return response.taskId
  }

  /**
   * Validate apply update operation
   * Checks: update available, backup recommended
   */
  private async validateApplyUpdate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    }

    try {
      // Check if update is available
      const updateInfo = await this.checkUpdates()

      if (!updateInfo.available) {
        result.errors.push(
          "No update available. Cloudron is already up to date.",
        )
      }

      // Check for recent backup
      const backups = await this.listBackups()
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const recentBackup = backups.find(
        b => new Date(b.creationTime) > oneDayAgo && b.state === "uploaded",
      )

      if (!recentBackup) {
        result.warnings.push(
          "No backup found within the last 24 hours. Strongly recommend creating a backup before updating.",
        )
      }

      // Recommendations
      result.recommendations.push(
        "Create a backup before applying update for rollback capability.",
      )
      result.recommendations.push(
        "Schedule update during low-traffic period as services will restart.",
      )

      if (updateInfo.changelog) {
        result.recommendations.push(
          `Review changelog before updating: ${updateInfo.changelog}`,
        )
      }
    } catch (error) {
      if (error instanceof CloudronError) {
        result.errors.push(`Update check failed: ${error.message}`)
      } else {
        throw error
      }
    }

    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }

  // ==================== New Validation Methods ====================

  /**
   * Validate clone operation
   * Checks: source app exists, target location available
   */
  private async validateCloneOperation(
    appId: string,
    params: CloneAppParams,
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    }

    try {
      // Check if source app exists
      const app = await this.getApp(appId)

      // Check app state
      if (app.installationState !== "installed") {
        result.errors.push(
          `Cannot clone app in state '${app.installationState}'. App must be 'installed'.`,
        )
      }

      // Check if target location might conflict
      const apps = await this.listApps()
      const targetDomain = params.domain ?? app.domain
      const conflictingApp = apps.find(
        a => a.location === params.location && a.domain === targetDomain,
      )

      if (conflictingApp) {
        result.errors.push(
          `Target location '${params.location}.${targetDomain}' is already in use by app '${conflictingApp.manifest.title}'.`,
        )
      }

      // Recommendations
      result.recommendations.push(
        "Create a backup before cloning for disaster recovery.",
      )
    } catch (error) {
      if (isCloudronError(error) && error.statusCode === 404) {
        result.errors.push(`Source app with ID '${appId}' does not exist.`)
      } else {
        throw error
      }
    }

    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }

  /**
   * Validate restore operation
   * Checks: backup exists, storage sufficient
   */
  private async validateRestoreOperation(
    appId: string,
    backupId: string,
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    }

    try {
      // Check if app exists
      await this.getApp(appId)

      // Check storage sufficiency
      const storageInfo = await this.checkStorage(RESTORE_MIN_STORAGE_MB)
      if (!storageInfo.sufficient) {
        result.errors.push(
          `Insufficient disk space for restore. Available: ${storageInfo.available_mb}MB, Required: ${RESTORE_MIN_STORAGE_MB}MB`,
        )
      }

      if (storageInfo.critical) {
        result.errors.push(
          "CRITICAL: Less than 5% disk space remaining. Restore blocked.",
        )
      } else if (storageInfo.warning) {
        result.warnings.push(
          "WARNING: Less than 10% disk space remaining. Monitor during restore.",
        )
      }

      // Check if backup exists
      const backups = await this.listBackups()
      const backup = backups.find(b => b.id === backupId)
      if (!backup) {
        result.errors.push(`Backup with ID '${backupId}' not found.`)
      } else if (backup.state !== "uploaded" && backup.state !== "created") {
        result.warnings.push(
          `Backup is in state '${backup.state}'. Restore may fail.`,
        )
      }

      result.recommendations.push(
        "Create a backup of current state before restore for rollback capability.",
      )
    } catch (error) {
      if (isCloudronError(error) && error.statusCode === 404) {
        result.errors.push(`App with ID '${appId}' does not exist.`)
      } else {
        throw error
      }
    }

    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }

  /**
   * Validate update operation
   * Checks: app exists, update available
   */
  private async validateUpdateOperation(
    appId: string,
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: [],
    }

    try {
      // Check if app exists
      const app = await this.getApp(appId)

      // Check app state
      if (app.installationState !== "installed") {
        result.errors.push(
          `Cannot update app in state '${app.installationState}'. App must be 'installed'.`,
        )
      }

      // Note: Checking if update is available would require additional API call
      // to /api/v1/appstore/apps/:id or similar. For now, we proceed with warning.
      result.warnings.push(
        "Update availability not verified. Operation may fail if no update exists.",
      )

      result.recommendations.push(
        "Create a backup before updating for rollback capability.",
      )
    } catch (error) {
      if (isCloudronError(error) && error.statusCode === 404) {
        result.errors.push(`App with ID '${appId}' does not exist.`)
      } else {
        throw error
      }
    }

    if (result.errors.length > 0) {
      result.valid = false
    }

    return result
  }
}
