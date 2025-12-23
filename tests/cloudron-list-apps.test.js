/**
 * Test cloudron_list_apps tool
 * Demonstrates testing pattern for MCP tools
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { CloudronClient } from '../src/cloudron-client';
import { mockApps, mockCloudronStatus, createMockFetch, setupTestEnv, cleanupTestEnv, } from './helpers/cloudron-mock';
import { assertValidMCPResponse, assertHasTextContent, assertSuccess, assertError, } from './helpers/mcp-assert';
describe('cloudron_list_apps tool', () => {
    let originalFetch;
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
    it('should list all installed apps successfully', async () => {
        // Mock API response
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/apps': {
                ok: true,
                status: 200,
                data: { apps: mockApps }
            }
        });
        // Create client and call method
        const client = new CloudronClient();
        const apps = await client.listApps();
        // Verify response structure
        expect(Array.isArray(apps)).toBe(true);
        expect(apps.length).toBe(3);
        // Verify app properties
        apps.forEach(app => {
            expect(app).toHaveProperty('id');
            expect(app).toHaveProperty('appStoreId');
            expect(app).toHaveProperty('installationState');
            expect(app).toHaveProperty('runState');
            expect(app).toHaveProperty('health');
            expect(app).toHaveProperty('location');
            expect(app).toHaveProperty('domain');
            expect(app).toHaveProperty('fqdn');
            expect(app).toHaveProperty('manifest');
        });
        // Verify specific app data
        expect(apps[0].id).toBe('app-1');
        expect(apps[0].manifest.title).toBe('WordPress');
        expect(apps[0].runState).toBe('running');
        expect(apps[0].health).toBe('healthy');
        expect(apps[1].id).toBe('app-2');
        expect(apps[1].manifest.title).toBe('Nextcloud');
        expect(apps[1].runState).toBe('stopped');
        expect(apps[2].id).toBe('app-3');
        expect(apps[2].manifest.title).toBe('GitLab');
        expect(apps[2].health).toBe('unhealthy');
    });
    it('should return empty array when no apps installed', async () => {
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/apps': {
                ok: true,
                status: 200,
                data: { apps: [] }
            }
        });
        const client = new CloudronClient();
        const apps = await client.listApps();
        expect(Array.isArray(apps)).toBe(true);
        expect(apps.length).toBe(0);
    });
    it('should handle API authentication error', async () => {
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/apps': {
                ok: false,
                status: 401,
                data: { message: 'Invalid API token' }
            }
        });
        const client = new CloudronClient();
        await expect(client.listApps()).rejects.toThrow('Invalid API token');
    });
    it('should handle API server error', async () => {
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/apps': {
                ok: false,
                status: 500,
                data: { message: 'Internal server error' }
            }
        });
        const client = new CloudronClient();
        await expect(client.listApps()).rejects.toThrow();
    });
    it('should handle network error', async () => {
        global.fetch = jest.fn(() => Promise.reject(new Error('Network connection failed')));
        const client = new CloudronClient();
        await expect(client.listApps()).rejects.toThrow('Network error');
    });
    it('should require CLOUDRON_BASE_URL', () => {
        const originalBaseUrl = process.env.CLOUDRON_BASE_URL;
        delete process.env.CLOUDRON_BASE_URL;
        expect(() => new CloudronClient()).toThrow('CLOUDRON_BASE_URL not set');
        process.env.CLOUDRON_BASE_URL = originalBaseUrl;
    });
    it('should require CLOUDRON_API_TOKEN', () => {
        const originalToken = process.env.CLOUDRON_API_TOKEN;
        delete process.env.CLOUDRON_API_TOKEN;
        expect(() => new CloudronClient()).toThrow('CLOUDRON_API_TOKEN not set');
        process.env.CLOUDRON_API_TOKEN = originalToken;
    });
});
//# sourceMappingURL=cloudron-list-apps.test.js.map