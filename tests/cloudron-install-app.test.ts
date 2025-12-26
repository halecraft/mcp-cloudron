/**
 * Test cloudron_install_app tool (F23b)
 * Validates app installation with F23a pre-flight manifest validation and F36 storage check
 */

import { CloudronClient } from '../src/cloudron-client';
import { CloudronError } from '../src/errors';
import {
  mockCloudronStatus,
  createMockFetch,
  setupTestEnv,
  cleanupTestEnv,
} from './helpers/cloudron-mock';

describe('F23b: cloudron_install_app', () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    setupTestEnv();
    originalFetch = global.fetch;
  });

  afterAll(() => {
    cleanupTestEnv();
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Test Anchor: Pre-flight validation (F23a + F36)', () => {
    it('should call F23a validateManifest before installation', async () => {
      // Mock API responses:
      // 1. GET /api/v1/appstore (F23a manifest check)
      // 2. GET /api/v1/cloudron/status (F36 storage check within F23a)
      // 3. POST /api/v1/apps/install (actual installation)
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/appstore?search=io.example.app': {
          ok: true,
          status: 200,
          data: {
            apps: [
              {
                id: 'io.example.app',
                name: 'Example App',
                description: 'Test application',
                version: '1.0.0',
                iconUrl: 'https://example.com/icon.png',
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          },
        },
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: mockCloudronStatus, // Has sufficient storage
        },
        'POST https://my.example.com/api/v1/apps/install': {
          ok: true,
          status: 202,
          data: { taskId: 'task-install-12345' },
        },
      }) as any;

      const client = new CloudronClient();
      const taskId = await client.installApp({
        manifestId: 'io.example.app',
        location: 'myapp',
      });

      expect(taskId).toBe('task-install-12345');
      expect(typeof taskId).toBe('string');
      expect(taskId).toMatch(/^task-/);
    });

    it('should reject installation when F23a validation fails (app not found)', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/appstore?search=io.nonexistent.app': {
          ok: true,
          status: 200,
          data: { apps: [] }, // App not found
        },
      }) as any;

      const client = new CloudronClient();

      await expect(
        client.installApp({
          manifestId: 'io.nonexistent.app',
          location: 'myapp',
        })
      ).rejects.toThrow(CloudronError);
      await expect(
        client.installApp({
          manifestId: 'io.nonexistent.app',
          location: 'myapp',
        })
      ).rejects.toThrow(/Pre-flight validation failed/);
      await expect(
        client.installApp({
          manifestId: 'io.nonexistent.app',
          location: 'myapp',
        })
      ).rejects.toThrow(/App not found in App Store/);
    });

    it('should reject installation when F36 storage check fails', async () => {
      const lowStorageStatus = {
        ...mockCloudronStatus,
        disk: {
          total: 10737418240, // 10GB
          used: 10468982784, // ~9.75GB
          free: 268435456, // 256MB (insufficient - less than 500MB default requirement)
          percent: 97.5,
        },
      };

      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/appstore?search=io.example.app': {
          ok: true,
          status: 200,
          data: {
            apps: [
              {
                id: 'io.example.app',
                name: 'Example App',
                description: 'Test application',
                version: '1.0.0',
                iconUrl: 'https://example.com/icon.png',
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          },
        },
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: lowStorageStatus,
        },
      }) as any;

      const client = new CloudronClient();

      await expect(
        client.installApp({
          manifestId: 'io.example.app',
          location: 'myapp',
        })
      ).rejects.toThrow(CloudronError);
      await expect(
        client.installApp({
          manifestId: 'io.example.app',
          location: 'myapp',
        })
      ).rejects.toThrow(/Pre-flight validation failed/);
      await expect(
        client.installApp({
          manifestId: 'io.example.app',
          location: 'myapp',
        })
      ).rejects.toThrow(/disk space/);
    });

    it('should NOT call installation API when pre-flight validation fails', async () => {
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ apps: [] }), // App not found
        });

      global.fetch = mockFetch as any;

      const client = new CloudronClient();

      await expect(
        client.installApp({
          manifestId: 'io.nonexistent.app',
          location: 'myapp',
        })
      ).rejects.toThrow();

      // Verify only ONE API call made (GET appstore), NOT installation POST
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/appstore'),
        expect.any(Object)
      );
    });
  });

  describe('Test Anchor: Installation parameters', () => {
    it('should install app with required parameters only', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/appstore?search=io.example.app': {
          ok: true,
          status: 200,
          data: {
            apps: [
              {
                id: 'io.example.app',
                name: 'Example App',
                description: 'Test application',
                version: '1.0.0',
                iconUrl: 'https://example.com/icon.png',
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          },
        },
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: mockCloudronStatus,
        },
        'POST https://my.example.com/api/v1/apps/install': {
          ok: true,
          status: 202,
          data: { taskId: 'task-basic-install' },
        },
      }) as any;

      const client = new CloudronClient();
      const taskId = await client.installApp({
        manifestId: 'io.example.app',
        location: 'myapp',
      });

      expect(taskId).toBe('task-basic-install');
    });

    it('should install app with optional parameters (env, portBindings, accessRestriction)', async () => {
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            apps: [
              {
                id: 'io.example.app',
                name: 'Example App',
                description: 'Test application',
                version: '1.0.0',
                iconUrl: 'https://example.com/icon.png',
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockCloudronStatus,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ taskId: 'task-full-config' }),
        });

      global.fetch = mockFetch as any;

      const client = new CloudronClient();
      const taskId = await client.installApp({
        manifestId: 'io.example.app',
        location: 'myapp',
        env: { MY_VAR: 'value123', ANOTHER: 'test' },
        portBindings: { '8080': 8080 },
        accessRestriction: 'admin',
      });

      expect(taskId).toBe('task-full-config');

      // Verify POST body includes optional parameters
      const installCall = mockFetch.mock.calls.find((call) =>
        call[0].includes('/api/v1/apps/install')
      );
      expect(installCall).toBeDefined();

      const requestBody = JSON.parse(installCall![1].body);
      expect(requestBody).toEqual({
        appStoreId: 'io.example.app',
        location: 'myapp',
        env: { MY_VAR: 'value123', ANOTHER: 'test' },
        portBindings: { '8080': 8080 },
        accessRestriction: 'admin',
      });
    });

    it('should throw error when manifestId is missing', async () => {
      const client = new CloudronClient();

      await expect(
        client.installApp({
          manifestId: '',
          location: 'myapp',
        })
      ).rejects.toThrow(CloudronError);
      await expect(
        client.installApp({
          manifestId: '',
          location: 'myapp',
        })
      ).rejects.toThrow(/manifestId is required/);
    });

    it('should throw error when location is missing', async () => {
      const client = new CloudronClient();

      await expect(
        client.installApp({
          manifestId: 'io.example.app',
          location: '',
        })
      ).rejects.toThrow(CloudronError);
      await expect(
        client.installApp({
          manifestId: 'io.example.app',
          location: '',
        })
      ).rejects.toThrow(/location.*is required/);
    });
  });

  describe('Test Anchor: Task ID return (F34 integration)', () => {
    it('should return task ID for F34 tracking', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/appstore?search=io.example.app': {
          ok: true,
          status: 200,
          data: {
            apps: [
              {
                id: 'io.example.app',
                name: 'Example App',
                description: 'Test application',
                version: '1.0.0',
                iconUrl: 'https://example.com/icon.png',
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          },
        },
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: mockCloudronStatus,
        },
        'POST https://my.example.com/api/v1/apps/install': {
          ok: true,
          status: 202,
          data: { taskId: 'task-async-install-001' },
        },
      }) as any;

      const client = new CloudronClient();
      const taskId = await client.installApp({
        manifestId: 'io.example.app',
        location: 'myapp',
      });

      // Task ID format suitable for F34 task_status tracking
      expect(taskId).toMatch(/^task-/);
      expect(taskId.length).toBeGreaterThan(5);
    });

    it('should throw error when installation API returns 202 but missing taskId', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/appstore?search=io.example.app': {
          ok: true,
          status: 200,
          data: {
            apps: [
              {
                id: 'io.example.app',
                name: 'Example App',
                description: 'Test application',
                version: '1.0.0',
                iconUrl: 'https://example.com/icon.png',
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          },
        },
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: mockCloudronStatus,
        },
        'POST https://my.example.com/api/v1/apps/install': {
          ok: true,
          status: 202,
          data: {}, // Missing taskId
        },
      }) as any;

      const client = new CloudronClient();

      await expect(
        client.installApp({
          manifestId: 'io.example.app',
          location: 'myapp',
        })
      ).rejects.toThrow(CloudronError);
      await expect(
        client.installApp({
          manifestId: 'io.example.app',
          location: 'myapp',
        })
      ).rejects.toThrow(/missing taskId/i);
    });
  });

  describe('Test Anchor: Error handling', () => {
    it('should handle installation API authentication error (401)', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/appstore?search=io.example.app': {
          ok: true,
          status: 200,
          data: {
            apps: [
              {
                id: 'io.example.app',
                name: 'Example App',
                description: 'Test application',
                version: '1.0.0',
                iconUrl: 'https://example.com/icon.png',
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          },
        },
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: mockCloudronStatus,
        },
        'POST https://my.example.com/api/v1/apps/install': {
          ok: false,
          status: 401,
          data: { message: 'Invalid token' },
        },
      }) as any;

      const client = new CloudronClient();

      await expect(
        client.installApp({
          manifestId: 'io.example.app',
          location: 'myapp',
        })
      ).rejects.toThrow();
    });

    it('should handle installation API server error (500)', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/appstore?search=io.example.app': {
          ok: true,
          status: 200,
          data: {
            apps: [
              {
                id: 'io.example.app',
                name: 'Example App',
                description: 'Test application',
                version: '1.0.0',
                iconUrl: 'https://example.com/icon.png',
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          },
        },
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: mockCloudronStatus,
        },
        'POST https://my.example.com/api/v1/apps/install': {
          ok: false,
          status: 500,
          data: { message: 'Installation service unavailable' },
        },
      }) as any;

      const client = new CloudronClient();

      await expect(
        client.installApp({
          manifestId: 'io.example.app',
          location: 'myapp',
        })
      ).rejects.toThrow();
    });

    it('should use POST HTTP method and correct endpoint', async () => {
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            apps: [
              {
                id: 'io.example.app',
                name: 'Example App',
                description: 'Test application',
                version: '1.0.0',
                iconUrl: 'https://example.com/icon.png',
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockCloudronStatus,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ taskId: 'task-123' }),
        });

      global.fetch = mockFetch as any;

      const client = new CloudronClient();
      await client.installApp({
        manifestId: 'io.example.app',
        location: 'myapp',
      });

      // Verify POST /api/v1/apps/install called
      expect(mockFetch).toHaveBeenCalledWith(
        'https://my.example.com/api/v1/apps/install',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-12345',
          }),
        })
      );
    });
  });

  describe('Integration: Full installation workflow', () => {
    it('should complete full installation workflow with all checks', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/appstore?search=io.example.app': {
          ok: true,
          status: 200,
          data: {
            apps: [
              {
                id: 'io.example.app',
                name: 'Example App',
                description: 'Test application',
                version: '1.0.0',
                iconUrl: 'https://example.com/icon.png',
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          },
        },
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: mockCloudronStatus,
        },
        'POST https://my.example.com/api/v1/apps/install': {
          ok: true,
          status: 202,
          data: { taskId: 'task-workflow-complete' },
        },
      }) as any;

      const client = new CloudronClient();
      const taskId = await client.installApp({
        manifestId: 'io.example.app',
        location: 'myapp',
        env: { TEST: 'value' },
      });

      // Verify task ID returned
      expect(taskId).toBe('task-workflow-complete');

      // Verify warnings logged (from F23a validation)
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
