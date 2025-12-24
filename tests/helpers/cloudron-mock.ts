/**
 * Mock Cloudron API responses for testing
 */

import { App, CloudronStatus, TaskStatus, ValidationResult } from '../../src/types';

export const mockApps: App[] = [
  {
    id: 'app-1',
    appStoreId: 'io.wordpress.cloudronapp',
    installationState: 'installed',
    runState: 'running',
    health: 'healthy',
    location: 'blog',
    domain: 'example.com',
    fqdn: 'blog.example.com',
    manifest: {
      id: 'io.wordpress.cloudronapp',
      title: 'WordPress',
      author: 'Cloudron',
      description: 'Blog and website platform',
      version: '6.4.2'
    },
    accessRestriction: null,
    creationTime: '2024-01-15T10:00:00Z',
    updateTime: '2024-12-01T14:30:00Z'
  },
  {
    id: 'app-2',
    appStoreId: 'org.nextcloud.cloudronapp',
    installationState: 'installed',
    runState: 'stopped',
    health: 'healthy',
    location: 'files',
    domain: 'example.com',
    fqdn: 'files.example.com',
    manifest: {
      id: 'org.nextcloud.cloudronapp',
      title: 'Nextcloud',
      author: 'Cloudron',
      description: 'File sync and share platform',
      version: '28.0.1'
    },
    accessRestriction: null,
    creationTime: '2024-02-20T12:00:00Z',
    updateTime: '2024-11-15T09:45:00Z'
  },
  {
    id: 'app-3',
    appStoreId: 'com.gitlab.cloudronapp',
    installationState: 'installed',
    runState: 'running',
    health: 'unhealthy',
    location: 'git',
    domain: 'example.com',
    fqdn: 'git.example.com',
    manifest: {
      id: 'com.gitlab.cloudronapp',
      title: 'GitLab',
      author: 'Cloudron',
      description: 'Git repository management',
      version: '16.7.0'
    },
    accessRestriction: null,
    creationTime: '2024-03-10T08:00:00Z',
    updateTime: '2024-12-10T11:20:00Z'
  }
];

export const mockCloudronStatus: CloudronStatus = {
  version: '8.0.2',
  boxVersionsUrl: 'https://cloudron.io/api/v1/boxes/versions',
  apiServerOrigin: 'https://api.example.com',
  webServerOrigin: 'https://example.com',
  fqdn: 'my.example.com',
  isCustomDomain: true,
  memory: {
    total: 16777216,
    used: 8388608,
    free: 8388608,
    percent: 50
  },
  disk: {
    total: 107374182400,
    used: 53687091200,
    free: 53687091200,
    percent: 50
  },
  update: null,
  backup: {
    lastBackupTime: '2024-12-22T02:00:00Z',
    lastBackupId: 'backup-20241222-020000'
  }
};

export const mockTaskStatusPending: TaskStatus = {
  id: 'task-123',
  state: 'pending',
  progress: 0,
  message: 'Task queued'
};

export const mockTaskStatusRunning: TaskStatus = {
  id: 'task-123',
  state: 'running',
  progress: 45,
  message: 'Processing backup...'
};

export const mockTaskStatusSuccess: TaskStatus = {
  id: 'task-123',
  state: 'success',
  progress: 100,
  message: 'Backup completed successfully',
  result: {
    backupId: 'backup-20241223-140000',
    size: 1024000000
  }
};

export const mockTaskStatusError: TaskStatus = {
  id: 'task-123',
  state: 'error',
  progress: 60,
  message: 'Backup failed',
  error: {
    message: 'Insufficient disk space',
    code: 'DISK_FULL'
  }
};

export const mockTaskStatusCancelled: TaskStatus = {
  id: 'task-123',
  state: 'cancelled',
  progress: 45,
  message: 'Task cancelled by user request'
};

/**
 * Create a mock fetch implementation for testing
 */
export function createMockFetch(responses: Record<string, any>) {
  return jest.fn((url: string, options?: any) => {
    const method = options?.method || 'GET';
    const key = `${method} ${url}`;

    if (responses[key]) {
      const response = responses[key];

      if (response.error) {
        return Promise.reject(response.error);
      }

      return Promise.resolve({
        ok: response.ok !== false,
        status: response.status || 200,
        statusText: response.statusText || 'OK',
        json: async () => response.data,
        text: async () => JSON.stringify(response.data)
      });
    }

    // Default 404 response
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Not found' }),
      text: async () => JSON.stringify({ message: 'Not found' })
    });
  });
}

/**
 * Mock environment variables for testing
 */
export const mockEnv = {
  CLOUDRON_BASE_URL: 'https://my.example.com',
  CLOUDRON_API_TOKEN: 'test-token-12345'
};

/**
 * Setup test environment
 */
export function setupTestEnv() {
  process.env.CLOUDRON_BASE_URL = mockEnv.CLOUDRON_BASE_URL;
  process.env.CLOUDRON_API_TOKEN = mockEnv.CLOUDRON_API_TOKEN;
}

/**
 * Cleanup test environment
 */
export function cleanupTestEnv() {
  delete process.env.CLOUDRON_BASE_URL;
  delete process.env.CLOUDRON_API_TOKEN;
}

/**
 * Mock app for validation tests - installed state
 */
export const mockAppInstalled: App = {
  id: 'app-valid',
  appStoreId: 'io.wordpress.cloudronapp',
  installationState: 'installed',
  installationProgress: '',
  runState: 'running',
  health: 'healthy',
  location: 'blog',
  domain: 'example.com',
  fqdn: 'blog.example.com',
  manifest: {
    id: 'io.wordpress.cloudronapp',
    title: 'WordPress',
    author: 'Cloudron',
    description: 'Blog and website platform',
    version: '6.4.2'
  },
  accessRestriction: null,
  portBindings: null,
  iconUrl: null,
  memoryLimit: 268435456,
  creationTime: '2024-01-15T10:00:00Z'
};

/**
 * Mock app for validation tests - pending uninstall state
 */
export const mockAppPendingUninstall: App = {
  ...mockAppInstalled,
  id: 'app-pending',
  installationState: 'pending_uninstall'
};

/**
 * Mock Cloudron status with low disk space (critical - under 5%)
 */
export const mockCloudronStatusCriticalDisk: CloudronStatus = {
  ...mockCloudronStatus,
  disk: {
    total: 107374182400,
    used: 102542024704, // 95.5% used
    free: 4832157696,   // 4.5% free (under critical threshold)
    percent: 95.5
  }
};

/**
 * Mock Cloudron status with very low disk space (insufficient for restore)
 */
export const mockCloudronStatusInsufficientDisk: CloudronStatus = {
  ...mockCloudronStatus,
  disk: {
    total: 107374182400,
    used: 106837319680, // 99.5% used
    free: 536862720,    // 512 MB free (less than 1024 MB required)
    percent: 99.5
  }
};

/**
 * Create a mock success response
 */
export function mockSuccessResponse(data: any, status: number = 200): Response {
  return {
    ok: true,
    status,
    statusText: 'OK',
    headers: new Headers(),
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    body: null,
    bodyUsed: false,
    clone: () => mockSuccessResponse(data, status),
    redirected: false,
    type: 'basic',
    url: '',
  } as Response;
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
    type: 'basic',
    url: '',
  } as Response;
}

/**
 * Create a mock app with custom properties
 */
export function mockApp(overrides: Partial<App> = {}): App {
  return {
    id: 'app-test',
    appStoreId: 'io.test.cloudronapp',
    installationState: 'installed',
    installationProgress: '',
    runState: 'running',
    health: 'healthy',
    location: 'test',
    domain: 'example.com',
    fqdn: 'test.example.com',
    manifest: {
      id: 'io.test.cloudronapp',
      title: 'Test App',
      author: 'Cloudron',
      description: 'Test application',
      version: '1.0.0'
    },
    accessRestriction: null,
    portBindings: null,
    iconUrl: null,
    memoryLimit: 268435456,
    creationTime: '2024-01-01T00:00:00Z',
    ...overrides
  };
}

/**
 * Create a mock system status
 */
export function mockSystemStatus(overrides: Partial<CloudronStatus> = {}): CloudronStatus {
  return {
    ...mockCloudronStatus,
    ...overrides
  };
}
