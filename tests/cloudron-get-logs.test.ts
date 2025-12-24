/**
 * Test Suite: cloudron_get_logs (F06 - merged F06/F30)
 * Validates app and service log retrieval with type parameter
 *
 * Test Anchors (from domain memory F06):
 * - Type 'app' calls GET /api/v1/apps/:id/logs
 * - Type 'service' calls GET /api/v1/services/:id/logs
 * - Lines parameter limits output (default 100, max 1000)
 * - Invalid resourceId returns 404 Not Found
 * - Invalid type returns 400 Bad Request with enum options
 * - Logs formatted with timestamps and severity levels
 * - API failure returns error with details
 */

import { CloudronClient } from '../src/cloudron-client.js';
import { CloudronError } from '../src/errors.js';
import { mockSuccessResponse, mockErrorResponse } from './helpers/cloudron-mock.js';
import type { LogEntry } from '../src/types.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('cloudron_get_logs (F06)', () => {
  let client: CloudronClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new CloudronClient({
      baseUrl: 'https://test.cloudron.io',
      token: 'test-token',
    });
  });

  describe('App logs (type: "app")', () => {
    it('should retrieve app logs with default lines (100)', async () => {
      const mockLogs = {
        logs: [
          '2025-12-24T12:00:00Z [INFO] Application started',
          '2025-12-24T12:01:00Z [WARN] Memory usage high',
          '2025-12-24T12:02:00Z [ERROR] Connection failed',
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      const result = await client.getLogs('app-123', 'app');

      expect(fetch).toHaveBeenCalledWith(
        'https://test.cloudron.io/api/v1/apps/app-123/logs?lines=100',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        timestamp: '2025-12-24T12:00:00Z',
        severity: 'INFO',
        message: 'Application started',
      });
      expect(result[1]).toEqual({
        timestamp: '2025-12-24T12:01:00Z',
        severity: 'WARN',
        message: 'Memory usage high',
      });
      expect(result[2]).toEqual({
        timestamp: '2025-12-24T12:02:00Z',
        severity: 'ERROR',
        message: 'Connection failed',
      });
    });

    it('should retrieve app logs with custom lines parameter', async () => {
      const mockLogs = {
        logs: [
          '2025-12-24T12:00:00Z [INFO] Log entry 1',
          '2025-12-24T12:01:00Z [INFO] Log entry 2',
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      await client.getLogs('app-123', 'app', 50);

      expect(fetch).toHaveBeenCalledWith(
        'https://test.cloudron.io/api/v1/apps/app-123/logs?lines=50',
        expect.any(Object)
      );
    });

    it('should clamp lines parameter to max 1000', async () => {
      const mockLogs = { logs: [] };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      await client.getLogs('app-123', 'app', 5000);

      expect(fetch).toHaveBeenCalledWith(
        'https://test.cloudron.io/api/v1/apps/app-123/logs?lines=1000',
        expect.any(Object)
      );
    });

    it('should clamp lines parameter to min 1', async () => {
      const mockLogs = { logs: [] };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      await client.getLogs('app-123', 'app', 0);

      expect(fetch).toHaveBeenCalledWith(
        'https://test.cloudron.io/api/v1/apps/app-123/logs?lines=1',
        expect.any(Object)
      );
    });
  });

  describe('Service logs (type: "service")', () => {
    it('should retrieve service logs', async () => {
      const mockLogs = {
        logs: [
          'Dec 24 12:00:00 cloudron nginx[1234]: [INFO] Service started',
          'Dec 24 12:01:00 cloudron nginx[1234]: [ERROR] Port binding failed',
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      const result = await client.getLogs('nginx', 'service', 200);

      expect(fetch).toHaveBeenCalledWith(
        'https://test.cloudron.io/api/v1/services/nginx/logs?lines=200',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0].severity).toBe('INFO');
      expect(result[0].message).toBe('Service started');
      expect(result[1].severity).toBe('ERROR');
      expect(result[1].message).toBe('Port binding failed');
    });
  });

  describe('Log parsing formats', () => {
    it('should parse ISO timestamp format', async () => {
      const mockLogs = {
        logs: ['2025-12-24T12:00:00.123Z [DEBUG] Debug message'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      const result = await client.getLogs('app-123', 'app');

      expect(result[0]).toEqual({
        timestamp: '2025-12-24T12:00:00.123Z',
        severity: 'DEBUG',
        message: 'Debug message',
      });
    });

    it('should parse syslog format', async () => {
      const mockLogs = {
        logs: ['Dec 24 12:00:00 host service[1234]: [INFO] Syslog message'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      const result = await client.getLogs('app-123', 'app');

      expect(result[0].timestamp).toBe('Dec 24 12:00:00');
      expect(result[0].severity).toBe('INFO');
      expect(result[0].message).toBe('Syslog message');
    });

    it('should parse simple bracket format', async () => {
      const mockLogs = {
        logs: ['[WARN] Simple warning message'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      const result = await client.getLogs('app-123', 'app');

      expect(result[0].severity).toBe('WARN');
      expect(result[0].message).toBe('Simple warning message');
      // Timestamp should be current time (ISO format)
      expect(result[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle plain text logs without severity', async () => {
      const mockLogs = {
        logs: ['Plain text log entry without formatting'],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      const result = await client.getLogs('app-123', 'app');

      expect(result[0].severity).toBe('INFO'); // Default severity
      expect(result[0].message).toBe('Plain text log entry without formatting');
      expect(result[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle empty logs array', async () => {
      const mockLogs = { logs: [] };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      const result = await client.getLogs('app-123', 'app');

      expect(result).toEqual([]);
    });

    it('should handle missing logs field', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse({}));

      const result = await client.getLogs('app-123', 'app');

      expect(result).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should return 404 for invalid app ID', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockErrorResponse(404, 'App not found'));

      await expect(client.getLogs('invalid-app', 'app')).rejects.toThrow('App not found');
    });

    it('should return 404 for invalid service ID', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockErrorResponse(404, 'Service not found'));

      await expect(client.getLogs('invalid-service', 'service')).rejects.toThrow('Service not found');
    });

    it('should reject invalid type parameter', async () => {
      await expect(
        client.getLogs('app-123', 'invalid' as any)
      ).rejects.toThrow('Invalid type: invalid. Valid options: app, service');
    });

    it('should require resourceId parameter', async () => {
      await expect(client.getLogs('', 'app')).rejects.toThrow('resourceId is required');
    });

    it('should handle authentication errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockErrorResponse(401, 'Invalid token'));

      await expect(client.getLogs('app-123', 'app')).rejects.toThrow('Invalid token');
    });

    it('should handle server errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockErrorResponse(500, 'Internal server error'));

      await expect(client.getLogs('app-123', 'app')).rejects.toThrow('Internal server error');
    });
  });

  describe('URL encoding', () => {
    it('should properly encode app IDs with special characters', async () => {
      const mockLogs = { logs: ['Log entry'] };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      await client.getLogs('app/with/slashes', 'app');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('app%2Fwith%2Fslashes'),
        expect.any(Object)
      );
    });

    it('should properly encode service names with special characters', async () => {
      const mockLogs = { logs: ['Log entry'] };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockSuccessResponse(mockLogs));

      await client.getLogs('service name with spaces', 'service');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('service%20name%20with%20spaces'),
        expect.any(Object)
      );
    });
  });
});
