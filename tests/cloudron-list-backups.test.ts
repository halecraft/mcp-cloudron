/**
 * Tests for cloudron_list_backups MCP tool
 * Validates backup listing, sorting, and error handling
 */

import { CloudronClient } from '../src/cloudron-client.js';
import type { Backup, BackupsResponse } from '../src/types.js';
import { CloudronError, CloudronAuthError } from '../src/errors.js';
import {
  createMockFetch,
  setupTestEnv,
  cleanupTestEnv,
} from './helpers/cloudron-mock.js';

describe('cloudron_list_backups tool', () => {
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

  describe('successful backup listing', () => {
    it('should list all backups sorted by timestamp (newest first)', async () => {
      const mockBackups: Backup[] = [
        {
          id: 'backup-1',
          creationTime: '2025-12-20T10:00:00Z',
          version: '8.2.0',
          type: 'box',
          state: 'uploaded',
          size: 5368709120, // 5GB in bytes
          appCount: 12,
        },
        {
          id: 'backup-2',
          creationTime: '2025-12-23T15:30:00Z',
          version: '8.2.0',
          type: 'box',
          state: 'uploaded',
          size: 6442450944, // 6GB in bytes
          appCount: 15,
        },
        {
          id: 'backup-3',
          creationTime: '2025-12-21T08:00:00Z',
          version: '8.2.0',
          type: 'box',
          state: 'uploaded',
          size: 5905580032, // 5.5GB in bytes
          appCount: 13,
        },
      ];

      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/backups': {
          ok: true,
          status: 200,
          data: { backups: mockBackups },
        },
      }) as any;

      const client = new CloudronClient();
      const backups = await client.listBackups();

      // Verify backups are sorted by timestamp (newest first)
      expect(backups).toHaveLength(3);
      expect(backups[0].id).toBe('backup-2'); // 2025-12-23 (newest)
      expect(backups[1].id).toBe('backup-3'); // 2025-12-21
      expect(backups[2].id).toBe('backup-1'); // 2025-12-20 (oldest)
    });

    it('should include all backup metadata fields', async () => {
      const mockBackup: Backup = {
        id: 'backup-full-metadata',
        creationTime: '2025-12-23T10:00:00Z',
        version: '8.2.0',
        type: 'box',
        state: 'uploaded',
        size: 1073741824, // 1GB
        appCount: 5,
        dependsOn: ['backup-previous'],
      };

      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/backups': {
          ok: true,
          status: 200,
          data: { backups: [mockBackup] },
        },
      }) as any;

      const client = new CloudronClient();
      const backups = await client.listBackups();

      expect(backups).toHaveLength(1);
      expect(backups[0]).toMatchObject({
        id: 'backup-full-metadata',
        creationTime: '2025-12-23T10:00:00Z',
        version: '8.2.0',
        type: 'box',
        state: 'uploaded',
        size: 1073741824,
        appCount: 5,
        dependsOn: ['backup-previous'],
      });
    });

    it('should handle backups with different states', async () => {
      const mockBackups: Backup[] = [
        {
          id: 'backup-creating',
          creationTime: '2025-12-23T10:00:00Z',
          version: '8.2.0',
          type: 'box',
          state: 'creating',
        },
        {
          id: 'backup-error',
          creationTime: '2025-12-23T09:00:00Z',
          version: '8.2.0',
          type: 'box',
          state: 'error',
          errorMessage: 'Insufficient disk space',
        },
        {
          id: 'backup-uploaded',
          creationTime: '2025-12-23T08:00:00Z',
          version: '8.2.0',
          type: 'box',
          state: 'uploaded',
        },
      ];

      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/backups': {
          ok: true,
          status: 200,
          data: { backups: mockBackups },
        },
      }) as any;

      const client = new CloudronClient();
      const backups = await client.listBackups();

      expect(backups).toHaveLength(3);
      expect(backups.find(b => b.id === 'backup-creating')?.state).toBe('creating');
      expect(backups.find(b => b.id === 'backup-error')?.state).toBe('error');
      expect(backups.find(b => b.id === 'backup-error')?.errorMessage).toBe('Insufficient disk space');
      expect(backups.find(b => b.id === 'backup-uploaded')?.state).toBe('uploaded');
    });

    it('should handle backups with app and box types', async () => {
      const mockBackups: Backup[] = [
        {
          id: 'backup-box',
          creationTime: '2025-12-23T10:00:00Z',
          version: '8.2.0',
          type: 'box',
          state: 'uploaded',
        },
        {
          id: 'backup-app',
          creationTime: '2025-12-23T09:00:00Z',
          version: '8.2.0',
          type: 'app',
          state: 'uploaded',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ backups: mockBackups }),
      });

      const client = new CloudronClient({
        baseUrl: 'https://test.cloudron.io',
        token: 'test-token',
      });

      const backups = await client.listBackups();

      expect(backups).toHaveLength(2);
      expect(backups.find(b => b.id === 'backup-box')?.type).toBe('box');
      expect(backups.find(b => b.id === 'backup-app')?.type).toBe('app');
    });
  });

  describe('empty backup list', () => {
    it('should return empty array when no backups exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ backups: [] }),
      });

      const client = new CloudronClient({
        baseUrl: 'https://test.cloudron.io',
        token: 'test-token',
      });

      const backups = await client.listBackups();

      expect(backups).toEqual([]);
      expect(backups).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle API authentication error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ message: 'Invalid API token' }),
      });

      const client = new CloudronClient({
        baseUrl: 'https://test.cloudron.io',
        token: 'invalid-token',
      });

      await expect(client.listBackups()).rejects.toThrow(CloudronAuthError);
      await expect(client.listBackups()).rejects.toThrow('Invalid API token');
    });

    it('should handle API server error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify({ message: 'Database connection failed' }),
      });

      const client = new CloudronClient({
        baseUrl: 'https://test.cloudron.io',
        token: 'test-token',
      });

      await expect(client.listBackups()).rejects.toThrow(CloudronError);
      await expect(client.listBackups()).rejects.toThrow('Database connection failed');
    });

    it('should handle network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network timeout'));

      const client = new CloudronClient({
        baseUrl: 'https://test.cloudron.io',
        token: 'test-token',
      });

      await expect(client.listBackups()).rejects.toThrow(CloudronError);
      await expect(client.listBackups()).rejects.toThrow('Network error: Network timeout');
    });
  });

  describe('environment variable validation', () => {
    it('should require CLOUDRON_BASE_URL', () => {
      const originalBaseUrl = process.env.CLOUDRON_BASE_URL;
      delete process.env.CLOUDRON_BASE_URL;
      process.env.CLOUDRON_API_TOKEN = 'test-token';

      expect(() => new CloudronClient()).toThrow('CLOUDRON_BASE_URL not set');

      process.env.CLOUDRON_BASE_URL = originalBaseUrl;
    });

    it('should require CLOUDRON_API_TOKEN', () => {
      const originalToken = process.env.CLOUDRON_API_TOKEN;
      process.env.CLOUDRON_BASE_URL = 'https://test.cloudron.io';
      delete process.env.CLOUDRON_API_TOKEN;

      expect(() => new CloudronClient()).toThrow('CLOUDRON_API_TOKEN not set');

      process.env.CLOUDRON_API_TOKEN = originalToken;
    });
  });
});
