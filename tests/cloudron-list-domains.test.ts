/**
 * Tests for cloudron_list_domains tool (F38)
 * Validates GET /api/v1/domains endpoint
 */

import { CloudronClient } from '../src/cloudron-client.js';
import {
  createMockFetch,
  setupTestEnv,
  cleanupTestEnv,
} from './helpers/cloudron-mock.js';
import type { Domain } from '../src/types.js';
import { CloudronError } from '../src/errors.js';

describe('cloudron_list_domains tool (F38)', () => {
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

  // Test Anchor 1: GET /api/v1/domains returns domain list
  it('should list domains successfully', async () => {
    const mockDomains: Domain[] = [
      {
        domain: 'example.com',
        zoneName: 'example.com',
        provider: 'cloudflare',
        config: {
          tokenType: 'GlobalApiKey',
          email: 'admin@example.com',
        },
        tlsConfig: {
          provider: 'letsencrypt-prod',
          wildcard: true,
        },
        wellKnown: null,
        fallbackCertificate: {
          cert: '-----BEGIN CERTIFICATE-----\ntest-cert\n-----END CERTIFICATE-----\n',
        },
      },
      {
        domain: 'staging.example.com',
        zoneName: 'example.com',
        provider: 'manual',
        config: {},
        tlsConfig: {
          provider: 'letsencrypt-prod',
          wildcard: false,
        },
        wellKnown: null,
        fallbackCertificate: {
          cert: '-----BEGIN CERTIFICATE-----\ntest-cert-2\n-----END CERTIFICATE-----\n',
        },
      },
    ];

    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/domains': {
        ok: true,
        status: 200,
        data: { domains: mockDomains },
      },
    }) as any;

    const client = new CloudronClient();
    const domains = await client.listDomains();

    expect(domains).toHaveLength(2);
    expect(domains[0].domain).toBe('example.com');
    expect(domains[0].provider).toBe('cloudflare');
    expect(domains[0].tlsConfig.wildcard).toBe(true);
    expect(domains[1].domain).toBe('staging.example.com');
    expect(domains[1].provider).toBe('manual');
    expect(domains[1].tlsConfig.wildcard).toBe(false);
  });

  // Test Anchor 2: Empty domain list returns []
  it('should handle empty domain list', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/domains': {
        ok: true,
        status: 200,
        data: { domains: [] },
      },
    }) as any;

    const client = new CloudronClient();
    const domains = await client.listDomains();

    expect(domains).toEqual([]);
  });

  // Test Anchor 3: TLS configuration fields present
  it('should include TLS configuration fields', async () => {
    const mockDomains: Domain[] = [
      {
        domain: 'test.com',
        zoneName: 'test.com',
        provider: 'cloudflare',
        config: {},
        tlsConfig: {
          provider: 'letsencrypt-prod',
          wildcard: true,
        },
        wellKnown: null,
        fallbackCertificate: {
          cert: 'test-cert',
        },
      },
    ];

    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/domains': {
        ok: true,
        status: 200,
        data: { domains: mockDomains },
      },
    }) as any;

    const client = new CloudronClient();
    const domains = await client.listDomains();

    expect(domains[0].tlsConfig).toBeDefined();
    expect(domains[0].tlsConfig.provider).toBe('letsencrypt-prod');
    expect(domains[0].tlsConfig.wildcard).toBe(true);
  });

  // Test Anchor 4: Multiple domains with different providers
  it('should handle multiple providers', async () => {
    const mockDomains: Domain[] = [
      {
        domain: 'cloudflare.example.com',
        zoneName: 'example.com',
        provider: 'cloudflare',
        config: { tokenType: 'GlobalApiKey' },
        tlsConfig: { provider: 'letsencrypt-prod', wildcard: true },
        wellKnown: null,
        fallbackCertificate: { cert: 'cert1' },
      },
      {
        domain: 'manual.example.com',
        zoneName: 'example.com',
        provider: 'manual',
        config: {},
        tlsConfig: { provider: 'letsencrypt-prod', wildcard: false },
        wellKnown: null,
        fallbackCertificate: { cert: 'cert2' },
      },
    ];

    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/domains': {
        ok: true,
        status: 200,
        data: { domains: mockDomains },
      },
    }) as any;

    const client = new CloudronClient();
    const domains = await client.listDomains();

    const providers = domains.map(d => d.provider);
    expect(providers).toContain('cloudflare');
    expect(providers).toContain('manual');
  });

  // Test Anchor 5: Authentication errors return 401
  it('should handle API authentication error', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/domains': {
        ok: false,
        status: 401,
        data: { message: 'Unauthorized' },
      },
    }) as any;

    const client = new CloudronClient();
    await expect(client.listDomains()).rejects.toThrow();
  });

  // Test Anchor 6: Server errors return 500
  it('should handle API server error', async () => {
    global.fetch = createMockFetch({
      'GET https://my.example.com/api/v1/domains': {
        ok: false,
        status: 500,
        data: { message: 'Internal Server Error' },
      },
    }) as any;

    const client = new CloudronClient();
    await expect(client.listDomains()).rejects.toThrow();
  });
});
