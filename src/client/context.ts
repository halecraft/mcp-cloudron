/**
 * Cloudron Context
 * Container for all API modules, replacing the monolithic CloudronClient
 */

import { ValidationService } from "../validation/validation-service.js"
import { AppsApi } from "./apps-api.js"
import { AppStoreApi } from "./appstore-api.js"
import { BackupsApi } from "./backups-api.js"
import { GroupsApi } from "./groups-api.js"
import { HttpClient } from "./http-client.js"
import { LogsApi } from "./logs-api.js"
import { SystemApi } from "./system-api.js"
import { TasksApi } from "./tasks-api.js"
import { UpdatesApi } from "./updates-api.js"
import { UsersApi } from "./users-api.js"

/**
 * Context containing all Cloudron API modules
 * Passed to tool handlers instead of monolithic client
 */
export interface CloudronContext {
  http: HttpClient
  apps: AppsApi
  appstore: AppStoreApi
  backups: BackupsApi
  groups: GroupsApi
  logs: LogsApi
  system: SystemApi
  tasks: TasksApi
  updates: UpdatesApi
  users: UsersApi
  validation: ValidationService
}

/**
 * Create a CloudronContext from environment variables
 * Wires up all dependencies between modules
 */
export function createCloudronContext(): CloudronContext {
  // Create HTTP client from environment
  const http = HttpClient.fromEnv()

  // Create system API first (needed by others for storage checks)
  const system = new SystemApi(http)

  // Create basic APIs without validation first
  const appstore = new AppStoreApi(http)
  const groups = new GroupsApi(http)
  const logs = new LogsApi(http)
  const tasks = new TasksApi(http)

  // Create APIs that need storage checker
  const backups = new BackupsApi(http, system)

  // Create basic users API (without validation for data provider)
  const usersBasic = new UsersApi(http)

  // Create basic apps API (without validation for data provider)
  const appsBasic = new AppsApi(http, system)

  // Create basic updates API (without validation for data provider)
  const updatesBasic = new UpdatesApi(http)

  // Create validation service with data provider
  const validationDataProvider = {
    getApp: (appId: string) => appsBasic.getApp(appId),
    listApps: () => appsBasic.listApps(),
    getUser: (userId: string) => usersBasic.getUser(userId),
    listUsers: () => usersBasic.listUsers(),
    getStatus: () => system.getStatus(),
    getDiskUsage: () => system.getDiskUsage(),
    listBackups: () => backups.listBackups(),
    checkUpdates: () => updatesBasic.checkUpdates(),
    searchApps: (query?: string) => appstore.searchApps(query),
  }

  const validation = new ValidationService(validationDataProvider)

  // Create full APIs with validation
  const apps = new AppsApi(http, system, validation)
  const updates = new UpdatesApi(http, validation)
  const users = new UsersApi(http, validation)

  return {
    http,
    apps,
    appstore,
    backups,
    groups,
    logs,
    system,
    tasks,
    updates,
    users,
    validation,
  }
}
