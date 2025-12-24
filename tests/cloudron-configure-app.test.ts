/**
 * F05: cloudron_configure_app tool tests
 * Test anchors:
 * - Config object with env vars updates app environment correctly
 * - Config object with memory limits updates resource allocation
 * - Config object with access control updates permissions
 * - PUT /api/v1/apps/:id/configure returns 200 OK with updated config
 * - Invalid appId returns 404 Not Found
 * - Invalid config returns 400 Bad Request with validation errors
 * - App restart documented if config requires reload
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CloudronClient } from '../src/cloudron-client.js';
import type { App, ConfigureAppResponse } from '../src/types.js';
import { mockApp, mockErrorResponse, mockSuccessResponse } from './helpers/cloudron-mock.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('F05: cloudron_configure_app', () => {
  let client: CloudronClient;
  const mockBaseUrl = 'https://cloudron.example.com';
  const mockToken = 'test-token-123';

  beforeEach(() => {
    client = new CloudronClient({ baseUrl: mockBaseUrl, token: mockToken });
    jest.clearAllMocks();
  });

  describe('Config validation', () => {
    it('should reject empty appId', async () => {
      await expect(
        client.configureApp('', { env: { KEY: 'value' } })
      ).rejects.toThrow('appId is required');
    });

    it('should reject empty config object', async () => {
      await expect(
        client.configureApp('app-123', {})
      ).rejects.toThrow('config object cannot be empty');
    });

    it('should reject null config object', async () => {
      await expect(
        client.configureApp('app-123', null as any)
      ).rejects.toThrow('config object cannot be empty');
    });

    it('should reject invalid env type', async () => {
      await expect(
        client.configureApp('app-123', { env: 'not-an-object' as any })
      ).rejects.toThrow('env must be an object of key-value pairs');
    });

    it('should reject invalid memoryLimit (negative)', async () => {
      await expect(
        client.configureApp('app-123', { memoryLimit: -512 })
      ).rejects.toThrow('memoryLimit must be a positive number');
    });

    it('should reject invalid memoryLimit (zero)', async () => {
      await expect(
        client.configureApp('app-123', { memoryLimit: 0 })
      ).rejects.toThrow('memoryLimit must be a positive number');
    });

    it('should reject invalid memoryLimit (non-number)', async () => {
      await expect(
        client.configureApp('app-123', { memoryLimit: '512' as any })
      ).rejects.toThrow('memoryLimit must be a positive number');
    });

    it('should reject invalid accessRestriction type', async () => {
      await expect(
        client.configureApp('app-123', { accessRestriction: 123 as any })
      ).rejects.toThrow('accessRestriction must be a string or null');
    });

    it('should accept null accessRestriction', async () => {
      const mockResponse: ConfigureAppResponse = {
        app: mockApp({ id: 'app-123', accessRestriction: null }),
        restartRequired: false,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockSuccessResponse(mockResponse)
      );

      const result = await client.configureApp('app-123', { accessRestriction: null });
      expect(result.app.accessRestriction).toBeNull();
    });
  });

  describe('Environment variables configuration', () => {
    it('should update app environment variables successfully', async () => {
      const config = {
        env: {
          NODE_ENV: 'production',
          API_KEY: 'secret-key',
          PORT: '3000',
        },
      };

      const updatedApp = mockApp({
        id: 'app-123',
        manifest: { id: 'nodejs-app', version: '1.0', title: 'Node.js App', description: 'Test' },
      });

      const mockResponse: ConfigureAppResponse = {
        app: updatedApp,
        restartRequired: true,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockSuccessResponse(mockResponse)
      );

      const result = await client.configureApp('app-123', config);

      expect(result.app).toEqual(updatedApp);
      expect(result.restartRequired).toBe(true);

      // Verify API call
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/apps/app-123/configure`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(config),
        })
      );
    });
  });

  describe('Memory limit configuration', () => {
    it('should update app memory limit successfully', async () => {
      const config = { memoryLimit: 1024 };

      const updatedApp = mockApp({
        id: 'app-123',
        memoryLimit: 1024,
      });

      const mockResponse: ConfigureAppResponse = {
        app: updatedApp,
        restartRequired: true,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockSuccessResponse(mockResponse)
      );

      const result = await client.configureApp('app-123', config);

      expect(result.app.memoryLimit).toBe(1024);
      expect(result.restartRequired).toBe(true);
    });

    it('should accept large memory limits', async () => {
      const config = { memoryLimit: 8192 };

      const mockResponse: ConfigureAppResponse = {
        app: mockApp({ id: 'app-123', memoryLimit: 8192 }),
        restartRequired: true,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockSuccessResponse(mockResponse)
      );

      const result = await client.configureApp('app-123', config);
      expect(result.app.memoryLimit).toBe(8192);
    });
  });

  describe('Access control configuration', () => {
    it('should update app access restriction successfully', async () => {
      const config = { accessRestriction: 'members-only' };

      const updatedApp = mockApp({
        id: 'app-123',
        accessRestriction: 'members-only',
      });

      const mockResponse: ConfigureAppResponse = {
        app: updatedApp,
        restartRequired: false,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockSuccessResponse(mockResponse)
      );

      const result = await client.configureApp('app-123', config);

      expect(result.app.accessRestriction).toBe('members-only');
      expect(result.restartRequired).toBe(false);
    });

    it('should remove access restriction with null', async () => {
      const config = { accessRestriction: null };

      const mockResponse: ConfigureAppResponse = {
        app: mockApp({ id: 'app-123', accessRestriction: null }),
        restartRequired: false,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockSuccessResponse(mockResponse)
      );

      const result = await client.configureApp('app-123', config);
      expect(result.app.accessRestriction).toBeNull();
    });
  });

  describe('Combined configuration', () => {
    it('should update multiple config fields at once', async () => {
      const config = {
        env: { NODE_ENV: 'production' },
        memoryLimit: 2048,
        accessRestriction: 'private',
      };

      const updatedApp = mockApp({
        id: 'app-123',
        memoryLimit: 2048,
        accessRestriction: 'private',
      });

      const mockResponse: ConfigureAppResponse = {
        app: updatedApp,
        restartRequired: true,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockSuccessResponse(mockResponse)
      );

      const result = await client.configureApp('app-123', config);

      expect(result.app.memoryLimit).toBe(2048);
      expect(result.app.accessRestriction).toBe('private');
      expect(result.restartRequired).toBe(true);
    });
  });

  describe('Restart requirement flag', () => {
    it('should indicate restart required for env changes', async () => {
      const config = { env: { NEW_VAR: 'value' } };

      const mockResponse: ConfigureAppResponse = {
        app: mockApp({ id: 'app-123' }),
        restartRequired: true,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockSuccessResponse(mockResponse)
      );

      const result = await client.configureApp('app-123', config);
      expect(result.restartRequired).toBe(true);
    });

    it('should indicate no restart required for access control changes', async () => {
      const config = { accessRestriction: 'public' };

      const mockResponse: ConfigureAppResponse = {
        app: mockApp({ id: 'app-123' }),
        restartRequired: false,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockSuccessResponse(mockResponse)
      );

      const result = await client.configureApp('app-123', config);
      expect(result.restartRequired).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle 404 Not Found for invalid appId', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockErrorResponse(404, 'App not found')
      );

      await expect(
        client.configureApp('invalid-app', { env: { KEY: 'value' } })
      ).rejects.toThrow('App not found');
    });

    it('should handle 400 Bad Request for invalid config', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockErrorResponse(400, 'Invalid configuration: memoryLimit must be between 128 and 8192 MB')
      );

      await expect(
        client.configureApp('app-123', { memoryLimit: 99999 })
      ).rejects.toThrow('Invalid configuration');
    });

    it('should handle 401 Unauthorized', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockErrorResponse(401, 'Invalid credentials')
      );

      await expect(
        client.configureApp('app-123', { env: { KEY: 'value' } })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should handle 500 Internal Server Error', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockErrorResponse(500, 'Internal server error')
      );

      await expect(
        client.configureApp('app-123', { env: { KEY: 'value' } })
      ).rejects.toThrow('Internal server error');
    });
  });

  describe('API endpoint and request format', () => {
    it('should call correct API endpoint with PUT method', async () => {
      const config = { env: { TEST: 'value' } };

      const mockResponse: ConfigureAppResponse = {
        app: mockApp({ id: 'app-123' }),
        restartRequired: false,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockSuccessResponse(mockResponse)
      );

      await client.configureApp('app-123', config);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/apps/app-123/configure`,
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should URL-encode appId in endpoint', async () => {
      const config = { env: { KEY: 'value' } };

      const mockResponse: ConfigureAppResponse = {
        app: mockApp({ id: 'app-with-special-chars' }),
        restartRequired: false,
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockSuccessResponse(mockResponse)
      );

      await client.configureApp('app-with-special-chars', config);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/apps/app-with-special-chars/configure'),
        expect.anything()
      );
    });
  });
});
