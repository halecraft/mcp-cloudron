/**
 * Test cloudron_create_backup tool (F08)
 * Validates backup creation with F36 pre-flight storage check and F34 task tracking
 */

import { CloudronClient } from '../src/cloudron-client';
import { CloudronError } from '../src/errors';
import {
  mockCloudronStatus,
  createMockFetch,
  setupTestEnv,
  cleanupTestEnv,
} from './helpers/cloudron-mock';

describe('cloudron_create_backup tool (F08)', () => {
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

  it('should create backup and return task ID when sufficient storage', async () => {
    // Mock API responses:
    // 1. GET /api/v1/cloudron/status (F36 storage check)
    // 2. POST /api/v1/backups (create backup)
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/cloudron/status': {
        ok: true,
        status: 200,
        data: mockCloudronStatus // Has 51200 MB available (> 5GB requirement)
      },
      'POST https://my.example.com/api/v1/backups': {
        ok: true,
        status: 202,
        data: { taskId: 'task-backup-12345' }
      }
    }) as any;

    const client = new CloudronClient();
    const taskId = await client.createBackup();

    // Verify task ID returned
    expect(taskId).toBe('task-backup-12345');
    expect(typeof taskId).toBe('string');
    expect(taskId).toMatch(/^task-/);
  });

  it('should throw error when insufficient storage (F36 check fails)', async () => {
    // Mock status with insufficient storage (only 1GB available)
    const lowStorageStatus = {
      ...mockCloudronStatus,
      disk: {
        total: 10737418240, // 10GB
        used: 9663676416,   // 9GB
        free: 1073741824    // 1GB (< 5GB requirement)
      }
    };

    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/cloudron/status': {
        ok: true,
        status: 200,
        data: lowStorageStatus
      }
    }) as any;

    const client = new CloudronClient();

    // Should throw CloudronError due to insufficient storage
    await expect(client.createBackup()).rejects.toThrow(CloudronError);
    await expect(client.createBackup()).rejects.toThrow(/Insufficient storage for backup/i);
    await expect(client.createBackup()).rejects.toThrow(/Required: 5120MB/);
  });

  it('should NOT call backup API when storage check fails', async () => {
    const lowStorageStatus = {
      ...mockCloudronStatus,
      disk: {
        total: 10737418240,
        used: 9663676416,
        free: 1073741824 // 1GB
      }
    };

    const mockFetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => lowStorageStatus
      });

    global.fetch = mockFetch as any;

    const client = new CloudronClient();

    await expect(client.createBackup()).rejects.toThrow();

    // Verify only ONE API call made (GET status), NOT two (POST backup not called)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/cloudron/status'),
      expect.any(Object)
    );
  });

  it('should return task ID for F34 tracking', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/cloudron/status': {
        ok: true,
        status: 200,
        data: mockCloudronStatus
      },
      'POST https://my.example.com/api/v1/backups': {
        ok: true,
        status: 202,
        data: { taskId: 'task-async-backup-001' }
      }
    }) as any;

    const client = new CloudronClient();
    const taskId = await client.createBackup();

    // Task ID format suitable for F34 task_status tracking
    expect(taskId).toMatch(/^task-/);
    expect(taskId.length).toBeGreaterThan(5);
  });

  it('should throw error when backup API returns 202 but missing taskId', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/cloudron/status': {
        ok: true,
        status: 200,
        data: mockCloudronStatus
      },
      'POST https://my.example.com/api/v1/backups': {
        ok: true,
        status: 202,
        data: {} // Missing taskId
      }
    }) as any;

    const client = new CloudronClient();

    await expect(client.createBackup()).rejects.toThrow(CloudronError);
    await expect(client.createBackup()).rejects.toThrow(/missing taskId/i);
  });

  it('should handle backup API authentication error (401)', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/cloudron/status': {
        ok: true,
        status: 200,
        data: mockCloudronStatus
      },
      'POST https://my.example.com/api/v1/backups': {
        ok: false,
        status: 401,
        data: { message: 'Invalid token' }
      }
    }) as any;

    const client = new CloudronClient();

    await expect(client.createBackup()).rejects.toThrow();
  });

  it('should handle backup API server error (500)', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/cloudron/status': {
        ok: true,
        status: 200,
        data: mockCloudronStatus
      },
      'POST https://my.example.com/api/v1/backups': {
        ok: false,
        status: 500,
        data: { message: 'Backup service unavailable' }
      }
    }) as any;

    const client = new CloudronClient();

    await expect(client.createBackup()).rejects.toThrow();
  });

  it('should use POST HTTP method and correct endpoint', async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCloudronStatus
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ taskId: 'task-123' })
      });

    global.fetch = mockFetch as any;

    const client = new CloudronClient();
    await client.createBackup();

    // Verify POST /api/v1/backups called
    expect(mockFetch).toHaveBeenCalledWith(
      'https://my.example.com/api/v1/backups',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token-12345',
        }),
      })
    );
  });

  it('should log warning when storage < 10% but sufficient for backup', async () => {
    // Mock status with 8GB available (> 5GB requirement, but < 10% of 100GB total)
    const warningStorageStatus = {
      ...mockCloudronStatus,
      disk: {
        total: 107374182400, // 100GB
        used: 98869536768,   // 92GB
        free: 8589934592     // 8GB (> 5GB requirement, but < 10GB threshold)
      }
    };

    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/cloudron/status': {
        ok: true,
        status: 200,
        data: warningStorageStatus
      },
      'POST https://my.example.com/api/v1/backups': {
        ok: true,
        status: 202,
        data: { taskId: 'task-warning-123' }
      }
    }) as any;

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const client = new CloudronClient();
    const taskId = await client.createBackup();

    // Should succeed (8GB > 5GB requirement)
    expect(taskId).toBe('task-warning-123');

    // But should log warning (8GB < 10% of 100GB)
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Storage warning')
    );

    consoleWarnSpy.mockRestore();
  });
});
