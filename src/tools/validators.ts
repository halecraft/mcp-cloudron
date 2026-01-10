/**
 * Argument validators for MCP tool handlers
 * Provides runtime validation with proper TypeScript types
 */

import { CloudronError } from "../errors.js"
import type { LogType, ValidatableOperation } from "../types.js"

/**
 * Validate that a value is a non-empty string
 */
function assertNonEmptyString(
  value: unknown,
  fieldName: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CloudronError(
      `${fieldName} is required and must be a non-empty string`,
    )
  }
}

/**
 * Validate that a value is a string (can be empty)
 */
function assertString(
  value: unknown,
  fieldName: string,
): asserts value is string {
  if (typeof value !== "string") {
    throw new CloudronError(`${fieldName} must be a string`)
  }
}

/**
 * Validate that a value is a number
 */
function assertNumber(
  value: unknown,
  fieldName: string,
): asserts value is number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new CloudronError(`${fieldName} must be a number`)
  }
}

/**
 * Validate that a value is an object (not null, not array)
 */
function assertObject(
  value: unknown,
  fieldName: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CloudronError(`${fieldName} must be an object`)
  }
}

// ==================== Tool Argument Types ====================

export interface AppIdArgs {
  appId: string
}

export interface TaskIdArgs {
  taskId: string
}

export interface CheckStorageArgs {
  requiredMB?: number
}

export interface ValidateOperationArgs {
  operation: ValidatableOperation
  resourceId: string
}

export interface ControlAppArgs {
  appId: string
  action: "start" | "stop" | "restart"
}

export interface ConfigureAppArgs {
  appId: string
  config: Record<string, unknown>
}

export interface SearchAppsArgs {
  query?: string
}

export interface GetLogsArgs {
  resourceId: string
  type: LogType
  lines?: number
}

export interface CreateUserArgs {
  email: string
  password: string
  role: "admin" | "user" | "guest"
}

export interface InstallAppArgs {
  manifestId: string
  location: string
  domain: string
  portBindings?: Record<string, number>
  accessRestriction: string | null
  env?: Record<string, string>
}

// ==================== New Tool Argument Types ====================

export interface CloneAppArgs {
  appId: string
  location: string
  domain?: string
  portBindings?: Record<string, number>
  backupId?: string
}

export interface RestoreAppArgs {
  appId: string
  backupId: string
}

export interface UpdateAppArgs {
  appId: string
  version?: string
  force?: boolean
}

// ==================== New User/Group/Update Argument Types ====================

export interface UserIdArgs {
  userId: string
}

export interface UpdateUserArgs {
  userId: string
  email?: string
  displayName?: string
  role?: "admin" | "user" | "guest"
  password?: string
}

export interface CreateGroupArgs {
  name: string
}

// ==================== Validators ====================

/**
 * Parse and validate arguments for tools requiring appId
 */
export function parseAppIdArgs(args: unknown): AppIdArgs {
  assertObject(args, "arguments")
  const { appId } = args
  assertNonEmptyString(appId, "appId")
  return { appId }
}

/**
 * Parse and validate arguments for tools requiring taskId
 */
export function parseTaskIdArgs(args: unknown): TaskIdArgs {
  assertObject(args, "arguments")
  const { taskId } = args
  assertNonEmptyString(taskId, "taskId")
  return { taskId }
}

/**
 * Parse and validate arguments for cloudron_check_storage
 */
export function parseCheckStorageArgs(args: unknown): CheckStorageArgs {
  assertObject(args, "arguments")
  const { requiredMB } = args

  if (requiredMB !== undefined) {
    assertNumber(requiredMB, "requiredMB")
    if (requiredMB < 0) {
      throw new CloudronError("requiredMB must be a positive number")
    }
    return { requiredMB }
  }

  return {}
}

/**
 * Parse and validate arguments for cloudron_validate_operation
 */
export function parseValidateOperationArgs(
  args: unknown,
): ValidateOperationArgs {
  assertObject(args, "arguments")
  const { operation, resourceId } = args

  assertNonEmptyString(operation, "operation")
  assertNonEmptyString(resourceId, "resourceId")

  const validOperations: ValidatableOperation[] = [
    "uninstall_app",
    "delete_user",
    "restore_backup",
  ]
  if (!validOperations.includes(operation as ValidatableOperation)) {
    throw new CloudronError(
      `Invalid operation: ${operation}. Valid options: ${validOperations.join(", ")}`,
    )
  }

  return {
    operation: operation as ValidatableOperation,
    resourceId,
  }
}

/**
 * Parse and validate arguments for cloudron_control_app
 */
export function parseControlAppArgs(args: unknown): ControlAppArgs {
  assertObject(args, "arguments")
  const { appId, action } = args

  assertNonEmptyString(appId, "appId")
  assertNonEmptyString(action, "action")

  const validActions = ["start", "stop", "restart"] as const
  if (!validActions.includes(action as (typeof validActions)[number])) {
    throw new CloudronError(
      `Invalid action: ${action}. Valid options: ${validActions.join(", ")}`,
    )
  }

  return {
    appId,
    action: action as "start" | "stop" | "restart",
  }
}

/**
 * Parse and validate arguments for cloudron_configure_app
 */
export function parseConfigureAppArgs(args: unknown): ConfigureAppArgs {
  assertObject(args, "arguments")
  const { appId, config } = args

  assertNonEmptyString(appId, "appId")
  assertObject(config, "config")

  if (Object.keys(config).length === 0) {
    throw new CloudronError(
      "config object cannot be empty. Provide at least one of: env, memoryLimit, accessRestriction",
    )
  }

  return { appId, config }
}

/**
 * Parse and validate arguments for cloudron_search_apps
 */
export function parseSearchAppsArgs(args: unknown): SearchAppsArgs {
  assertObject(args, "arguments")
  const { query } = args

  if (query !== undefined) {
    assertString(query, "query")
    return { query }
  }

  return {}
}

/**
 * Parse and validate arguments for cloudron_get_logs
 */
export function parseGetLogsArgs(args: unknown): GetLogsArgs {
  assertObject(args, "arguments")
  const { resourceId, type, lines } = args

  assertNonEmptyString(resourceId, "resourceId")
  assertNonEmptyString(type, "type")

  const validTypes: LogType[] = ["app", "service"]
  if (!validTypes.includes(type as LogType)) {
    throw new CloudronError(
      `Invalid type: ${type}. Valid options: ${validTypes.join(", ")}`,
    )
  }

  const result: GetLogsArgs = {
    resourceId,
    type: type as LogType,
  }

  if (lines !== undefined) {
    assertNumber(lines, "lines")
    if (lines < 1 || lines > 1000) {
      throw new CloudronError("lines must be between 1 and 1000")
    }
    result.lines = lines
  }

  return result
}

/**
 * Parse and validate arguments for cloudron_create_user
 */
export function parseCreateUserArgs(args: unknown): CreateUserArgs {
  assertObject(args, "arguments")
  const { email, password, role } = args

  assertNonEmptyString(email, "email")
  assertNonEmptyString(password, "password")
  assertNonEmptyString(role, "role")

  const validRoles = ["admin", "user", "guest"] as const
  if (!validRoles.includes(role as (typeof validRoles)[number])) {
    throw new CloudronError(
      `Invalid role: ${role}. Valid options: ${validRoles.join(", ")}`,
    )
  }

  return {
    email,
    password,
    role: role as "admin" | "user" | "guest",
  }
}

/**
 * Parse and validate arguments for cloudron_install_app
 */
export function parseInstallAppArgs(args: unknown): InstallAppArgs {
  assertObject(args, "arguments")
  const { manifestId, location, domain, portBindings, accessRestriction, env } =
    args

  assertNonEmptyString(manifestId, "manifestId")
  assertNonEmptyString(location, "location")
  assertNonEmptyString(domain, "domain")

  // accessRestriction can be string or null
  if (accessRestriction !== null && accessRestriction !== undefined) {
    assertString(accessRestriction, "accessRestriction")
  }

  // Optional portBindings must be an object if provided
  if (portBindings !== undefined) {
    assertObject(portBindings, "portBindings")
  }

  // Optional env must be an object if provided
  if (env !== undefined) {
    assertObject(env, "env")
  }

  const result: InstallAppArgs = {
    manifestId,
    location,
    domain,
    accessRestriction:
      accessRestriction === undefined
        ? null
        : (accessRestriction as string | null),
  }

  if (portBindings !== undefined) {
    result.portBindings = portBindings as Record<string, number>
  }

  if (env !== undefined) {
    result.env = env as Record<string, string>
  }

  return result
}

// ==================== New Validators ====================

/**
 * Parse and validate arguments for cloudron_clone_app
 */
export function parseCloneAppArgs(args: unknown): CloneAppArgs {
  assertObject(args, "arguments")
  const { appId, location, domain, portBindings, backupId } = args

  assertNonEmptyString(appId, "appId")
  assertNonEmptyString(location, "location")

  const result: CloneAppArgs = { appId, location }

  if (domain !== undefined) {
    assertNonEmptyString(domain, "domain")
    result.domain = domain
  }

  if (portBindings !== undefined) {
    assertObject(portBindings, "portBindings")
    result.portBindings = portBindings as Record<string, number>
  }

  if (backupId !== undefined) {
    assertNonEmptyString(backupId, "backupId")
    result.backupId = backupId
  }

  return result
}

/**
 * Parse and validate arguments for cloudron_restore_app
 */
export function parseRestoreAppArgs(args: unknown): RestoreAppArgs {
  assertObject(args, "arguments")
  const { appId, backupId } = args

  assertNonEmptyString(appId, "appId")
  assertNonEmptyString(backupId, "backupId")

  return { appId, backupId }
}

/**
 * Parse and validate arguments for cloudron_update_app
 */
export function parseUpdateAppArgs(args: unknown): UpdateAppArgs {
  assertObject(args, "arguments")
  const { appId, version, force } = args

  assertNonEmptyString(appId, "appId")

  const result: UpdateAppArgs = { appId }

  if (version !== undefined) {
    assertNonEmptyString(version, "version")
    result.version = version
  }

  if (force !== undefined) {
    if (typeof force !== "boolean") {
      throw new CloudronError("force must be a boolean")
    }
    result.force = force
  }

  return result
}

// ==================== New User/Group/Update Validators ====================

/**
 * Parse and validate arguments for cloudron_get_user
 */
export function parseGetUserArgs(args: unknown): UserIdArgs {
  assertObject(args, "arguments")
  const { userId } = args
  assertNonEmptyString(userId, "userId")
  return { userId }
}

/**
 * Parse and validate arguments for cloudron_update_user
 */
export function parseUpdateUserArgs(args: unknown): UpdateUserArgs {
  assertObject(args, "arguments")
  const { userId, email, displayName, role, password } = args

  assertNonEmptyString(userId, "userId")

  const result: UpdateUserArgs = { userId }

  // At least one update field must be provided
  const hasUpdateField =
    email !== undefined ||
    displayName !== undefined ||
    role !== undefined ||
    password !== undefined

  if (!hasUpdateField) {
    throw new CloudronError(
      "At least one update field must be provided: email, displayName, role, or password",
    )
  }

  if (email !== undefined) {
    assertNonEmptyString(email, "email")
    result.email = email
  }

  if (displayName !== undefined) {
    assertString(displayName, "displayName")
    result.displayName = displayName
  }

  if (role !== undefined) {
    assertNonEmptyString(role, "role")
    const validRoles = ["admin", "user", "guest"] as const
    if (!validRoles.includes(role as (typeof validRoles)[number])) {
      throw new CloudronError(
        `Invalid role: ${role}. Valid options: ${validRoles.join(", ")}`,
      )
    }
    result.role = role as "admin" | "user" | "guest"
  }

  if (password !== undefined) {
    assertNonEmptyString(password, "password")
    result.password = password
  }

  return result
}

/**
 * Parse and validate arguments for cloudron_delete_user
 */
export function parseDeleteUserArgs(args: unknown): UserIdArgs {
  assertObject(args, "arguments")
  const { userId } = args
  assertNonEmptyString(userId, "userId")
  return { userId }
}

/**
 * Parse and validate arguments for cloudron_create_group
 */
export function parseCreateGroupArgs(args: unknown): CreateGroupArgs {
  assertObject(args, "arguments")
  const { name } = args
  assertNonEmptyString(name, "name")
  return { name }
}
