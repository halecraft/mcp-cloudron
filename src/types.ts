/**
 * Cloudron API TypeScript Definitions
 * Complete type definitions for apps, users, groups, backups, services, and system management
 */

/**
 * Configuration for CloudronClient - enables DI for testing
 */
export interface CloudronClientConfig {
  baseUrl: string
  token: string
  timeout?: number
  retryAttempts?: number
}

/**
 * App manifest subset containing metadata
 */
export interface AppManifest {
  id: string
  version: string
  title: string
  description: string
  tagline?: string
  website?: string
  author?: string
  minBoxVersion?: string // Minimum Cloudron version required
  memoryLimit?: number // Memory requirement in MB
  addons?: Record<string, unknown> // Required addons (dependencies)
}

/**
 * Manifest validation result for F23a
 */
export interface ManifestValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * App installation parameters for F23b
 */
export interface InstallAppParams {
  manifestId: string // App Store app ID to install
  location: string // Subdomain for the app
  domain: string // Domain where app will be installed (REQUIRED)
  portBindings?: Record<string, number> // Optional port configuration
  accessRestriction: string | null // Access control setting (can be null for no restriction)
  env?: Record<string, string> // Optional environment variables
}

/**
 * Cloudron App representation (normalized)
 * Note: API returns 'subdomain' but we normalize to 'location' for consistency
 */
export interface App {
  id: string
  appStoreId: string
  installationState:
    | "pending_install"
    | "installed"
    | "pending_configure"
    | "pending_uninstall"
    | "pending_restore"
    | "error"
  installationProgress: string
  runState: "running" | "stopped" | "dead"
  health: "healthy" | "unhealthy" | "unknown"
  location: string // Normalized from 'subdomain' in API response
  domain: string
  fqdn: string
  accessRestriction: string | null
  manifest: AppManifest
  portBindings: Record<string, number> | null
  iconUrl: string | null
  memoryLimit: number
  creationTime: string
}

/**
 * Raw App from Cloudron API (before normalization)
 * The API uses 'subdomain' instead of 'location'
 */
export interface AppRaw {
  id: string
  appStoreId: string
  installationState: string
  installationProgress?: string
  runState: string
  health: string
  subdomain: string // API field name
  domain: string
  fqdn: string
  accessRestriction: string | null
  manifest: AppManifest
  ports?: Record<string, number> | null // API uses 'ports' not 'portBindings'
  iconUrl: string | null
  memoryLimit: number
  creationTime?: string
}

/**
 * Raw API response wrapper for listing apps
 */
export interface AppsResponseRaw {
  apps: AppRaw[]
}

/**
 * API response wrapper for listing apps
 */
export interface AppsResponse {
  apps: App[]
}

/**
 * API response wrapper for single app
 */
export interface AppResponse {
  app: App
}

/**
 * System status response from /api/v1/cloudron/status
 */
export interface SystemStatus {
  version: string
  cloudronName?: string // Optional in spec/implementation
}

/**
 * Extended Cloudron status with full system information (for testing)
 */
export interface CloudronStatus extends SystemStatus {
  boxVersionsUrl?: string
  webServerOrigin?: string
  fqdn?: string
  isCustomDomain?: boolean
  memory?: {
    total: number
    used: number
    free: number
    percent: number
  }
  update?: {
    available: boolean
    version?: string
    changelog?: string
  } | null
  backup?: {
    lastBackupTime: string
    lastBackupId: string
  }
}

/**
 * Disk usage response from /api/v1/system/disk_usage
 */
export interface DiskUsageResponse {
  usage: {
    filesystems: Record<
      string,
      {
        available: number
        size: number
        used: number
        mountpoint: string
      }
    >
  }
}

/**
 * Storage information for pre-flight disk space checks
 */
export interface StorageInfo {
  available_mb: number
  total_mb: number
  used_mb: number
  sufficient: boolean
  warning: boolean
  critical: boolean
}

/**
 * Task status for async operations (normalized from API response)
 */
export interface TaskStatus {
  id: string
  state: "pending" | "running" | "success" | "error" | "cancelled"
  progress: number // 0-100
  message: string
  result?: unknown
  error?: {
    message: string
    code?: string
  }
}

/**
 * Raw task status from Cloudron API
 * The API returns boolean flags instead of a state string
 */
export interface TaskStatusRaw {
  id: string
  type?: string
  percent?: number // 0-100
  message?: string
  active?: boolean // If the task is currently running
  pending?: boolean // If the task is scheduled to run
  success?: boolean // If the task succeeded
  error?: {
    message: string
    code?: number | string
  }
  result?: unknown
  creationTime?: string
  ts?: string
}

/**
 * Operation types for pre-flight validation
 */
export type ValidatableOperation =
  | "uninstall_app"
  | "delete_user"
  | "restore_backup"

/**
 * Validation result for destructive operations
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

/**
 * Domain configuration from Cloudron domain system
 */
export interface Domain {
  domain: string
  zoneName: string
  provider: string
  config: Record<string, unknown>
  tlsConfig: {
    provider: string
    wildcard: boolean
  }
  wellKnown: null | unknown
  fallbackCertificate: {
    cert: string
  }
}

/**
 * Backup metadata from Cloudron backup system
 */
export interface Backup {
  id: string
  creationTime: string
  version: string
  type: "app" | "box"
  state: "creating" | "created" | "uploading" | "uploaded" | "error"
  size?: number // Size in bytes
  appCount?: number // Number of apps in backup
  dependsOn?: string[] // Backup dependencies
  errorMessage?: string
}

/**
 * API response wrapper for listing backups
 */
export interface BackupsResponse {
  backups: Backup[]
}

/**
 * App Store search result (normalized)
 */
export interface AppStoreApp {
  id: string
  name: string
  description: string
  version: string
  iconUrl: string | null
  installCount?: number | undefined
  relevanceScore?: number | undefined
}

/**
 * Raw App Store API response item (before normalization)
 * The API may return different field structures depending on version
 */
export interface AppStoreAppRaw {
  id?: string
  name?: string
  title?: string
  description?: string
  version?: string
  iconUrl?: string
  installCount?: number
  relevanceScore?: number
  manifest?: {
    id?: string
    title?: string
    description?: string
    version?: string
    icon?: string
  }
}

/**
 * API response wrapper for App Store search
 */
export interface AppStoreResponse {
  apps: AppStoreApp[]
}

/**
 * Cloudron User representation
 */
export interface User {
  id: string
  email: string
  username: string
  displayName?: string
  role: UserRole
  createdAt: string
}

/**
 * API response wrapper for listing users
 */
export interface UsersResponse {
  users: User[]
}

/**
 * API response for creating a user
 */
export interface CreateUserResponse {
  id: string
}

/**
 * Log type enum for cloudron_get_logs
 */
export type LogType = "app" | "service"

/**
 * Log entry with parsed timestamp and severity
 */
export interface LogEntry {
  timestamp: string
  severity: string
  message: string
}

/**
 * API response wrapper for logs
 */
export interface LogsResponse {
  logs: string[]
}

/**
 * Access restriction configuration for apps
 */
export interface AccessRestriction {
  users?: string[] // Array of user IDs allowed to access
  groups?: string[] // Array of group IDs allowed to access
}

/**
 * App configuration object for updating app settings
 */
export interface AppConfig {
  env?: Record<string, string> // Environment variables
  memoryLimit?: number // Memory limit in bytes
  accessRestriction?: AccessRestriction | null // Access control settings (null = no restriction)
}

/**
 * API response for app configuration
 */
export interface ConfigureAppResponse {
  app: App
  restartRequired: boolean // Whether app needs restart for config to take effect
}

// ==================== New App Management Types ====================

/**
 * Parameters for cloning an app
 */
export interface CloneAppParams {
  location: string // Required: subdomain for the clone
  domain?: string // Optional: target domain (defaults to same)
  portBindings?: Record<string, number> // Optional: port configuration
  backupId?: string // Optional: clone from specific backup state
}

/**
 * Parameters for restoring an app from backup
 */
export interface RestoreAppParams {
  backupId: string // Required: backup to restore from
}

/**
 * Parameters for updating an app
 */
export interface UpdateAppParams {
  manifest?: {
    version?: string // Optional: specific version to update to
  }
  force?: boolean // Optional: force update even if same version
}

// ==================== Services Types ====================

/**
 * Platform service status
 */
export interface Service {
  name: string
  status: "running" | "stopped" | "error" | "unknown"
  memory?: number // Memory usage in bytes
  version?: string
  error?: string
}

/**
 * API response wrapper for listing services
 */
export interface ServicesResponse {
  services: string[]
}

// ==================== User Management Types ====================

/**
 * Valid user roles per Cloudron OpenAPI spec
 */
export type UserRole =
  | "owner"
  | "admin"
  | "usermanager"
  | "mailmanager"
  | "user"

/**
 * Parameters for updating a user's profile
 * POST /api/v1/users/:userId/profile
 */
export interface UpdateUserProfileParams {
  email?: string // Optional: new email
  displayName?: string // Optional: display name
  fallbackEmail?: string // Optional: fallback email for password resets
}

/**
 * Parameters for updating a user (convenience interface)
 * @deprecated Use UpdateUserProfileParams and updateUserRole() separately
 */
export interface UpdateUserParams {
  email?: string // Optional: new email
  displayName?: string // Optional: display name
  role?: UserRole // Optional: new role
}

// ==================== Group Types ====================

/**
 * Cloudron Group representation
 */
export interface Group {
  id: string
  name: string
  createdAt: string
}

/**
 * Parameters for creating a group
 */
export interface CreateGroupParams {
  name: string // Required: group name
}

/**
 * API response wrapper for listing groups
 */
export interface GroupsResponse {
  groups: Group[]
}

// ==================== Update Management Types ====================

/**
 * Update information from Cloudron
 */
export interface UpdateInfo {
  available: boolean
  version?: string // Available version if update exists
  changelog?: string // Changelog for the update
}
