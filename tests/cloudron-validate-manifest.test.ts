/**
 * F23a: cloudron_validate_manifest tool tests
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
import {
  mockSuccessResponse,
  mockErrorResponse,
  mockSystemStatus,
} from './helpers/cloudron-mock.js';
import type { ManifestValidationResult, AppStoreApp } from '../src/types.js';

describe('F23a: cloudron_validate_manifest', () => {
  let client: CloudronClient;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    client = new CloudronClient({
      baseUrl: 'https://test.cloudron.io',
      token: 'test-token',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Test Anchor: Manifest schema validated', () => {
    it('should validate manifest with all required fields', async () => {
      // Mock app search response
      const mockApp: AppStoreApp = {
        id: 'io.example.app',
        name: 'Example App',
        description: 'Test app',
        version: '1.0.0',
        iconUrl: 'https://example.com/icon.png',
      };

      // Mock storage check response (sufficient storage: 10GB available out of 50GB total)
      const mockStatus = mockSystemStatus({
        disk: {
          total: 50000 * 1024 * 1024, // 50GB in bytes
          used: 40000 * 1024 * 1024,  // 40GB used
          free: 10000 * 1024 * 1024,  // 10GB free (sufficient)
          percent: 80,
        },
      });

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({ apps: [mockApp] })) // searchApps
        .mockResolvedValueOnce(mockSuccessResponse(mockStatus)); // getStatus for checkStorage

      const result = await client.validateManifest('io.example.app');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(2); // searchApps + checkStorage
    });

    it('should return error for app not found in App Store', async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({ apps: [] })); // Empty search result

      const result = await client.validateManifest('io.nonexistent.app');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('App not found in App Store: io.nonexistent.app');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only searchApps, no checkStorage
    });

    it('should handle manifest fetch failures gracefully', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(500, 'Server error'));

      const result = await client.validateManifest('io.example.app');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Manifest validation failed');
    });
  });

  describe('Test Anchor: F36 check_storage called', () => {
    it('should call F36 check_storage with estimated storage requirement', async () => {
      const mockApp: AppStoreApp = {
        id: 'io.example.app',
        name: 'Example App',
        description: 'Test app',
        version: '1.0.0',
      };

      const mockStatus = mockSystemStatus({
        disk: {
          total: 50000 * 1024 * 1024,
          used: 40000 * 1024 * 1024,
          free: 10000 * 1024 * 1024,
          percent: 80,
        },
      });

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({ apps: [mockApp] }))
        .mockResolvedValueOnce(mockSuccessResponse(mockStatus));

      await client.validateManifest('io.example.app');

      // Verify checkStorage was called (2nd fetch call)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://test.cloudron.io/api/v1/cloudron/status',
        expect.any(Object)
      );
    });

    it('should report insufficient disk space as error', async () => {
      const mockApp: AppStoreApp = {
        id: 'io.example.app',
        name: 'Example App',
        description: 'Test app',
        version: '1.0.0',
      };

      // Mock storage check: insufficient (400MB available, 500MB required by default)
      // 400MB out of 5000MB = 8% (above 5% critical, below 10% warning)
      const mockStatus = mockSystemStatus({
        disk: {
          total: 5000 * 1024 * 1024,  // 5GB total (smaller disk for test scenario)
          used: 4600 * 1024 * 1024,   // 4.6GB used
          free: 400 * 1024 * 1024,    // 400MB free (insufficient for 500MB required)
          percent: 92,
        },
      });

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({ apps: [mockApp] }))
        .mockResolvedValueOnce(mockSuccessResponse(mockStatus));

      const result = await client.validateManifest('io.example.app');

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Insufficient disk space'),
        ])
      );
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('400MB available'),
        ])
      );
    });

    it('should report low disk space warning (< 10% total)', async () => {
      const mockApp: AppStoreApp = {
        id: 'io.example.app',
        name: 'Example App',
        description: 'Test app',
        version: '1.0.0',
      };

      // Mock storage: 4GB available out of 50GB total (8% - warning threshold)
      const mockStatus = mockSystemStatus({
        disk: {
          total: 50000 * 1024 * 1024, // 50GB in bytes
          used: 46000 * 1024 * 1024,  // 46GB used
          free: 4000 * 1024 * 1024,   // 4GB free (8% - triggers warning)
          percent: 92,
        },
      });

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({ apps: [mockApp] }))
        .mockResolvedValueOnce(mockSuccessResponse(mockStatus));

      const result = await client.validateManifest('io.example.app');

      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('WARNING: Less than 10% disk space remaining'),
        ])
      );
    });

    it('should report critical disk space as error (< 5% total)', async () => {
      const mockApp: AppStoreApp = {
        id: 'io.example.app',
        name: 'Example App',
        description: 'Test app',
        version: '1.0.0',
      };

      // Mock storage: 2GB available out of 50GB total (4% - critical threshold)
      const mockStatus = mockSystemStatus({
        disk: {
          total: 50000 * 1024 * 1024, // 50GB in bytes
          used: 48000 * 1024 * 1024,  // 48GB used
          free: 2000 * 1024 * 1024,   // 2GB free (4% - triggers critical)
          percent: 96,
        },
      });

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({ apps: [mockApp] }))
        .mockResolvedValueOnce(mockSuccessResponse(mockStatus));

      const result = await client.validateManifest('io.example.app');

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('CRITICAL: Less than 5% disk space remaining'),
        ])
      );
    });

    it('should handle storage check failures gracefully with error', async () => {
      const mockApp: AppStoreApp = {
        id: 'io.example.app',
        name: 'Example App',
        description: 'Test app',
        version: '1.0.0',
      };

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({ apps: [mockApp] }))
        .mockResolvedValueOnce(mockErrorResponse(500, 'Storage API unavailable'));

      const result = await client.validateManifest('io.example.app');

      // Storage check failure causes error to be thrown and caught
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Manifest validation failed'),
        ])
      );
    });
  });

  describe('Test Anchor: Returns validation report format', () => {
    it('should return {valid: true, errors: [], warnings: [...]} for valid manifest', async () => {
      const mockApp: AppStoreApp = {
        id: 'io.example.app',
        name: 'Example App',
        description: 'Test app',
        version: '1.0.0',
      };

      // Mock storage: 10GB available out of 50GB total (20% - healthy)
      const mockStatus = mockSystemStatus({
        disk: {
          total: 50000 * 1024 * 1024, // 50GB in bytes
          used: 40000 * 1024 * 1024,  // 40GB used
          free: 10000 * 1024 * 1024,  // 10GB free (20% - healthy)
          percent: 80,
        },
      });

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({ apps: [mockApp] }))
        .mockResolvedValueOnce(mockSuccessResponse(mockStatus));

      const result = await client.validateManifest('io.example.app');

      // Valid manifests always include default config warning
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Ensure app configuration matches Cloudron specification'),
        ])
      );
    });

    it('should return {valid: false, errors: [...], warnings: []} for invalid manifest', async () => {
      const mockApp: AppStoreApp = {
        id: 'io.example.app',
        name: 'Example App',
        description: 'Test app',
        version: '1.0.0',
      };

      // Insufficient storage: 100MB available out of 50GB total (0.2% - critical)
      const mockStatus = mockSystemStatus({
        disk: {
          total: 50000 * 1024 * 1024, // 50GB in bytes
          used: 49900 * 1024 * 1024,  // 49.9GB used
          free: 100 * 1024 * 1024,    // 100MB free (0.2% - critical)
          percent: 99.8,
        },
      });

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({ apps: [mockApp] }))
        .mockResolvedValueOnce(mockSuccessResponse(mockStatus));

      const result = await client.validateManifest('io.example.app');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('Integration: Full validation workflow', () => {
    it('should complete full validation workflow with all checks', async () => {
      const mockApp: AppStoreApp = {
        id: 'io.wordpress.cloudron',
        name: 'WordPress',
        description: 'Popular blogging platform',
        version: '6.4.2',
        iconUrl: 'https://cloudron.io/img/wordpress.png',
        installCount: 15000,
      };

      // Mock storage: 25GB available out of 50GB total (50% - healthy)
      const mockStatus = mockSystemStatus({
        disk: {
          total: 50000 * 1024 * 1024, // 50GB in bytes
          used: 25000 * 1024 * 1024,  // 25GB used
          free: 25000 * 1024 * 1024,  // 25GB free (50% - healthy)
          percent: 50,
        },
      });

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({ apps: [mockApp] }))
        .mockResolvedValueOnce(mockSuccessResponse(mockStatus));

      const result = await client.validateManifest('io.wordpress.cloudron');

      // Validation should pass
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);

      // Verify all validation steps were called
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Step 1: searchApps to fetch manifest
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://test.cloudron.io/api/v1/appstore?search=io.wordpress.cloudron',
        expect.objectContaining({
          method: 'GET',
        })
      );

      // Step 2: checkStorage via getCloudronStatus
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://test.cloudron.io/api/v1/cloudron/status',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });
});
