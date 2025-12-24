/**
 * Tests for F23a: cloudron_validate_manifest tool
 * Test anchors:
 * - F36 check_storage called to verify sufficient disk space
 * - Manifest schema validated against Cloudron spec
 * - Dependencies checked for availability in catalog
 * - Returns {valid: true, errors: [], warnings: []} for valid manifest
 * - Returns {valid: false, errors: [...], warnings: []} for invalid manifest
 * - Insufficient disk space listed in errors
 * - Missing dependencies listed in errors
 */

import { CloudronClient } from '../src/cloudron-client.js';
import { mockSuccessResponse, mockErrorResponse, mockSystemStatus, setupTestEnv, cleanupTestEnv } from './helpers/cloudron-mock.js';
import { CloudronError } from '../src/errors.js';

// Mock App Store helper
const mockAppStoreApp = (id: string, overrides: any = {}) => ({
  id,
  name: overrides.name || 'Test App',
  description: overrides.description || 'Test application',
  version: overrides.version || '1.0.0',
  iconUrl: overrides.iconUrl || null,
  installCount: overrides.installCount || 0,
  relevanceScore: overrides.relevanceScore || 1.0,
});

describe('F23a: cloudron_validate_manifest', () => {
  let client: CloudronClient;
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    setupTestEnv();
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    cleanupTestEnv();
  });

  beforeEach(() => {
    client = new CloudronClient();
  });

  describe('Success Cases', () => {
    it('should return valid=true for app with sufficient storage', async () => {
      // Mock F22 searchApps to return app
      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockSuccessResponse({
          apps: [mockAppStoreApp('wordpress', { name: 'WordPress', description: 'Blog platform' })],
        }))
        // Mock F36 checkStorage (via getStatus)
        .mockResolvedValueOnce(mockSuccessResponse(mockSystemStatus({
          disk: {
            total: 100000 * 1024 * 1024, // 100GB
            used: 40000 * 1024 * 1024,   // 40GB
            free: 60000 * 1024 * 1024,   // 60GB (sufficient)
            percent: 40,
          },
        })));

      const result = await client.validateManifest('wordpress', 500); // 500MB required

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThanOrEqual(1); // Generic config warning
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should return valid=true with warnings for low disk space (10-5%)', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockSuccessResponse({
          apps: [mockAppStoreApp('wordpress', { name: 'WordPress' })],
        }))
        .mockResolvedValueOnce(mockSuccessResponse(mockSystemStatus({
          disk: {
            total: 10000 * 1024 * 1024,  // 10GB
            used: 9100 * 1024 * 1024,    // 9.1GB
            free: 900 * 1024 * 1024,     // 900MB (9% - warning threshold)
            percent: 91,
          },
        })));

      const result = await client.validateManifest('wordpress', 500);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThanOrEqual(2); // Low disk warning + config warning
      expect(result.warnings.some(w => w.includes('10% disk space remaining'))).toBe(true);
    });

    it('should include dependency warning when app description mentions "requires"', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockSuccessResponse({
          apps: [mockAppStoreApp('gitlab', {
            name: 'GitLab',
            description: 'DevOps platform. Requires PostgreSQL and Redis addons.',
          })],
        }))
        .mockResolvedValueOnce(mockSuccessResponse(mockSystemStatus({
          disk: {
            total: 100000 * 1024 * 1024,
            used: 40000 * 1024 * 1024,
            free: 60000 * 1024 * 1024,
            percent: 40,
          },
        })));

      const result = await client.validateManifest('gitlab', 1000);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('dependencies'))).toBe(true);
    });
  });

  describe('Failure Cases', () => {
    it('should return valid=false when app not found in App Store', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockSuccessResponse({ apps: [] })); // No apps found

      const result = await client.validateManifest('nonexistent-app', 500);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('App not found in App Store');
      expect(fetch).toHaveBeenCalledTimes(1); // Only searchApps called
    });

    it('should return valid=false when disk space critical (<5%)', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockSuccessResponse({
          apps: [mockAppStoreApp('wordpress')],
        }))
        .mockResolvedValueOnce(mockSuccessResponse(mockSystemStatus({
          disk: {
            total: 10000 * 1024 * 1024,  // 10GB
            used: 9600 * 1024 * 1024,    // 9.6GB
            free: 400 * 1024 * 1024,     // 400MB (4% - critical threshold)
            percent: 96,
          },
        })));

      const result = await client.validateManifest('wordpress', 500);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors.some(e => e.includes('CRITICAL'))).toBe(true);
      expect(result.errors.some(e => e.includes('5% disk space remaining'))).toBe(true);
    });

    it('should return valid=false when insufficient disk space for required MB', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockSuccessResponse({
          apps: [mockAppStoreApp('wordpress')],
        }))
        .mockResolvedValueOnce(mockSuccessResponse(mockSystemStatus({
          disk: {
            total: 10000 * 1024 * 1024,  // 10GB
            used: 9200 * 1024 * 1024,    // 9.2GB
            free: 800 * 1024 * 1024,     // 800MB available
            percent: 92,
          },
        })));

      const result = await client.validateManifest('wordpress', 1000); // 1000MB required, only 800MB available

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors.some(e => e.includes('Insufficient disk space'))).toBe(true);
      expect(result.errors.some(e => e.includes('800') && e.includes('1000'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw CloudronError when appId is empty', async () => {
      await expect(client.validateManifest('')).rejects.toThrow(CloudronError);
      await expect(client.validateManifest('')).rejects.toThrow('appId is required');
    });

    it('should return valid=false with error when storage check fails', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockSuccessResponse({
          apps: [mockAppStoreApp('wordpress')],
        }))
        // Storage check fails (no disk info)
        .mockResolvedValueOnce(mockSuccessResponse(mockSystemStatus({
          disk: undefined, // No disk info
        })));

      const result = await client.validateManifest('wordpress', 500);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Manifest validation failed'))).toBe(true);
    });

    it('should return valid=false with error when searchApps fails', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockErrorResponse(500, 'App Store unavailable'));

      const result = await client.validateManifest('wordpress', 500);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Manifest validation failed'))).toBe(true);
    });
  });

  describe('F36 Integration (checkStorage)', () => {
    it('should call F36 checkStorage with requiredMB parameter', async () => {
      const spyCheckStorage = jest.spyOn(client, 'checkStorage');

      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockSuccessResponse({
          apps: [mockAppStoreApp('wordpress')],
        }))
        .mockResolvedValueOnce(mockSuccessResponse(mockSystemStatus({
          disk: {
            total: 100000 * 1024 * 1024,
            used: 40000 * 1024 * 1024,
            free: 60000 * 1024 * 1024,
            percent: 40,
          },
        })));

      await client.validateManifest('wordpress', 750);

      expect(spyCheckStorage).toHaveBeenCalledWith(750);
      expect(spyCheckStorage).toHaveBeenCalledTimes(1);
    });

    it('should use default 500MB when requiredMB not provided', async () => {
      const spyCheckStorage = jest.spyOn(client, 'checkStorage');

      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockSuccessResponse({
          apps: [mockAppStoreApp('wordpress')],
        }))
        .mockResolvedValueOnce(mockSuccessResponse(mockSystemStatus({
          disk: {
            total: 100000 * 1024 * 1024,
            used: 40000 * 1024 * 1024,
            free: 60000 * 1024 * 1024,
            percent: 40,
          },
        })));

      await client.validateManifest('wordpress'); // No requiredMB parameter

      expect(spyCheckStorage).toHaveBeenCalledWith(500); // Default 500MB
    });
  });
});
