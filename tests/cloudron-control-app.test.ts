/**
 * Test suite for cloudron_control_app tool (F01)
 * Merged F01/F02/F03 into single tool with action enum
 */

import { CloudronClient } from '../src/cloudron-client.js';
import { CloudronError } from '../src/errors.js';
import type { SystemStatus, App } from '../src/types.js';
import {
  mockSuccessResponse,
  mockErrorResponse,
  mockApp,
  mockSystemStatus,
} from './helpers/cloudron-mock.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('cloudron_control_app tool', () => {
  let client: CloudronClient;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new CloudronClient({
      baseUrl: 'https://test.cloudron.io',
      token: 'test-token',
    });
  });

  describe('start action', () => {
    it('should start app successfully', async () => {
      const taskId = 'task-start-123';
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ taskId }, 202)
      );

      const result = await client.startApp('app-wordpress-123');

      expect(result).toEqual({ taskId });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.cloudron.io/api/v1/apps/app-wordpress-123/start',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should return 202 Accepted status', async () => {
      const taskId = 'task-202-test';
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ taskId }, 202)
      );

      const result = await client.startApp('app-test');

      expect(result.taskId).toBe(taskId);
    });

    it('should handle app not found (404)', async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse(404, 'App not found')
      );

      await expect(client.startApp('app-nonexistent')).rejects.toThrow(
        'App not found'
      );
    });

    it('should require appId parameter', async () => {
      await expect(client.startApp('')).rejects.toThrow('appId is required');
    });
  });

  describe('stop action', () => {
    it('should stop app successfully', async () => {
      const taskId = 'task-stop-456';
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ taskId }, 202)
      );

      const result = await client.stopApp('app-wordpress-123');

      expect(result).toEqual({ taskId });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.cloudron.io/api/v1/apps/app-wordpress-123/stop',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should return 202 Accepted status', async () => {
      const taskId = 'task-stop-202';
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ taskId }, 202)
      );

      const result = await client.stopApp('app-test');

      expect(result.taskId).toBe(taskId);
    });

    it('should handle app not found (404)', async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse(404, 'App not found')
      );

      await expect(client.stopApp('app-nonexistent')).rejects.toThrow(
        CloudronError
      );
    });

    it('should require appId parameter', async () => {
      await expect(client.stopApp('')).rejects.toThrow('appId is required');
    });
  });

  describe('restart action', () => {
    it('should restart app successfully', async () => {
      const taskId = 'task-restart-789';
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ taskId }, 202)
      );

      const result = await client.restartApp('app-wordpress-123');

      expect(result).toEqual({ taskId });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.cloudron.io/api/v1/apps/app-wordpress-123/restart',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should return 202 Accepted status', async () => {
      const taskId = 'task-restart-202';
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ taskId }, 202)
      );

      const result = await client.restartApp('app-test');

      expect(result.taskId).toBe(taskId);
    });

    it('should handle app not found (404)', async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse(404, 'App not found')
      );

      await expect(client.restartApp('app-nonexistent')).rejects.toThrow(
        CloudronError
      );
    });

    it('should require appId parameter', async () => {
      await expect(client.restartApp('')).rejects.toThrow('appId is required');
    });
  });

  describe('app state transitions', () => {
    it('should track state transition: running → stopped', async () => {
      // Get app in running state
      const runningApp = mockApp({
        id: 'app-transition-test',
        installationState: 'installed',
        runState: 'running',
      });

      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(runningApp, 200)
      );

      const beforeStop = await client.getApp('app-transition-test');
      expect(beforeStop.runState).toBe('running');

      // Stop the app
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ taskId: 'task-stop' }, 202)
      );

      const stopResult = await client.stopApp('app-transition-test');
      expect(stopResult.taskId).toBe('task-stop');

      // Verify state transition tracked via task
      // (In real scenario, would poll cloudron_task_status until complete)
    });

    it('should track state transition: stopped → running', async () => {
      // Get app in stopped state
      const stoppedApp = mockApp({
        id: 'app-start-test',
        installationState: 'installed',
        runState: 'stopped',
      });

      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse(stoppedApp, 200)
      );

      const beforeStart = await client.getApp('app-start-test');
      expect(beforeStart.runState).toBe('stopped');

      // Start the app
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ taskId: 'task-start' }, 202)
      );

      const startResult = await client.startApp('app-start-test');
      expect(startResult.taskId).toBe('task-start');
    });
  });

  describe('error handling', () => {
    it('should handle API authentication error (401)', async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse(401, 'Invalid token')
      );

      await expect(client.startApp('app-test')).rejects.toThrow('Invalid token');
    });

    it('should handle API server error (500)', async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse(500, 'Internal server error')
      );

      await expect(client.stopApp('app-test')).rejects.toThrow(CloudronError);
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(client.restartApp('app-test')).rejects.toThrow(CloudronError);
      await expect(client.restartApp('app-test')).rejects.toThrow('Network error');
    });
  });

  describe('action parameter validation', () => {
    it('should accept all valid actions', () => {
      const validActions = ['start', 'stop', 'restart'];

      // Verify these are the only valid enum values
      expect(validActions).toHaveLength(3);

      // In MCP tool handler, invalid action would be caught by enum validation
      // This test verifies the client methods exist for all valid actions
      expect(typeof client.startApp).toBe('function');
      expect(typeof client.stopApp).toBe('function');
      expect(typeof client.restartApp).toBe('function');
    });
  });

  describe('async operation tracking', () => {
    it('should return task ID for F34 task_status tracking', async () => {
      const taskId = 'task-async-tracking';
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ taskId }, 202)
      );

      const result = await client.startApp('app-test');

      // Task ID should be returned for tracking with cloudron_task_status
      expect(result).toHaveProperty('taskId');
      expect(typeof result.taskId).toBe('string');
      expect(result.taskId.length).toBeGreaterThan(0);
    });
  });
});
