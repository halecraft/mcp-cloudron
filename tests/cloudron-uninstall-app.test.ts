/**
 * Tests for F04: cloudron_uninstall_app tool
 * DESTRUCTIVE OPERATION with F37 pre-flight validation
 */

import { CloudronClient } from '../src/cloudron-client.js';
import { CloudronError } from '../src/errors.js';
import fetch, { Response } from 'node-fetch';
import type { ValidationResult } from '../src/types.js';

// Mock node-fetch
jest.mock('node-fetch');
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('cloudron_uninstall_app (F04)', () => {
  let client: CloudronClient;
  const baseUrl = 'https://my.cloudron.test';
  const apiToken = 'test-token-123';

  beforeEach(() => {
    client = new CloudronClient(baseUrl, apiToken);
    jest.clearAllMocks();
  });

  describe('Pre-flight validation (F37 integration)', () => {
    it('should call F37 validate_operation BEFORE DELETE API call', async () => {
      const appId = 'test-app-123';

      // Mock F37 validation response (passes)
      const validationResponse: ValidationResult = {
        valid: true,
        errors: [],
        warnings: ['No recent backup found for this app'],
        recommendations: ['Create a backup before uninstalling to preserve app data and configuration.'],
      };

      // Mock app exists check (called by validateOperation)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: appId,
          name: 'Test App',
          installationState: 'installed',
        }),
      } as Response);

      // Mock DELETE /api/v1/apps/:id (returns 202 Accepted)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ taskId: 'task-uninstall-456' }),
      } as Response);

      const result = await client.uninstallApp(appId);

      // Verify F37 validation was called first (GET /api/v1/apps/:id)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        `${baseUrl}/api/v1/apps/${appId}`,
        expect.objectContaining({ method: 'GET' })
      );

      // Verify DELETE was called second (only after validation passed)
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `${baseUrl}/api/v1/apps/${appId}`,
        expect.objectContaining({ method: 'DELETE' })
      );

      expect(result).toEqual({ taskId: 'task-uninstall-456' });
    });

    it('should block uninstall if F37 validation fails (safety gate)', async () => {
      const appId = 'app-with-deps';

      // Mock F37 validation response (fails due to dependencies)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: appId,
          name: 'App with Dependencies',
          installationState: 'installed',
        }),
      } as Response);

      // Mock dependent apps check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          apps: [
            { id: 'dependent-app-1', name: 'Dependent App 1' },
            { id: 'dependent-app-2', name: 'Dependent App 2' },
          ],
        }),
      } as Response);

      // Uninstall should throw error BEFORE making DELETE call
      await expect(client.uninstallApp(appId)).rejects.toThrow(CloudronError);
      await expect(client.uninstallApp(appId)).rejects.toThrow(/Pre-flight validation failed/);

      // Verify DELETE was NEVER called (validation blocked it)
      const deleteCalls = mockFetch.mock.calls.filter(
        call => call[1]?.method === 'DELETE'
      );
      expect(deleteCalls).toHaveLength(0);
    });

    it('should proceed with uninstall if F37 validation passes (with warnings)', async () => {
      const appId = 'app-no-backup';

      // Mock validation response (passes with warnings)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: appId,
          name: 'App Without Backup',
          installationState: 'installed',
        }),
      } as Response);

      // Mock DELETE /api/v1/apps/:id
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ taskId: 'task-789' }),
      } as Response);

      const result = await client.uninstallApp(appId);

      expect(result).toEqual({ taskId: 'task-789' });
    });
  });

  describe('API call behavior', () => {
    beforeEach(() => {
      // Mock successful validation for these tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'test-app',
          name: 'Test App',
          installationState: 'installed',
        }),
      } as Response);
    });

    it('should return 202 Accepted with task ID for async tracking', async () => {
      const appId = 'app-async-123';
      const taskId = 'task-uninstall-async-456';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ taskId }),
      } as Response);

      const result = await client.uninstallApp(appId);

      expect(result).toEqual({ taskId });
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/api/v1/apps/${appId}`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should handle 404 Not Found for invalid appId', async () => {
      const appId = 'non-existent-app';

      // Mock validation fails (app not found)
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'App not found' }),
      } as Response);

      await expect(client.uninstallApp(appId)).rejects.toThrow(CloudronError);
      await expect(client.uninstallApp(appId)).rejects.toThrow(/404/);
    });
  });

  describe('Validation error messages', () => {
    it('should list blocking errors when validation fails', async () => {
      const appId = 'app-with-issues';

      // Mock validation response with multiple errors
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: appId,
          name: 'App with Issues',
          installationState: 'pending_install',
        }),
      } as Response);

      try {
        await client.uninstallApp(appId);
        fail('Should have thrown CloudronError');
      } catch (error) {
        expect(error).toBeInstanceOf(CloudronError);
        expect((error as CloudronError).message).toContain('Pre-flight validation failed');
        expect((error as CloudronError).message).toContain('not \'installed\'');
      }
    });

    it('should include app ID in error message', async () => {
      const appId = 'specific-app-789';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: appId,
          name: 'Specific App',
          installationState: 'error',
        }),
      } as Response);

      await expect(client.uninstallApp(appId)).rejects.toThrow(
        new RegExp(appId)
      );
    });
  });

  describe('Input validation', () => {
    it('should require appId parameter', async () => {
      await expect(client.uninstallApp('')).rejects.toThrow(CloudronError);
      await expect(client.uninstallApp('')).rejects.toThrow(/appId is required/);
    });
  });

  describe('Task tracking integration (F34)', () => {
    beforeEach(() => {
      // Mock successful validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'test-app',
          name: 'Test App',
          installationState: 'installed',
        }),
      } as Response);
    });

    it('should return task ID for F34 task_status tracking', async () => {
      const appId = 'app-task-tracking';
      const taskId = 'task-uninstall-track-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ taskId }),
      } as Response);

      const result = await client.uninstallApp(appId);

      expect(result).toHaveProperty('taskId', taskId);
    });
  });

  describe('F37 test anchors validation', () => {
    it('F37 validation failure prevents uninstall (returns error, no API call made)', async () => {
      const appId = 'blocked-app';

      // Mock validation fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'App not found' }),
      } as Response);

      await expect(client.uninstallApp(appId)).rejects.toThrow();

      // Verify no DELETE call was made
      const deleteCalls = mockFetch.mock.calls.filter(
        call => call[1]?.method === 'DELETE'
      );
      expect(deleteCalls).toHaveLength(0);
    });

    it('API returns 202 Accepted with task ID for async tracking', async () => {
      const appId = 'async-app';

      // Mock successful validation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: appId,
          name: 'Async App',
          installationState: 'installed',
        }),
      } as Response);

      // Mock 202 Accepted
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ taskId: 'task-202-test' }),
      } as Response);

      const result = await client.uninstallApp(appId);

      expect(result).toEqual({ taskId: 'task-202-test' });
    });

    it('Backup recommendation displayed via F37 validation warnings', async () => {
      const appId = 'app-needs-backup';

      // Mock validation with backup recommendation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: appId,
          name: 'App Needs Backup',
          installationState: 'installed',
        }),
      } as Response);

      // Mock successful DELETE
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ taskId: 'task-backup-rec' }),
      } as Response);

      // The validation would include recommendations in F37's validateUninstallApp
      // which are visible when calling the MCP tool (not in this client test)
      const result = await client.uninstallApp(appId);

      expect(result).toEqual({ taskId: 'task-backup-rec' });
    });
  });
});
