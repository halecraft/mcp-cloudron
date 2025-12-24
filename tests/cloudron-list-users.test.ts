/**
 * Tests for cloudron_list_users MCP tool (F12)
 */

import { CloudronClient } from '../src/cloudron-client.js';
import {
  createMockFetch,
  setupTestEnv,
  cleanupTestEnv,
} from './helpers/cloudron-mock.js';
import type { User } from '../src/types.js';

describe('cloudron_list_users tool', () => {
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

  it('should list all users successfully', async () => {
    const mockUsers: User[] = [
      {
        id: 'user-1',
        email: 'admin@example.com',
        username: 'admin',
        role: 'admin',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'user-2',
        email: 'user@example.com',
        username: 'testuser',
        role: 'user',
        createdAt: '2024-01-02T00:00:00Z',
      },
      {
        id: 'user-3',
        email: 'guest@example.com',
        username: 'guestuser',
        role: 'guest',
        createdAt: '2024-01-03T00:00:00Z',
      },
    ];

    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/users': {
        ok: true,
        status: 200,
        data: { users: mockUsers },
      },
    }) as any;

    const client = new CloudronClient();
    const users = await client.listUsers();

    expect(users).toHaveLength(3);
    expect(users[0].role).toBe('admin');
    expect(users[1].role).toBe('user');
    expect(users[2].role).toBe('guest');
    expect(users[0].email).toBe('admin@example.com');
  });

  it('should return empty array when no users exist', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/users': {
        ok: true,
        status: 200,
        data: { users: [] },
      },
    }) as any;

    const client = new CloudronClient();
    const users = await client.listUsers();

    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBe(0);
  });

  it('should sort users by role then email', async () => {
    const mockUsers: User[] = [
      {
        id: 'user-1',
        email: 'zebra@example.com',
        username: 'zebra',
        role: 'user',
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'user-2',
        email: 'admin2@example.com',
        username: 'admin2',
        role: 'admin',
        createdAt: '2024-01-02T00:00:00Z',
      },
      {
        id: 'user-3',
        email: 'admin1@example.com',
        username: 'admin1',
        role: 'admin',
        createdAt: '2024-01-03T00:00:00Z',
      },
      {
        id: 'user-4',
        email: 'apple@example.com',
        username: 'apple',
        role: 'user',
        createdAt: '2024-01-04T00:00:00Z',
      },
      {
        id: 'user-5',
        email: 'guest@example.com',
        username: 'guest',
        role: 'guest',
        createdAt: '2024-01-05T00:00:00Z',
      },
    ];

    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/users': {
        ok: true,
        status: 200,
        data: { users: mockUsers },
      },
    }) as any;

    const client = new CloudronClient();
    const users = await client.listUsers();

    // Should be sorted: admins (alphabetically), then users (alphabetically), then guests
    expect(users).toHaveLength(5);
    expect(users[0].email).toBe('admin1@example.com'); // admin, alphabetically first
    expect(users[1].email).toBe('admin2@example.com'); // admin, alphabetically second
    expect(users[2].email).toBe('apple@example.com'); // user, alphabetically first
    expect(users[3].email).toBe('zebra@example.com'); // user, alphabetically second
    expect(users[4].email).toBe('guest@example.com'); // guest
  });

  it('should handle API authentication error', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/users': {
        ok: false,
        status: 401,
        data: { message: 'Invalid token' },
      },
    }) as any;

    const client = new CloudronClient();

    await expect(client.listUsers()).rejects.toThrow('Invalid token');
  });

  it('should handle API server error', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/users': {
        ok: false,
        status: 500,
        data: { message: 'Internal server error' },
      },
    }) as any;

    const client = new CloudronClient();

    await expect(client.listUsers()).rejects.toThrow();
  });

  it('should handle network error', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Network connection failed'))
    ) as any;

    const client = new CloudronClient();

    await expect(client.listUsers()).rejects.toThrow('Network error');
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
