/**
 * Test cloudron_search_apps tool
 * F22: Search Cloudron App Store for available applications
 */

import { CloudronClient } from '../src/cloudron-client';
import {
  createMockFetch,
  setupTestEnv,
  cleanupTestEnv,
} from './helpers/cloudron-mock';

// Mock App Store data
const mockAppStoreApps = [
  {
    id: 'io.wordpress.cloudronapp',
    name: 'WordPress',
    description: 'Open source blogging and content management platform',
    version: '6.4.2',
    iconUrl: 'https://cloudron.io/img/apps/wordpress.png',
    installCount: 15420,
    relevanceScore: 0.95,
  },
  {
    id: 'io.nextcloud.cloudronapp',
    name: 'Nextcloud',
    description: 'Self-hosted file sync and share platform',
    version: '28.0.1',
    iconUrl: 'https://cloudron.io/img/apps/nextcloud.png',
    installCount: 12350,
    relevanceScore: 0.88,
  },
  {
    id: 'io.gitlab.cloudronapp',
    name: 'GitLab',
    description: 'Complete DevOps platform delivered as a single application',
    version: '16.8.0',
    iconUrl: 'https://cloudron.io/img/apps/gitlab.png',
    installCount: 8920,
    relevanceScore: 0.72,
  },
];

describe('cloudron_search_apps tool', () => {
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

  it('should search apps with query and return sorted results', async () => {
    // Mock API response
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/appstore?search=wordpress': {
        ok: true,
        status: 200,
        data: { apps: [mockAppStoreApps[0]] }
      }
    }) as any;

    // Create client and call method
    const client = new CloudronClient();
    const apps = await client.searchApps('wordpress');

    // Verify response structure
    expect(Array.isArray(apps)).toBe(true);
    expect(apps.length).toBe(1);

    // Verify app properties
    expect(apps[0]).toHaveProperty('id');
    expect(apps[0]).toHaveProperty('name');
    expect(apps[0]).toHaveProperty('description');
    expect(apps[0]).toHaveProperty('version');
    expect(apps[0]).toHaveProperty('iconUrl');
    expect(apps[0]).toHaveProperty('installCount');
    expect(apps[0]).toHaveProperty('relevanceScore');

    // Verify specific data
    expect(apps[0].id).toBe('io.wordpress.cloudronapp');
    expect(apps[0].name).toBe('WordPress');
    expect(apps[0].installCount).toBe(15420);
    expect(apps[0].relevanceScore).toBe(0.95);
  });

  it('should return all apps when query is empty', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/appstore': {
        ok: true,
        status: 200,
        data: { apps: mockAppStoreApps }
      }
    }) as any;

    const client = new CloudronClient();
    const apps = await client.searchApps();

    expect(Array.isArray(apps)).toBe(true);
    expect(apps.length).toBe(3);

    // Verify sorted by relevance score (highest first)
    expect(apps[0].relevanceScore).toBeGreaterThanOrEqual(apps[1].relevanceScore!);
    expect(apps[1].relevanceScore).toBeGreaterThanOrEqual(apps[2].relevanceScore!);
  });

  it('should return empty array when no results found', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/appstore?search=nonexistent': {
        ok: true,
        status: 200,
        data: { apps: [] }
      }
    }) as any;

    const client = new CloudronClient();
    const apps = await client.searchApps('nonexistent');

    expect(Array.isArray(apps)).toBe(true);
    expect(apps.length).toBe(0);
  });

  it('should sort results by relevance score descending', async () => {
    // Create unsorted apps
    const unsortedApps = [
      { ...mockAppStoreApps[2], relevanceScore: 0.5 },
      { ...mockAppStoreApps[0], relevanceScore: 0.9 },
      { ...mockAppStoreApps[1], relevanceScore: 0.7 },
    ];

    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/appstore?search=test': {
        ok: true,
        status: 200,
        data: { apps: unsortedApps }
      }
    }) as any;

    const client = new CloudronClient();
    const apps = await client.searchApps('test');

    // Verify sorted by relevance score (highest first)
    expect(apps[0].relevanceScore).toBe(0.9);
    expect(apps[1].relevanceScore).toBe(0.7);
    expect(apps[2].relevanceScore).toBe(0.5);
  });

  it('should handle apps with missing optional fields', async () => {
    const minimalApp = {
      id: 'io.minimal.cloudronapp',
      name: 'Minimal App',
      description: 'Minimal app for testing',
      version: '1.0.0',
      iconUrl: null,
    };

    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/appstore?search=minimal': {
        ok: true,
        status: 200,
        data: { apps: [minimalApp] }
      }
    }) as any;

    const client = new CloudronClient();
    const apps = await client.searchApps('minimal');

    expect(apps.length).toBe(1);
    expect(apps[0].iconUrl).toBeNull();
    expect(apps[0].installCount).toBeUndefined();
    expect(apps[0].relevanceScore).toBeUndefined();
  });

  it('should handle API authentication error', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/appstore': {
        ok: false,
        status: 401,
        data: { message: 'Invalid API token' }
      }
    }) as any;

    const client = new CloudronClient();

    await expect(client.searchApps()).rejects.toThrow('Invalid API token');
  });

  it('should handle API server error', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/appstore?search=test': {
        ok: false,
        status: 500,
        data: { message: 'Internal server error' }
      }
    }) as any;

    const client = new CloudronClient();

    await expect(client.searchApps('test')).rejects.toThrow();
  });

  it('should encode query parameter correctly', async () => {
    const specialQuery = 'word press & next cloud';
    const encodedQuery = encodeURIComponent(specialQuery);

    global.fetch = createMockFetch({
      [`GET https://my.example.com/api/v1/appstore?search=${encodedQuery}`]: {
        ok: true,
        status: 200,
        data: { apps: [] }
      }
    }) as any;

    const client = new CloudronClient();
    const apps = await client.searchApps(specialQuery);

    expect(Array.isArray(apps)).toBe(true);
  });
});
