/**
 * Mock Cloudron API responses for testing
 */
import { App, CloudronStatus, TaskStatus } from '../../src/types';
export declare const mockApps: App[];
export declare const mockCloudronStatus: CloudronStatus;
export declare const mockTaskStatusPending: TaskStatus;
export declare const mockTaskStatusRunning: TaskStatus;
export declare const mockTaskStatusSuccess: TaskStatus;
export declare const mockTaskStatusError: TaskStatus;
/**
 * Create a mock fetch implementation for testing
 */
export declare function createMockFetch(responses: Record<string, any>): any;
/**
 * Mock environment variables for testing
 */
export declare const mockEnv: {
    CLOUDRON_BASE_URL: string;
    CLOUDRON_API_TOKEN: string;
};
/**
 * Setup test environment
 */
export declare function setupTestEnv(): void;
/**
 * Cleanup test environment
 */
export declare function cleanupTestEnv(): void;
//# sourceMappingURL=cloudron-mock.d.ts.map