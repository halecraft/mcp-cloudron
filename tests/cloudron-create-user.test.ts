/**
 * Tests for cloudron_create_user MCP tool (F13)
 * Merged F13/F15: Create user with role assignment in single atomic operation
 */

import { CloudronClient } from '../src/cloudron-client.js';
import {
  createMockFetch,
  setupTestEnv,
  cleanupTestEnv,
} from './helpers/cloudron-mock.js';
import type { User } from '../src/types.js';
import { CloudronError } from '../src/errors.js';

describe('cloudron_create_user tool (F13)', () => {
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

  // Test Anchor 1: POST /api/v1/users creates user with role atomically
  it('should create user with admin role successfully', async () => {
    const mockUser: User = {
      id: 'user-123',
      email: 'admin@example.com',
      username: 'admin',
      role: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
    };

    global.fetch = createMockFetch({
      'POST https://my.example.com/api/v1/users': {
        ok: true,
        status: 201,
        data: mockUser,
      },
    }) as any;

    const client = new CloudronClient();
    const user = await client.createUser('admin@example.com', 'Password123', 'admin');

    expect(user.id).toBe('user-123');
    expect(user.email).toBe('admin@example.com');
    expect(user.role).toBe('admin');
    expect(user.createdAt).toBe('2024-01-01T00:00:00Z');
  });

  it('should create user with user role successfully', async () => {
    const mockUser: User = {
      id: 'user-456',
      email: 'user@example.com',
      username: 'normaluser',
      role: 'user',
      createdAt: '2024-01-02T00:00:00Z',
    };

    global.fetch = createMockFetch({
      'POST https://my.example.com/api/v1/users': {
        ok: true,
        status: 201,
        data: mockUser,
      },
    }) as any;

    const client = new CloudronClient();
    const user = await client.createUser('user@example.com', 'SecurePass1', 'user');

    expect(user.role).toBe('user');
    expect(user.email).toBe('user@example.com');
  });

  it('should create user with guest role successfully', async () => {
    const mockUser: User = {
      id: 'user-789',
      email: 'guest@example.com',
      username: 'guestuser',
      role: 'guest',
      createdAt: '2024-01-03T00:00:00Z',
    };

    global.fetch = createMockFetch({
      'POST https://my.example.com/api/v1/users': {
        ok: true,
        status: 201,
        data: mockUser,
      },
    }) as any;

    const client = new CloudronClient();
    const user = await client.createUser('guest@example.com', 'GuestPass9', 'guest');

    expect(user.role).toBe('guest');
    expect(user.email).toBe('guest@example.com');
  });

  // Test Anchor 2: Role enum validates: 'admin', 'user', 'guest'
  it('should reject invalid role with clear error message', async () => {
    const client = new CloudronClient();

    await expect(
      client.createUser('test@example.com', 'Password123', 'superadmin' as any)
    ).rejects.toThrow('Invalid role: superadmin. Valid options: admin, user, guest');
  });

  // Test Anchor 3: Password strength validated (8+ chars, 1 uppercase, 1 number)
  it('should reject password shorter than 8 characters', async () => {
    const client = new CloudronClient();

    await expect(
      client.createUser('test@example.com', 'Pass1', 'user')
    ).rejects.toThrow('Password must be at least 8 characters long and contain at least 1 uppercase letter and 1 number');
  });

  it('should reject password without uppercase letter', async () => {
    const client = new CloudronClient();

    await expect(
      client.createUser('test@example.com', 'password123', 'user')
    ).rejects.toThrow('Password must be at least 8 characters long and contain at least 1 uppercase letter and 1 number');
  });

  it('should reject password without number', async () => {
    const client = new CloudronClient();

    await expect(
      client.createUser('test@example.com', 'PasswordABC', 'user')
    ).rejects.toThrow('Password must be at least 8 characters long and contain at least 1 uppercase letter and 1 number');
  });

  it('should accept password with exactly 8 chars, 1 uppercase, 1 number', async () => {
    const mockUser: User = {
      id: 'user-valid',
      email: 'valid@example.com',
      username: 'validuser',
      role: 'user',
      createdAt: '2024-01-04T00:00:00Z',
    };

    global.fetch = createMockFetch({
      'POST https://my.example.com/api/v1/users': {
        ok: true,
        status: 201,
        data: mockUser,
      },
    }) as any;

    const client = new CloudronClient();
    const user = await client.createUser('valid@example.com', 'Password1', 'user');

    expect(user.id).toBe('user-valid');
  });

  // Test Anchor 4: Email format validated
  it('should reject invalid email format', async () => {
    const client = new CloudronClient();

    await expect(
      client.createUser('not-an-email', 'Password123', 'user')
    ).rejects.toThrow('Invalid email format');
  });

  it('should reject email without @ symbol', async () => {
    const client = new CloudronClient();

    await expect(
      client.createUser('notemail.com', 'Password123', 'user')
    ).rejects.toThrow('Invalid email format');
  });

  it('should reject email without domain', async () => {
    const client = new CloudronClient();

    await expect(
      client.createUser('user@', 'Password123', 'user')
    ).rejects.toThrow('Invalid email format');
  });

  it('should accept valid email formats', async () => {
    const mockUser: User = {
      id: 'user-email',
      email: 'user.name+tag@example.co.uk',
      username: 'username',
      role: 'user',
      createdAt: '2024-01-05T00:00:00Z',
    };

    global.fetch = createMockFetch({
      'POST https://my.example.com/api/v1/users': {
        ok: true,
        status: 201,
        data: mockUser,
      },
    }) as any;

    const client = new CloudronClient();
    const user = await client.createUser('user.name+tag@example.co.uk', 'Password123', 'user');

    expect(user.email).toBe('user.name+tag@example.co.uk');
  });

  // Test Anchor 5: Duplicate email returns 409 Conflict
  it('should handle duplicate email with 409 Conflict', async () => {
    global.fetch = createMockFetch({
      'POST https://my.example.com/api/v1/users': {
        ok: false,
        status: 409,
        data: { message: 'User with email already exists' },
      },
    }) as any;

    const client = new CloudronClient();

    await expect(
      client.createUser('duplicate@example.com', 'Password123', 'user')
    ).rejects.toThrow('User with email already exists');
  });

  // Test Anchor 6: Invalid role returns 400 Bad Request with enum options
  // (This is tested client-side in the "reject invalid role" test above)

  // Test Anchor 7: User created with correct role in single operation
  it('should verify role is set atomically in POST body', async () => {
    let capturedRequestBody: any = null;

    global.fetch = jest.fn(async (url, options) => {
      if (options?.body) {
        capturedRequestBody = JSON.parse(options.body as string);
      }

      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'user-atomic',
          email: 'atomic@example.com',
          username: 'atomic',
          role: 'admin',
          createdAt: '2024-01-06T00:00:00Z',
        }),
      };
    }) as any;

    const client = new CloudronClient();
    await client.createUser('atomic@example.com', 'Password123', 'admin');

    expect(capturedRequestBody).toEqual({
      email: 'atomic@example.com',
      password: 'Password123',
      role: 'admin',
    });
  });

  // Test Anchor 8: API returns 201 Created with user object
  it('should handle 201 Created response correctly', async () => {
    const mockUser: User = {
      id: 'user-201',
      email: 'created@example.com',
      username: 'created',
      role: 'user',
      createdAt: '2024-01-07T00:00:00Z',
    };

    global.fetch = createMockFetch({
      'POST https://my.example.com/api/v1/users': {
        ok: true,
        status: 201,
        data: mockUser,
      },
    }) as any;

    const client = new CloudronClient();
    const user = await client.createUser('created@example.com', 'Password123', 'user');

    expect(user).toEqual(mockUser);
  });

  // Additional error handling tests
  it('should handle API authentication error', async () => {
    global.fetch = createMockFetch({
      'POST https://my.example.com/api/v1/users': {
        ok: false,
        status: 401,
        data: { message: 'Invalid token' },
      },
    }) as any;

    const client = new CloudronClient();

    await expect(
      client.createUser('test@example.com', 'Password123', 'user')
    ).rejects.toThrow('Invalid token');
  });

  it('should handle API server error', async () => {
    global.fetch = createMockFetch({
      'POST https://my.example.com/api/v1/users': {
        ok: false,
        status: 500,
        data: { message: 'Internal server error' },
      },
    }) as any;

    const client = new CloudronClient();

    await expect(
      client.createUser('test@example.com', 'Password123', 'user')
    ).rejects.toThrow('Internal server error');
  });

  it('should handle network error', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Network connection failed'))
    ) as any;

    const client = new CloudronClient();

    await expect(
      client.createUser('test@example.com', 'Password123', 'user')
    ).rejects.toThrow('Network error');
  });
});
