/**
 * Test cloudron_validate_operation tool
 * F37: Pre-flight validation for destructive operations
 */

import { CloudronClient } from '../src/cloudron-client';
import {
  mockAppInstalled,
  mockAppPendingUninstall,
  mockCloudronStatus,
  mockCloudronStatusCriticalDisk,
  mockCloudronStatusInsufficientDisk,
  createMockFetch,
  setupTestEnv,
  cleanupTestEnv,
} from './helpers/cloudron-mock';

describe('cloudron_validate_operation tool', () => {
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

  describe('uninstall_app operation', () => {
    it('should validate successful uninstall for installed app', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/apps/app-valid': {
          ok: true,
          status: 200,
          data: mockAppInstalled
        }
      }) as any;

      const client = new CloudronClient();
      const result = await client.validateOperation('uninstall_app', 'app-valid');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations).toContain('Create a backup before uninstalling to preserve app data and configuration.');
    });

    it('should warn when app is not in installed state', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/apps/app-pending': {
          ok: true,
          status: 200,
          data: mockAppPendingUninstall
        }
      }) as any;

      const client = new CloudronClient();
      const result = await client.validateOperation('uninstall_app', 'app-pending');

      expect(result.valid).toBe(true); // Still valid, just has warnings
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("pending_uninstall");
    });

    it('should error when app does not exist', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/apps/nonexistent': {
          ok: false,
          status: 404,
          data: { message: 'App not found' }
        }
      }) as any;

      const client = new CloudronClient();
      const result = await client.validateOperation('uninstall_app', 'nonexistent');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("does not exist");
    });
  });

  describe('delete_user operation', () => {
    it('should return validation result with warnings (limited implementation)', async () => {
      const client = new CloudronClient();
      const result = await client.validateOperation('delete_user', 'user-123');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('limited in current implementation');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations).toContain('Verify user is not the last admin before deletion.');
    });
  });

  describe('restore_backup operation', () => {
    it('should validate successful restore with sufficient disk space', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: mockCloudronStatus
        }
      }) as any;

      const client = new CloudronClient();
      const result = await client.validateOperation('restore_backup', 'backup-123');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations).toContain('Verify backup integrity before restore.');
    });

    it('should error when disk space is at critical threshold', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: mockCloudronStatusCriticalDisk
        }
      }) as any;

      const client = new CloudronClient();
      const result = await client.validateOperation('restore_backup', 'backup-123');

      expect(result.valid).toBe(false); // Critical threshold blocks operation
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('CRITICAL'))).toBe(true);
    });

    it('should error when disk space is insufficient for restore', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: mockCloudronStatusInsufficientDisk
        }
      }) as any;

      const client = new CloudronClient();
      const result = await client.validateOperation('restore_backup', 'backup-123');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Insufficient disk space'))).toBe(true);
    });
  });

  describe('operation parameter validation', () => {
    it('should require resourceId parameter', async () => {
      const client = new CloudronClient();

      await expect(client.validateOperation('uninstall_app', '')).rejects.toThrow('resourceId is required');
    });

    it('should reject invalid operation type', async () => {
      const client = new CloudronClient();

      await expect(
        client.validateOperation('invalid_operation' as any, 'resource-123')
      ).rejects.toThrow('Invalid operation type');
    });

    it('should accept all valid operation types', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/apps/app-valid': {
          ok: true,
          status: 200,
          data: mockAppInstalled
        },
        'GET https://my.example.com/api/v1/cloudron/status': {
          ok: true,
          status: 200,
          data: mockCloudronStatus
        }
      }) as any;

      const client = new CloudronClient();

      const uninstallResult = await client.validateOperation('uninstall_app', 'app-valid');
      expect(uninstallResult).toBeDefined();
      expect(uninstallResult.valid).toBeDefined();

      const deleteUserResult = await client.validateOperation('delete_user', 'user-123');
      expect(deleteUserResult).toBeDefined();
      expect(deleteUserResult.valid).toBeDefined();

      const restoreResult = await client.validateOperation('restore_backup', 'backup-123');
      expect(restoreResult).toBeDefined();
      expect(restoreResult.valid).toBeDefined();
    });
  });

  describe('validation result structure', () => {
    it('should return complete ValidationResult object', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/apps/app-valid': {
          ok: true,
          status: 200,
          data: mockAppInstalled
        }
      }) as any;

      const client = new CloudronClient();
      const result = await client.validateOperation('uninstall_app', 'app-valid');

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('recommendations');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should set valid to false when errors exist', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/apps/nonexistent': {
          ok: false,
          status: 404,
          data: { message: 'App not found' }
        }
      }) as any;

      const client = new CloudronClient();
      const result = await client.validateOperation('uninstall_app', 'nonexistent');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should allow valid=true with warnings but no errors', async () => {
      global.fetch = createMockFetch({
        'GET https://my.example.com/api/v1/apps/app-pending': {
          ok: true,
          status: 200,
          data: mockAppPendingUninstall
        }
      }) as any;

      const client = new CloudronClient();
      const result = await client.validateOperation('uninstall_app', 'app-pending');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
