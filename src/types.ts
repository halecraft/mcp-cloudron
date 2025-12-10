/**
 * Cloudron MCP Server Type Definitions
 * Core interfaces for Cloudron API responses and configuration
 */

/**
 * Represents an installed application on Cloudron
 */
export interface App {
  /** Unique application identifier */
  id: string;
  /** User-friendly application name */
  name: string;
  /** Application manifest identifier (e.g., 'nextcloud', 'mastodon') */
  manifest: string;
  /** Subdomain location (e.g., 'nextcloud' in 'nextcloud.example.com') */
  location: string;
  /** Current application status: 'running', 'stopped', 'error', 'installing' */
  status: 'running' | 'stopped' | 'error' | 'installing' | 'unknown';
  /** Memory allocation in MB */
  memory?: number;
  /** CPU shares allocated */
  cpu?: number;
  /** Application creation timestamp in ISO 8601 format */
  createdAt: string;
  /** Last updated timestamp in ISO 8601 format */
  updatedAt?: string;
  /** Additional app-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Represents overall system status and health
 */
export interface SystemStatus {
  /** Cloudron version (e.g., '7.10.1') */
  version: string;
  /** System uptime in seconds */
  uptime: number;
  /** Disk usage in percentage (0-100) */
  diskUsage: number;
  /** Memory usage in percentage (0-100) */
  memoryUsage: number;
  /** Disk available in GB */
  diskAvailable?: number;
  /** Total memory in GB */
  totalMemory?: number;
  /** Number of installed apps */
  appCount?: number;
  /** System health status: 'healthy', 'warning', 'critical' */
  health: 'healthy' | 'warning' | 'critical';
  /** Optional system message or alert */
  message?: string;
}

/**
 * Represents a managed domain
 */
export interface Domain {
  /** Unique domain identifier */
  id: string;
  /** Domain name (e.g., 'example.com') */
  domain: string;
  /** DNS provider: 'route53', 'namecheap', 'cloudflare', 'manual' */
  provider: 'route53' | 'namecheap' | 'cloudflare' | 'manual' | 'unknown';
  /** Current DNS sync status */
  status: 'synced' | 'syncing' | 'error' | 'unknown';
  /** Last sync timestamp in ISO 8601 format */
  lastSync?: string;
  /** Domain creation timestamp in ISO 8601 format */
  createdAt: string;
  /** Optional sync error message */
  syncError?: string;
}

/**
 * Cloudron client configuration
 */
export interface CloudronConfig {
  /** Base URL of the Cloudron instance (e.g., 'https://my.cloudron.io') */
  baseUrl: string;
  /** API token for authentication */
  token: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum number of retry attempts (default: 3) */
  retryAttempts?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
}

/**
 * MCP Tool Input/Output types
 */

export interface ListAppsInput {
  // No required parameters
}

export interface ListAppsOutput {
  apps: App[];
  count: number;
}

export interface GetStatusInput {
  // No required parameters
}

export interface GetStatusOutput {
  status: SystemStatus;
}

export interface RestartAppInput {
  /** Application ID to restart */
  appId: string;
}

export interface RestartAppOutput {
  success: boolean;
  message: string;
}
