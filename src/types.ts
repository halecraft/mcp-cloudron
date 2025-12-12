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
}
