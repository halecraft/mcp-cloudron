/**
 * Test cloudron_task_status tool
 * F34: Track status of async operations (backup, install, restore)
 */
import { CloudronClient } from '../src/cloudron-client';
import { mockTaskStatusPending, mockTaskStatusRunning, mockTaskStatusSuccess, mockTaskStatusError, createMockFetch, setupTestEnv, cleanupTestEnv, } from './helpers/cloudron-mock';
describe('cloudron_task_status tool', () => {
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
    it('should get task status for pending task', async () => {
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/tasks/task-123': {
                ok: true,
                status: 200,
                data: mockTaskStatusPending
            }
        });
        const client = new CloudronClient();
        const taskStatus = await client.getTaskStatus('task-123');
        expect(taskStatus.id).toBe('task-123');
        expect(taskStatus.state).toBe('pending');
        expect(taskStatus.progress).toBe(0);
        expect(taskStatus.message).toBe('Task queued');
    });
    it('should get task status for running task', async () => {
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/tasks/task-123': {
                ok: true,
                status: 200,
                data: mockTaskStatusRunning
            }
        });
        const client = new CloudronClient();
        const taskStatus = await client.getTaskStatus('task-123');
        expect(taskStatus.id).toBe('task-123');
        expect(taskStatus.state).toBe('running');
        expect(taskStatus.progress).toBe(45);
        expect(taskStatus.message).toBe('Processing backup...');
    });
    it('should get task status for successful task with result data', async () => {
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/tasks/task-123': {
                ok: true,
                status: 200,
                data: mockTaskStatusSuccess
            }
        });
        const client = new CloudronClient();
        const taskStatus = await client.getTaskStatus('task-123');
        expect(taskStatus.id).toBe('task-123');
        expect(taskStatus.state).toBe('success');
        expect(taskStatus.progress).toBe(100);
        expect(taskStatus.message).toBe('Backup completed successfully');
        expect(taskStatus.result).toBeDefined();
        expect(taskStatus.result.backupId).toBe('backup-20241223-140000');
        expect(taskStatus.result.size).toBe(1024000000);
    });
    it('should get task status for failed task with error details', async () => {
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/tasks/task-123': {
                ok: true,
                status: 200,
                data: mockTaskStatusError
            }
        });
        const client = new CloudronClient();
        const taskStatus = await client.getTaskStatus('task-123');
        expect(taskStatus.id).toBe('task-123');
        expect(taskStatus.state).toBe('error');
        expect(taskStatus.progress).toBe(60);
        expect(taskStatus.message).toBe('Backup failed');
        expect(taskStatus.error).toBeDefined();
        expect(taskStatus.error?.message).toBe('Insufficient disk space');
        expect(taskStatus.error?.code).toBe('DISK_FULL');
    });
    it('should handle 404 for invalid task ID', async () => {
        global.fetch = createMockFetch({
            'GET https://my.example.com/api/v1/tasks/invalid-task': {
                ok: false,
                status: 404,
                data: { message: 'Task not found' }
            }
        });
        const client = new CloudronClient();
        await expect(client.getTaskStatus('invalid-task')).rejects.toThrow('Task not found');
    });
    it('should require taskId parameter', async () => {
        const client = new CloudronClient();
        await expect(client.getTaskStatus('')).rejects.toThrow('taskId is required');
    });
    it('should validate all task states', async () => {
        const states = ['pending', 'running', 'success', 'error'];
        for (const state of states) {
            let mockData;
            switch (state) {
                case 'pending':
                    mockData = mockTaskStatusPending;
                    break;
                case 'running':
                    mockData = mockTaskStatusRunning;
                    break;
                case 'success':
                    mockData = mockTaskStatusSuccess;
                    break;
                case 'error':
                    mockData = mockTaskStatusError;
                    break;
            }
            global.fetch = createMockFetch({
                'GET https://my.example.com/api/v1/tasks/task-123': {
                    ok: true,
                    status: 200,
                    data: mockData
                }
            });
            const client = new CloudronClient();
            const taskStatus = await client.getTaskStatus('task-123');
            expect(taskStatus.state).toBe(state);
            expect(taskStatus.progress).toBeGreaterThanOrEqual(0);
            expect(taskStatus.progress).toBeLessThanOrEqual(100);
        }
    });
});
//# sourceMappingURL=cloudron-task-status.test.js.map