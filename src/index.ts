/**
 * Cloudron MCP Client
 * Full API client with MCP server integration
 */

// New modular client
export {
  AppStoreApi,
  AppsApi,
  BackupsApi,
  type CloudronContext,
  createCloudronContext,
  GroupsApi,
  HttpClient,
  type HttpClientConfig,
  LogsApi,
  SystemApi,
  TasksApi,
  UpdatesApi,
  UsersApi,
} from "./client/index.js"
// Legacy client (deprecated - use client modules instead)
export { CloudronClient } from "./cloudron-client.js"
// Errors
export {
  CloudronAuthError,
  CloudronError,
  createErrorFromStatus,
  isCloudronError,
} from "./errors.js"
// Types
export type {
  App,
  AppConfig,
  AppManifest,
  AppResponse,
  AppStoreApp,
  AppStoreResponse,
  AppsResponse,
  Backup,
  BackupsResponse,
  CloneAppParams,
  CloudronClientConfig,
  ConfigureAppResponse,
  CreateGroupParams,
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
  UpdateAppParams,
  UpdateInfo,
  UpdateUserParams,
  User,
  UsersResponse,
  ValidatableOperation,
  ValidationResult,
} from "./types.js"
// Validation
export {
  isNonEmpty,
  isPositiveNumber,
  isValidEmail,
  isValidPassword,
  isValidRole,
  type ValidationDataProvider,
  ValidationService,
} from "./validation/index.js"
