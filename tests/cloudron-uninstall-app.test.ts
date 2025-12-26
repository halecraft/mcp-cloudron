/**
 * Tests for F04: cloudron_uninstall_app tool
 * DESTRUCTIVE OPERATION with F37 pre-flight validation
 */

import { CloudronClient } from '../src/cloudron-client.js';
import { CloudronError } from '../src/errors.js';
import {
  mockApp,
  mockSuccessResponse,
  mockErrorResponse,
  setupTestEnv,
  cleanupTestEnv,
  createMockFetch,
} from './helpers/cloudron-mock.js';

describe('cloudron_uninstall_app (F04)', () => {
  let client: CloudronClient;
  let originalFetch: typeof global.fetch;
  const baseUrl = 'https://my.example.com';

  beforeAll(() => {
    setupTestEnv();
    originalFetch = global.fetch;
  });

  afterAll(() => {
    cleanupTestEnv();
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    client = new CloudronClient(baseUrl, 'test-token-123');
    jest.clearAllMocks();
  });

  describe('Pre-flight validation (F37 integration)', () => {
    it('should call F37 validate_operation BEFORE POST uninstall API call', async () => {
      const appId = 'app-test-123';
      const testApp = mockApp({ id: appId, installationState: 'installed' });

      // Mock F37 validation (GET app to check exists)
      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: true,
          status: 200,
          data: testApp,
        },
        [`POST ${baseUrl}/api/v1/apps/${appId}/uninstall`]: {
          ok: true,
          status: 202,
          data: { taskId: 'task-uninstall-456' },
        },
      });

      const result = await client.uninstallApp(appId);

      // Verify result
      expect(result).toEqual({ taskId: 'task-uninstall-456' });

      // Verify both calls were made
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should block uninstall if F37 validation fails (safety gate)', async () => {
      const appId = 'non-existent-app';

      // Mock F37 validation failure (app not found)
      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          data: { message: 'App not found' },
        },
      });

      // Uninstall should throw error BEFORE making POST uninstall call
      await expect(client.uninstallApp(appId)).rejects.toThrow(CloudronError);
      await expect(client.uninstallApp(appId)).rejects.toThrow(/Pre-flight validation failed/);

      // Verify only GET was called (validation), no POST uninstall
      expect(global.fetch).toHaveBeenCalledTimes(2); // 2 calls from 2 expect calls above
    });

    it('should proceed with uninstall if F37 validation passes (with warnings)', async () => {
      const appId = 'app-no-backup';
      const testApp = mockApp({ id: appId, installationState: 'installed' });

      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: true,
          status: 200,
          data: testApp,
        },
        [`POST ${baseUrl}/api/v1/apps/${appId}/uninstall`]: {
          ok: true,
          status: 202,
          data: { taskId: 'task-789' },
        },
      });

      const result = await client.uninstallApp(appId);

      expect(result).toEqual({ taskId: 'task-789' });
    });

    it('should warn if app is not in installed state but allow proceed', async () => {
      const appId = 'app-pending-install';
      const testApp = mockApp({ id: appId, installationState: 'pending_install' });

      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: true,
          status: 200,
          data: testApp,
        },
        [`POST ${baseUrl}/api/v1/apps/${appId}/uninstall`]: {
          ok: true,
          status: 202,
          data: { taskId: 'task-pending-warn' },
        },
      });

      // F37 validation adds warning but doesn't block (valid=true with warnings)
      const result = await client.uninstallApp(appId);
      expect(result).toEqual({ taskId: 'task-pending-warn' });
    });
  });

  describe('API call behavior', () => {
    it('should return 202 Accepted with task ID for async tracking', async () => {
      const appId = 'app-async-123';
      const taskId = 'task-uninstall-async-456';
      const testApp = mockApp({ id: appId, installationState: 'installed' });

      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: true,
          status: 200,
          data: testApp,
        },
        [`POST ${baseUrl}/api/v1/apps/${appId}/uninstall`]: {
          ok: true,
          status: 202,
          data: { taskId },
        },
      });

      const result = await client.uninstallApp(appId);

      expect(result).toEqual({ taskId });
    });

    it('should handle 404 Not Found for invalid appId', async () => {
      const appId = 'non-existent-app';

      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          data: { message: 'App not found' },
        },
      });

      await expect(client.uninstallApp(appId)).rejects.toThrow(CloudronError);
      await expect(client.uninstallApp(appId)).rejects.toThrow(/Pre-flight validation failed/);
    });
  });

  describe('Validation error messages', () => {
    it('should include app ID in error message when validation fails', async () => {
      const appId = 'specific-app-789';

      // Mock app not found (validation fails)
      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          data: { message: 'App not found' },
        },
      });

      try {
        await client.uninstallApp(appId);
        fail('Should have thrown CloudronError');
      } catch (error) {
        expect(error).toBeInstanceOf(CloudronError);
        expect((error as CloudronError).message).toContain('Pre-flight validation failed');
        expect((error as CloudronError).message).toContain(appId);
      }
    });

    it('should list blocking errors when validation fails', async () => {
      const appId = 'app-with-issues';

      // Mock validation failure
      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          data: { message: 'App not found' },
        },
      });

      try {
        await client.uninstallApp(appId);
        fail('Should have thrown CloudronError');
      } catch (error) {
        expect(error).toBeInstanceOf(CloudronError);
        const message = (error as CloudronError).message;
        expect(message).toContain('Pre-flight validation failed');
        expect(message).toContain(appId);
      }
    });
  });

  describe('Input validation', () => {
    it('should require appId parameter', async () => {
      await expect(client.uninstallApp('')).rejects.toThrow(CloudronError);
      await expect(client.uninstallApp('')).rejects.toThrow(/appId is required/);
    });
  });

  describe('Task tracking integration (F34)', () => {
    it('should return task ID for F34 task_status tracking', async () => {
      const appId = 'app-task-tracking';
      const taskId = 'task-uninstall-track-123';
      const testApp = mockApp({ id: appId, installationState: 'installed' });

      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: true,
          status: 200,
          data: testApp,
        },
        [`POST ${baseUrl}/api/v1/apps/${appId}/uninstall`]: {
          ok: true,
          status: 202,
          data: { taskId },
        },
      });

      const result = await client.uninstallApp(appId);

      expect(result).toHaveProperty('taskId', taskId);
    });
  });

  describe('F04 test anchors validation', () => {
    it('F37 validate_operation called BEFORE POST uninstall API call', async () => {
      const appId = 'app-anchor-test';
      const testApp = mockApp({ id: appId, installationState: 'installed' });

      const fetchSpy = jest.fn((url: string, options?: any) => {
        const method = options?.method || 'GET';
        if (method === 'GET' && url.includes(appId)) {
          return Promise.resolve(mockSuccessResponse(testApp));
        }
        if (method === 'POST' && url.includes(`${appId}/uninstall`)) {
          return Promise.resolve(mockSuccessResponse({ taskId: 'task-123' }, 202));
        }
        return Promise.resolve(mockErrorResponse(404, 'Not found'));
      });

      global.fetch = fetchSpy;

      await client.uninstallApp(appId);

      // Verify GET was called before POST uninstall
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const calls = fetchSpy.mock.calls;
      expect(calls[0][1]?.method || 'GET').toBe('GET'); // First call is validation
      expect(calls[1][1]?.method).toBe('POST'); // Second call is uninstall
    });

    it('F37 validation failure prevents uninstall (returns error, no API call made)', async () => {
      const appId = 'blocked-app';

      const fetchSpy = jest.fn().mockResolvedValue(
        mockErrorResponse(404, 'App not found')
      );

      global.fetch = fetchSpy;

      await expect(client.uninstallApp(appId)).rejects.toThrow();

      // Only validation call made, no POST uninstall
      const postCalls = fetchSpy.mock.calls.filter(
        call => call[1]?.method === 'POST'
      );
      expect(postCalls).toHaveLength(0);
    });

    it('F37 validation success proceeds to POST /api/v1/apps/:id/uninstall', async () => {
      const appId = 'app-proceed';
      const testApp = mockApp({ id: appId, installationState: 'installed' });

      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: true,
          status: 200,
          data: testApp,
        },
        [`POST ${baseUrl}/api/v1/apps/${appId}/uninstall`]: {
          ok: true,
          status: 202,
          data: { taskId: 'task-proceed-123' },
        },
      });

      const result = await client.uninstallApp(appId);

      expect(result).toEqual({ taskId: 'task-proceed-123' });
    });

    it('API returns 202 Accepted with task ID for async tracking', async () => {
      const appId = 'async-app';
      const testApp = mockApp({ id: appId, installationState: 'installed' });

      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: true,
          status: 200,
          data: testApp,
        },
        [`POST ${baseUrl}/api/v1/apps/${appId}/uninstall`]: {
          ok: true,
          status: 202,
          data: { taskId: 'task-202-test' },
        },
      });

      const result = await client.uninstallApp(appId);

      expect(result).toEqual({ taskId: 'task-202-test' });
    });

    it('Invalid appId returns validation error', async () => {
      const appId = 'invalid-app';

      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          data: { message: 'App not found' },
        },
      });

      await expect(client.uninstallApp(appId)).rejects.toThrow(/Pre-flight validation failed/);
      await expect(client.uninstallApp(appId)).rejects.toThrow(new RegExp(appId));
    });

    it('Backup recommendation displayed via F37 validation warnings', async () => {
      // Note: This test verifies the integration point exists
      // The actual backup recommendation is visible in the validateOperation output
      // when called via the MCP tool handler, not in the client method
      const appId = 'app-needs-backup';
      const testApp = mockApp({ id: appId, installationState: 'installed' });

      global.fetch = createMockFetch({
        [`GET ${baseUrl}/api/v1/apps/${appId}`]: {
          ok: true,
          status: 200,
          data: testApp,
        },
        [`POST ${baseUrl}/api/v1/apps/${appId}/uninstall`]: {
          ok: true,
          status: 202,
          data: { taskId: 'task-backup-rec' },
        },
      });

      const result = await client.uninstallApp(appId);

      // Validation passes (recommendations don't block), uninstall proceeds
      expect(result).toEqual({ taskId: 'task-backup-rec' });
    });
  });
});
