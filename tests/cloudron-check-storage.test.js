/**
 * Test cloudron_check_storage tool
 * Validates disk space checking with warning and critical thresholds
 */
import { CloudronClient } from '../src/cloudron-client';
import { mockCloudronStatus, createMockFetch, setupTestEnv, cleanupTestEnv, } from './helpers/cloudron-mock';
describe('cloudron_check_storage tool', () => {
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
    it('should return storage info without requiredMB parameter', async () => {
        // Mock API response with disk info
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/cloudron/status': {
                ok: true,
                status: 200,
                data: mockCloudronStatus
            }
        });
        const client = new CloudronClient();
        const storageInfo = await client.checkStorage();
        // Verify response structure
        expect(storageInfo).toHaveProperty('available_mb');
        expect(storageInfo).toHaveProperty('total_mb');
        expect(storageInfo).toHaveProperty('used_mb');
        expect(storageInfo).toHaveProperty('sufficient');
        expect(storageInfo).toHaveProperty('warning');
        expect(storageInfo).toHaveProperty('critical');
        // Verify calculations (mockCloudronStatus has 50% usage)
        // total: 107374182400 bytes = 102400 MB
        // used: 53687091200 bytes = 51200 MB
        // free: 53687091200 bytes = 51200 MB
        expect(storageInfo.total_mb).toBe(102400);
        expect(storageInfo.available_mb).toBe(51200);
        expect(storageInfo.used_mb).toBe(51200);
        expect(storageInfo.sufficient).toBe(true); // No requirement specified
        expect(storageInfo.warning).toBe(false); // 50% > 10%
        expect(storageInfo.critical).toBe(false); // 50% > 5%
    });
    it('should check if sufficient storage available when requiredMB provided', async () => {
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/cloudron/status': {
                ok: true,
                status: 200,
                data: mockCloudronStatus
            }
        });
        const client = new CloudronClient();
        // Test with requirement below available (should pass)
        const storageOk = await client.checkStorage(10000);
        expect(storageOk.sufficient).toBe(true);
        expect(storageOk.available_mb).toBeGreaterThanOrEqual(10000);
        // Test with requirement above available (should fail)
        const storageLow = await client.checkStorage(100000);
        expect(storageLow.sufficient).toBe(false);
        expect(storageLow.available_mb).toBeLessThan(100000);
    });
    it('should detect warning threshold (< 10% available)', async () => {
        // Create mock with low disk space (8% available)
        const lowDiskStatus = {
            ...mockCloudronStatus,
            disk: {
                total: 107374182400, // 102400 MB
                used: 98933309440, // 94310 MB (92% used)
                free: 8440872960, // 8050 MB (8% free)
                percent: 92
            }
        };
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/cloudron/status': {
                ok: true,
                status: 200,
                data: lowDiskStatus
            }
        });
        const client = new CloudronClient();
        const storageInfo = await client.checkStorage();
        // 8% < 10% threshold
        expect(storageInfo.warning).toBe(true);
        expect(storageInfo.critical).toBe(false);
        expect(storageInfo.available_mb).toBeLessThan(storageInfo.total_mb * 0.1);
    });
    it('should detect critical threshold (< 5% available)', async () => {
        // Create mock with critically low disk space (3% available)
        const criticalDiskStatus = {
            ...mockCloudronStatus,
            disk: {
                total: 107374182400, // 102400 MB
                used: 104189837312, // 99328 MB (97% used)
                free: 3184345088, // 3037 MB (3% free)
                percent: 97
            }
        };
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/cloudron/status': {
                ok: true,
                status: 200,
                data: criticalDiskStatus
            }
        });
        const client = new CloudronClient();
        const storageInfo = await client.checkStorage();
        // 3% < 5% threshold
        expect(storageInfo.critical).toBe(true);
        expect(storageInfo.warning).toBe(true); // Critical implies warning
        expect(storageInfo.available_mb).toBeLessThan(storageInfo.total_mb * 0.05);
    });
    it('should handle API response without disk info', async () => {
        // Mock status without disk field
        const noDiskStatus = {
            version: '8.0.2',
            apiServerOrigin: 'https://api.example.com',
            adminFqdn: 'my.example.com',
            provider: 'digitalocean',
            cloudronName: 'My Cloudron',
            isDemo: false
        };
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/cloudron/status': {
                ok: true,
                status: 200,
                data: noDiskStatus
            }
        });
        const client = new CloudronClient();
        await expect(client.checkStorage()).rejects.toThrow('Disk information not available');
    });
    it('should handle API authentication error', async () => {
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/cloudron/status': {
                ok: false,
                status: 401,
                data: { message: 'Invalid API token' }
            }
        });
        const client = new CloudronClient();
        await expect(client.checkStorage()).rejects.toThrow('Invalid API token');
    });
    it('should handle API server error', async () => {
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/cloudron/status': {
                ok: false,
                status: 500,
                data: { message: 'Internal server error' }
            }
        });
        const client = new CloudronClient();
        await expect(client.checkStorage()).rejects.toThrow();
    });
    it('should handle network error', async () => {
        global.fetch = jest.fn(() => Promise.reject(new Error('Network connection failed')));
        const client = new CloudronClient();
        await expect(client.checkStorage()).rejects.toThrow('Network error');
    });
});
//# sourceMappingURL=cloudron-check-storage.test.js.map