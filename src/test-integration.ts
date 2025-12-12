/**
 * Cloudron MCP Integration Test Suite
 * Tests the three implemented tools against a real Cloudron instance
 *
 * Prerequisites:
 * - CLOUDRON_BASE_URL environment variable set
 * - CLOUDRON_API_TOKEN environment variable set
 * - Cloudron instance must be accessible
 */

import { CloudronClient } from './cloudron-client.js';
import type { CloudronClientConfig } from './types.js';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: string, ...args: unknown[]): void {
  console.log(`${color}${new Date().toISOString()}${colors.reset}`, ...args);
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    log(colors.cyan, `▶ Testing: ${name}`);
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    log(colors.green, `✓ PASSED (${duration}ms): ${name}`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration, error: errorMsg });
    log(colors.red, `✗ FAILED (${duration}ms): ${name}`);
    log(colors.red, `  Error: ${errorMsg}`);
  }
}

async function main(): Promise<void> {
  log(colors.bright, '╔════════════════════════════════════════╗');
  log(colors.bright, '║  Cloudron MCP Integration Tests        ║');
  log(colors.bright, '║  Phase 2.3: Real Instance Testing      ║');
  log(colors.bright, '╚════════════════════════════════════════╝');
  console.log();

  // Check for required environment variables
  const baseUrl = process.env.CLOUDRON_BASE_URL;
  const token = process.env.CLOUDRON_API_TOKEN;

  if (!baseUrl || !token) {
    log(
      colors.red,
      'ERROR: Missing required environment variables'
    );
    console.log();
    log(colors.yellow, 'Required environment variables:');
    console.log('  CLOUDRON_BASE_URL - Base URL of Cloudron instance');
    console.log('  CLOUDRON_API_TOKEN - API token with read/write permissions');
    console.log();
    log(colors.yellow, 'Example:');
    console.log(
      '  export CLOUDRON_BASE_URL="https://my.serenichron.com"'
    );
    console.log('  export CLOUDRON_API_TOKEN="your-api-token-here"');
    console.log('  npm run dev test-integration.ts');
    console.log();
    process.exit(1);
  }

  log(colors.bright, 'Configuration:');
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  Token: ${token.substring(0, 10)}...`);
  console.log();

  // Initialize client
  let client: CloudronClient;
  try {
    const config: CloudronClientConfig = {
      baseUrl,
      token,
      timeout: 30000,
      retryAttempts: 2,
    };
    client = new CloudronClient(config);
    log(colors.green, '✓ Client initialized successfully');
  } catch (error) {
    log(colors.red, '✗ Failed to initialize client');
    log(colors.red, String(error));
    process.exit(1);
  }

  console.log();
  log(colors.bright, '════════════════════════════════════════');
  log(colors.bright, 'Running Tests');
  log(colors.bright, '════════════════════════════════════════');
  console.log();

  // Test 1: Connection validation
  await runTest('Connection Validation', async () => {
    await client.validateConnection();
  });

  // Test 2: Get system status
  await runTest('Get System Status', async () => {
    const status = await client.getStatus({});
    if (!status.version) {
      throw new Error('Status response missing version field');
    }
    log(colors.blue, `  Version: ${status.version}`);
    if (status.uptime) {
      log(colors.blue, `  Uptime: ${Math.floor(status.uptime / 3600)} hours`);
    }
  });

  // Test 3: List applications
  await runTest('List Applications', async () => {
    const apps = await client.listApps({});
    log(colors.blue, `  Found ${apps.length} application(s)`);

    if (apps.length > 0) {
      // Show first 3 apps
      const displayApps = apps.slice(0, 3);
      displayApps.forEach((app) => {
        log(colors.blue, `    - ${app.name} (${app.id}) [${app.status}]`);
      });
      if (apps.length > 3) {
        log(colors.blue, `    ... and ${apps.length - 3} more`);
      }
    }
  });

  // Test 4: Restart app (only if we have apps, and only the first one for safety)
  await runTest('Restart Application (Safety Test)', async () => {
    const apps = await client.listApps({});

    if (apps.length === 0) {
      log(colors.yellow, '  Skipped: No applications found to restart');
      throw new Error('SKIP');
    }

    const targetApp = apps[0];
    log(colors.yellow, `  ⚠  Attempting to restart: ${targetApp.name} (${targetApp.id})`);

    // Safety confirmation - in real test, this would be interactive
    log(colors.yellow, '  Note: In production, this would require confirmation');

    try {
      await client.restartApp({ appId: targetApp.id });
      log(colors.green, `  Restart initiated for ${targetApp.name}`);
    } catch (error) {
      // Restart might fail if app is already restarting, which is OK
      if ((error as Error).message.includes('already')) {
        log(colors.yellow, `  Note: ${(error as Error).message}`);
      } else {
        throw error;
      }
    }
  });

  // Summary
  console.log();
  log(colors.bright, '════════════════════════════════════════');
  log(colors.bright, 'Test Summary');
  log(colors.bright, '════════════════════════════════════════');
  console.log();

  const passed = results.filter((r) => r.passed && r.error !== 'SKIP').length;
  const failed = results.filter((r) => !r.passed && r.error !== 'SKIP').length;
  const skipped = results.filter((r) => r.error === 'SKIP').length;
  const total = results.length;

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  results.forEach((result) => {
    if (result.error === 'SKIP') {
      log(colors.yellow, `⊘ SKIPPED: ${result.name} (${result.duration}ms)`);
    } else if (result.passed) {
      log(colors.green, `✓ ${result.name} (${result.duration}ms)`);
    } else {
      log(colors.red, `✗ ${result.name} (${result.duration}ms)`);
      log(colors.red, `  → ${result.error}`);
    }
  });

  console.log();
  log(
    colors.bright,
    `Results: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}, ${colors.yellow}${skipped} skipped${colors.reset} / ${total} total`
  );
  log(colors.bright, `Total Duration: ${totalDuration}ms`);
  console.log();

  if (failed > 0) {
    log(colors.red, 'FAILED: Some tests did not pass');
    process.exit(1);
  } else {
    log(colors.green, 'SUCCESS: All tests passed!');
    process.exit(0);
  }
}

main().catch((error) => {
  log(colors.red, 'Unexpected error:');
  console.error(error);
  process.exit(1);
});
