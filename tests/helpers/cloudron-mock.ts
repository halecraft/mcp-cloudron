/**
 * Mock Cloudron API responses for testing
 */

import { vi } from "vitest"
import {
  AppStoreApi,
  AppsApi,
  BackupsApi,
  type CloudronContext,
  GroupsApi,
  HttpClient,
  LogsApi,
  SystemApi,
  TasksApi,
  UpdatesApi,
  UsersApi,
} from "../../src/client/index"
import type {
  App,
  Backup,
  CloudronStatus,
  DiskUsageResponse,
  Group,
  Service,
  TaskStatus,
  UpdateInfo,
  User,
} from "../../src/types"
import { ValidationService } from "../../src/validation/index"

export const mockApps: App[] = [
  {
    id: "app-1",
    appStoreId: "io.wordpress.cloudronapp",
    installationState: "installed",
    installationProgress: "",
    runState: "running",
    health: "healthy",
    location: "blog",
    domain: "example.com",
    fqdn: "blog.example.com",
    manifest: {
      id: "io.wordpress.cloudronapp",
      title: "WordPress",
      author: "Cloudron",
      description: "Blog and website platform",
      version: "6.4.2",
    },
    accessRestriction: null,
    portBindings: null,
    iconUrl: null,
    memoryLimit: 256 * 1024 * 1024,
    creationTime: "2024-01-15T10:00:00Z",
  },
  {
    id: "app-2",
    appStoreId: "org.nextcloud.cloudronapp",
    installationState: "installed",
    installationProgress: "",
    runState: "stopped",
    health: "healthy",
    location: "files",
    domain: "example.com",
    fqdn: "files.example.com",
    manifest: {
      id: "org.nextcloud.cloudronapp",
      title: "Nextcloud",
      author: "Cloudron",
      description: "File sync and share platform",
      version: "28.0.1",
    },
    accessRestriction: null,
    portBindings: null,
    iconUrl: null,
    memoryLimit: 512 * 1024 * 1024,
    creationTime: "2024-02-20T12:00:00Z",
  },
  {
    id: "app-3",
    appStoreId: "com.gitlab.cloudronapp",
    installationState: "installed",
    installationProgress: "",
    runState: "running",
    health: "unhealthy",
    location: "git",
    domain: "example.com",
    fqdn: "git.example.com",
    manifest: {
      id: "com.gitlab.cloudronapp",
      title: "GitLab",
      author: "Cloudron",
      description: "Git repository management",
      version: "16.7.0",
    },
    accessRestriction: null,
    portBindings: null,
    iconUrl: null,
    memoryLimit: 1024 * 1024 * 1024,
    creationTime: "2024-03-10T08:00:00Z",
  },
]

export const mockCloudronStatus: CloudronStatus = {
  version: "8.0.2",
  boxVersionsUrl: "https://cloudron.io/api/v1/boxes/versions",
  webServerOrigin: "https://example.com",
  fqdn: "my.example.com",
  cloudronName: "My Cloudron",
  isCustomDomain: true,
  memory: {
    total: 16777216,
    used: 8388608,
    free: 8388608,
    percent: 50,
  },
  update: null,
  backup: {
    lastBackupTime: "2024-12-22T02:00:00Z",
    lastBackupId: "backup-20241222-020000",
  },
}

export const mockDiskUsage: DiskUsageResponse = {
  usage: {
    filesystems: {
      "/dev/root": {
        available: 53687091200, // 50GB
        size: 107374182400, // 100GB
        used: 53687091200, // 50GB
        mountpoint: "/",
      },
    },
  },
}

export const mockTaskStatusPending: TaskStatus = {
  id: "task-123",
  state: "pending",
  progress: 0,
  message: "Task queued",
}

export const mockTaskStatusRunning: TaskStatus = {
  id: "task-123",
  state: "running",
  progress: 45,
  message: "Processing backup...",
}

export const mockTaskStatusSuccess: TaskStatus = {
  id: "task-123",
  state: "success",
  progress: 100,
  message: "Backup completed successfully",
  result: {
    backupId: "backup-20241223-140000",
    size: 1024000000,
  },
}

export const mockTaskStatusError: TaskStatus = {
  id: "task-123",
  state: "error",
  progress: 60,
  message: "Backup failed",
  error: {
    message: "Insufficient disk space",
    code: "DISK_FULL",
  },
}

export const mockTaskStatusCancelled: TaskStatus = {
  id: "task-123",
  state: "cancelled",
  progress: 45,
  message: "Task cancelled by user request",
}

export const mockBackups: Backup[] = [
  {
    id: "backup-1",
    creationTime: "2024-12-22T02:00:00Z",
    version: "8.0.2",
    type: "box",
    state: "uploaded",
    size: 5368709120, // 5GB
    appCount: 3,
  },
  {
    id: "backup-2",
    creationTime: "2024-12-21T02:00:00Z",
    version: "8.0.2",
    type: "box",
    state: "uploaded",
    size: 5100000000,
    appCount: 3,
  },
  {
    id: "backup-3",
    creationTime: "2024-12-20T02:00:00Z",
    version: "8.0.1",
    type: "app",
    state: "created",
    size: 1073741824, // 1GB
    appCount: 1,
  },
]

export const mockServices: Service[] = [
  {
    name: "mysql",
    status: "unknown",
    version: "8.0.35",
    memory: 536870912, // 512MB
  },
  {
    name: "postgresql",
    status: "unknown",
    version: "15.4",
    memory: 268435456, // 256MB
  },
  {
    name: "mongodb",
    status: "unknown",
    version: "6.0.12",
  },
  {
    name: "mail",
    status: "unknown",
    version: "1.0.0",
    memory: 134217728, // 128MB
  },
  {
    name: "redis",
    status: "unknown",
    version: "7.2.3",
    error: "Connection refused",
  },
]

export const mockServiceNames = ["mysql", "postgresql", "mongodb", "mail", "redis"]

/**
 * Mock response configuration
 */
export interface MockResponseConfig {
  ok?: boolean
  status?: number
  statusText?: string
  data?: unknown
  error?: Error
}

/**
 * Mock fetch options
 */
export interface MockFetchOptions {
  method?: string
  body?: string
  headers?: Record<string, string>
}

/**
 * Create a mock fetch implementation for testing
 */
export function createMockFetch(
  responses: Record<string, MockResponseConfig>,
): typeof fetch {
  return vi.fn((url: string | URL | Request, options?: MockFetchOptions) => {
    const urlString = typeof url === "string" ? url : url.toString()
    const method = options?.method || "GET"
    const key = `${method} ${urlString}`

    const response = responses[key]
    if (response) {
      if (response.error) {
        return Promise.reject(response.error)
      }

      return Promise.resolve({
        ok: response.ok !== false,
        status: response.status || 200,
        statusText: response.statusText || "OK",
        json: async () => response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      } as Response)
    }

    // Default 404 response
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ message: "Not found" }),
      text: async () => JSON.stringify({ message: "Not found" }),
    } as Response)
  }) as unknown as typeof fetch
}

/**
 * Mock environment variables for testing
 */
export const mockEnv = {
  CLOUDRON_BASE_URL: "https://my.example.com",
  CLOUDRON_API_TOKEN: "test-token-12345",
}

/**
 * Setup test environment
 */
export function setupTestEnv() {
  process.env.CLOUDRON_BASE_URL = mockEnv.CLOUDRON_BASE_URL
  process.env.CLOUDRON_API_TOKEN = mockEnv.CLOUDRON_API_TOKEN
}

/**
 * Cleanup test environment
 */
export function cleanupTestEnv() {
  delete process.env.CLOUDRON_BASE_URL
  delete process.env.CLOUDRON_API_TOKEN
}

/**
 * Mock app for validation tests - installed state
 */
export const mockAppInstalled: App = {
  id: "app-valid",
  appStoreId: "io.wordpress.cloudronapp",
  installationState: "installed",
  installationProgress: "",
  runState: "running",
  health: "healthy",
  location: "blog",
  domain: "example.com",
  fqdn: "blog.example.com",
  manifest: {
    id: "io.wordpress.cloudronapp",
    title: "WordPress",
    author: "Cloudron",
    description: "Blog and website platform",
    version: "6.4.2",
  },
  accessRestriction: null,
  portBindings: null,
  iconUrl: null,
  memoryLimit: 268435456,
  creationTime: "2024-01-15T10:00:00Z",
}

/**
 * Mock app for validation tests - pending uninstall state
 */
export const mockAppPendingUninstall: App = {
  ...mockAppInstalled,
  id: "app-pending",
  installationState: "pending_uninstall",
}

/**
 * Mock Cloudron status with low disk space (critical - under 5%)
 */
export const mockCloudronStatusCriticalDisk: CloudronStatus = {
  ...mockCloudronStatus,
  // disk property removed as it's not in status anymore
}

export const mockDiskUsageCritical: DiskUsageResponse = {
  usage: {
    filesystems: {
      "/dev/root": {
        available: 4832157696, // 4.5GB (approx 4.5% of 100GB)
        size: 107374182400, // 100GB
        used: 102542024704,
        mountpoint: "/",
      },
    },
  },
}

/**
 * Mock Cloudron status with very low disk space (insufficient for restore)
 */
export const mockCloudronStatusInsufficientDisk: CloudronStatus = {
  ...mockCloudronStatus,
}

export const mockDiskUsageInsufficient: DiskUsageResponse = {
  usage: {
    filesystems: {
      "/dev/root": {
        available: 536862720, // 512MB
        size: 107374182400, // 100GB
        used: 106837319680,
        mountpoint: "/",
      },
    },
  },
}

/**
 * Create a mock success response
 */
export function mockSuccessResponse(data: unknown, status = 200): Response {
  return {
    ok: true,
    status,
    statusText: "OK",
    headers: new Headers(),
    json: async () => data,
    text: async () => typeof data === 'string' ? data : JSON.stringify(data),
    blob: async () => new Blob([typeof data === 'string' ? data : JSON.stringify(data)]),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    body: null,
    bodyUsed: false,
    clone: () => mockSuccessResponse(data, status),
    redirected: false,
    type: "basic",
    url: "",
  } as Response
}

/**
 * Create a mock error response
 */
export function mockErrorResponse(status: number, message: string): Response {
  return {
    ok: false,
    status,
    statusText: message,
    headers: new Headers(),
    json: async () => ({ message }),
    text: async () => JSON.stringify({ message }),
    blob: async () => new Blob([JSON.stringify({ message })]),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    body: null,
    bodyUsed: false,
    clone: () => mockErrorResponse(status, message),
    redirected: false,
    type: "basic",
    url: "",
  } as Response
}

/**
 * Create a mock app with custom properties
 */
export function mockApp(overrides: Partial<App> = {}): App {
  return {
    id: "app-test",
    appStoreId: "io.test.cloudronapp",
    installationState: "installed",
    installationProgress: "",
    runState: "running",
    health: "healthy",
    location: "test",
    domain: "example.com",
    fqdn: "test.example.com",
    manifest: {
      id: "io.test.cloudronapp",
      title: "Test App",
      author: "Cloudron",
      description: "Test application",
      version: "1.0.0",
    },
    accessRestriction: null,
    portBindings: null,
    iconUrl: null,
    memoryLimit: 268435456,
    creationTime: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

/**
 * Create a mock system status
 */
export function mockSystemStatus(
  overrides: Partial<CloudronStatus> = {},
): CloudronStatus {
  return {
    ...mockCloudronStatus,
    ...overrides,
  }
}

// ==================== User Mock Data ====================

export const mockUsers: User[] = [
  {
    id: "user-admin-1",
    email: "admin@example.com",
    username: "admin",
    role: "admin",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "user-admin-2",
    email: "admin2@example.com",
    username: "admin2",
    role: "admin",
    createdAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "user-regular-1",
    email: "user@example.com",
    username: "regularuser",
    role: "user",
    createdAt: "2024-01-03T00:00:00Z",
  },
  {
    id: "user-guest-1",
    email: "guest@example.com",
    username: "guestuser",
    role: "guest",
    createdAt: "2024-01-04T00:00:00Z",
  },
]

export const mockUserSingleAdmin: User = {
  id: "user-last-admin",
  email: "lastadmin@example.com",
  username: "lastadmin",
  role: "admin",
  createdAt: "2024-01-01T00:00:00Z",
}

/**
 * Create a mock user with custom properties
 */
export function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-test",
    email: "test@example.com",
    username: "testuser",
    role: "user",
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

// ==================== Group Mock Data ====================

export const mockGroups: Group[] = [
  {
    id: "group-1",
    name: "Administrators",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "group-2",
    name: "Developers",
    createdAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "group-3",
    name: "Users",
    createdAt: "2024-01-03T00:00:00Z",
  },
]

/**
 * Create a mock group with custom properties
 */
export function mockGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "group-test",
    name: "Test Group",
    createdAt: "2024-01-01T00:00:00Z",
    ...overrides,
  }
}

// ==================== Update Mock Data ====================

export const mockUpdateAvailable: UpdateInfo = {
  available: true,
  version: "8.1.0",
  changelog: "https://cloudron.io/changelog/8.1.0",
}

export const mockUpdateNotAvailable: UpdateInfo = {
  available: false,
}

/**
 * Create a mock update info with custom properties
 */
export function mockUpdateInfo(
  overrides: Partial<UpdateInfo> = {},
): UpdateInfo {
  return {
    available: false,
    ...overrides,
  }
}

// ==================== Test Context ====================

/**
 * Create a CloudronContext for testing
 * Must be called after setupTestEnv() and after setting up mock fetch
 */
export function createTestContext(): CloudronContext {
  const http = HttpClient.fromEnv()
  const system = new SystemApi(http)
  const appstore = new AppStoreApi(http)
  const backups = new BackupsApi(http, system)
  const groups = new GroupsApi(http)
  const logs = new LogsApi(http)
  const tasks = new TasksApi(http)
  const usersBasic = new UsersApi(http)
  const updatesBasic = new UpdatesApi(http)
  const appsBasic = new AppsApi(http, system)

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
