/**
 * Tests for cloudron_list_users MCP tool (F12)
 */

import { CloudronClient } from '../src/cloudron-client.js';
import { mockCloudronAPI, resetMockAPI } from './helpers/cloudron-mock.js';
import { assertMCPResponse } from './helpers/mcp-assert.js';
import type { User } from '../src/types.js';

describe('cloudron_list_users tool', () => {
  let client: CloudronClient;

  beforeEach(() => {
    resetMockAPI();
    client = new CloudronClient({
      baseUrl: 'https://test.cloudron.example',
      token: 'test-token',
    });
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

    mockCloudronAPI('GET', '/api/v1/users', 200, { users: mockUsers });

    const users = await client.listUsers();

    expect(users).toHaveLength(3);
    expect(users[0].role).toBe('admin');
    expect(users[1].role).toBe('user');
    expect(users[2].role).toBe('guest');
    expect(users[0].email).toBe('admin@example.com');
  });

  it('should return empty array when no users exist', async () => {
    mockCloudronAPI('GET', '/api/v1/users', 200, { users: [] });

    const users = await client.listUsers();

    expect(users).toEqual([]);
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

    mockCloudronAPI('GET', '/api/v1/users', 200, { users: mockUsers });

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
    mockCloudronAPI('GET', '/api/v1/users', 401, {
      message: 'Invalid token',
    });

    await expect(client.listUsers()).rejects.toThrow('Invalid token');
  });

  it('should handle API server error', async () => {
    mockCloudronAPI('GET', '/api/v1/users', 500, {
      message: 'Internal server error',
    });

    await expect(client.listUsers()).rejects.toThrow();
  });

  it('should handle network error', async () => {
    // Don't mock any response - will cause network error
    await expect(client.listUsers()).rejects.toThrow('Network error');
  });

  it('should require CLOUDRON_BASE_URL', () => {
    expect(() => {
      new CloudronClient({ token: 'test' });
    }).toThrow('CLOUDRON_BASE_URL not set');
  });

  it('should require CLOUDRON_API_TOKEN', () => {
    expect(() => {
      new CloudronClient({ baseUrl: 'https://test.example' });
    }).toThrow('CLOUDRON_API_TOKEN not set');
  });
});
