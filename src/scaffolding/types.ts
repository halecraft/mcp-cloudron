/**
 * Types for Cloudron Package Scaffolding
 */

/**
 * Supported application types for scaffolding
 */
export type ScaffoldAppType =
  | "nodejs"
  | "php"
  | "python"
  | "java"
  | "go"
  | "static"

/**
 * Available authentication methods
 */
export type AuthMethod = "ldap" | "oidc" | "proxyAuth" | "none"

/**
 * Available Cloudron addons
 */
export type CloudronAddon =
  | "localstorage"
  | "mysql"
  | "postgresql"
  | "mongodb"
  | "redis"
  | "ldap"
  | "oidc"
  | "sendmail"
  | "recvmail"
  | "scheduler"

/**
 * Input parameters for scaffolding a new package
 */
export interface ScaffoldInput {
  /** Application type determines the Dockerfile template */
  appType: ScaffoldAppType
  /** Name of the application (used in manifest) */
  appName: string
  /** Reverse domain ID (e.g., "com.example.myapp") */
  appId?: string | undefined
  /** Initial version (defaults to "1.0.0") */
  version?: string | undefined
  /** HTTP port the app listens on (defaults to 8000) */
  httpPort?: number | undefined
  /** Health check path (defaults to "/") */
  healthCheckPath?: string | undefined
  /** Required addons */
  addons?: CloudronAddon[] | undefined
  /** Authentication method */
  authMethod?: AuthMethod | undefined
  /** App description */
  description?: string | undefined
  /** App website URL */
  website?: string | undefined
  /** Memory limit in bytes (defaults to 256MB) */
  memoryLimit?: number | undefined
}

/**
 * Generated scaffold output
 */
export interface ScaffoldOutput {
  /** CloudronManifest.json content */
  manifest: string
  /** Dockerfile content */
  dockerfile: string
  /** start.sh content */
  startScript: string
  /** test/test.js content */
  testFile: string
  /** Summary of generated files */
  summary: string
}

/**
 * Manifest structure for CloudronManifest.json
 */
export interface CloudronManifest {
  manifestVersion: 2
  id: string
  title: string
  version: string
  description?: string
  tagline?: string
  website?: string
  httpPort: number
  healthCheckPath: string
  addons: Record<string, Record<string, unknown>>
  memoryLimit?: number
  optionalSso?: boolean
  minBoxVersion?: string
}
