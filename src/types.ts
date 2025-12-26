/**
 * Cloudron API TypeScript Definitions
 * MVP scope: listApps + getApp endpoints
 */

/**
 * Configuration for CloudronClient - enables DI for testing
 */
export interface CloudronClientConfig {
  baseUrl: string;
  token: string;
}

/**
 * App manifest subset containing metadata
 */
export interface AppManifest {
  id: string;
  version: string;
  title: string;
  description: string;
  tagline?: string;
  website?: string;
  author?: string;
  minBoxVersion?: string; // Minimum Cloudron version required
  memoryLimit?: number; // Memory requirement in MB
  addons?: Record<string, unknown>; // Required addons (dependencies)
}

/**
 * Manifest validation result for F23a
 */
export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * App installation parameters for F23b
 */
export interface InstallAppParams {
  manifestId: string; // App Store app ID to install
  location: string; // Subdomain for the app
  domain: string; // Domain where app will be installed (REQUIRED)
  portBindings?: Record<string, number>; // Optional port configuration
  accessRestriction: string | null; // Access control setting (can be null for no restriction)
  env?: Record<string, string>; // Optional environment variables
}

/**
 * Cloudron App representation
 */
export interface App {
  id: string;
  appStoreId: string;
  installationState: 'pending_install' | 'installed' | 'pending_configure' | 'pending_uninstall' | 'pending_restore' | 'error';
  installationProgress: string;
  runState: 'running' | 'stopped' | 'dead';
  health: 'healthy' | 'unhealthy' | 'unknown';
  location: string;
  domain: string;
  fqdn: string;
  accessRestriction: string | null;
  manifest: AppManifest;
  portBindings: Record<string, number> | null;
  iconUrl: string | null;
  memoryLimit: number;
  creationTime: string;
}

/**
 * API response wrapper for listing apps
 */
export interface AppsResponse {
  apps: App[];
}

/**
 * API response wrapper for single app
 */
export interface AppResponse {
  app: App;
}

/**
 * System status response from /api/v1/cloudron/status
 */
export interface SystemStatus {
  version: string;
  apiServerOrigin: string;
  adminFqdn: string;
  provider: string;
  cloudronName: string;
  isDemo: boolean;
  disk?: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
}

/**
 * Extended Cloudron status with full system information (for testing)
 */
export interface CloudronStatus extends SystemStatus {
  boxVersionsUrl?: string;
  webServerOrigin?: string;
  fqdn?: string;
  isCustomDomain?: boolean;
  memory?: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
  update?: any;
  backup?: {
    lastBackupTime: string;
    lastBackupId: string;
  };
}

/**
 * Storage information for pre-flight disk space checks
 */
export interface StorageInfo {
  available_mb: number;
  total_mb: number;
  used_mb: number;
  sufficient: boolean;
  warning: boolean;
  critical: boolean;
}

/**
 * Task status for async operations
 */
export interface TaskStatus {
  id: string;
  state: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  progress: number; // 0-100
  message: string;
  result?: unknown;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Operation types for pre-flight validation
 */
export type ValidatableOperation = 'uninstall_app' | 'delete_user' | 'restore_backup';

/**
 * Validation result for destructive operations
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Domain configuration from Cloudron domain system
 */
export interface Domain {
  domain: string;
  zoneName: string;
  provider: string;
  config: Record<string, unknown>;
  tlsConfig: {
    provider: string;
    wildcard: boolean;
  };
  wellKnown: null | unknown;
  fallbackCertificate: {
    cert: string;
  };
}

/**
 * Backup metadata from Cloudron backup system
 */
export interface Backup {
  id: string;
  creationTime: string;
  version: string;
  type: 'app' | 'box';
  state: 'creating' | 'created' | 'uploading' | 'uploaded' | 'error';
  size?: number; // Size in bytes
  appCount?: number; // Number of apps in backup
  dependsOn?: string[]; // Backup dependencies
  errorMessage?: string;
}

/**
 * API response wrapper for listing backups
 */
export interface BackupsResponse {
  backups: Backup[];
}

/**
 * App Store search result
 */
export interface AppStoreApp {
  id: string;
  name: string;
  description: string;
  version: string;
  iconUrl: string | null;
  installCount?: number;
  relevanceScore?: number;
}

/**
 * API response wrapper for App Store search
 */
export interface AppStoreResponse {
  apps: AppStoreApp[];
}

/**
 * Cloudron User representation
 */
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: string;
}

/**
 * API response wrapper for listing users
 */
export interface UsersResponse {
  users: User[];
}

/**
 * Log type enum for cloudron_get_logs
 */
export type LogType = 'app' | 'service';

/**
 * Log entry with parsed timestamp and severity
 */
export interface LogEntry {
  timestamp: string;
  severity: string;
  message: string;
}

/**
 * API response wrapper for logs
 */
export interface LogsResponse {
  logs: string[];
}

/**
 * App configuration object for updating app settings
 */
export interface AppConfig {
  env?: Record<string, string>; // Environment variables
  memoryLimit?: number; // Memory limit in MB
  accessRestriction?: string | null; // Access control settings
  [key: string]: unknown; // Allow additional config fields
}

/**
 * API response for app configuration
 */
export interface ConfigureAppResponse {
  app: App;
  restartRequired: boolean; // Whether app needs restart for config to take effect
}

/**
 * Validation result for app manifest (pre-flight safety check for installation)
 */
export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
