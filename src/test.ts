/**
 * Integration Test for CloudronClient
 * Tests against real Cloudron instance
 */

import { CloudronClient, CloudronError, isCloudronError } from './index';

async function runTests(): Promise<void> {
  console.log('=== Cloudron MCP Client Integration Test ===\n');

  // Check environment variables
  const baseUrl = process.env.CLOUDRON_BASE_URL;
  const token = process.env.CLOUDRON_API_TOKEN;

  if (!baseUrl || !token) {
    console.error('❌ Missing environment variables:');
    if (!baseUrl) console.error('   - CLOUDRON_BASE_URL not set');
    if (!token) console.error('   - CLOUDRON_API_TOKEN not set');
    console.error('\nSet these variables and run again.');
    process.exit(1);
  }

  console.log(`📡 Connecting to: ${baseUrl}\n`);

  try {
    // Create client
    const client = new CloudronClient();
    console.log('✅ Client created successfully\n');

    // Test 1: List Apps
    console.log('--- Test 1: listApps() ---');
    const apps = await client.listApps();
    console.log(`✅ Found ${apps.length} apps:`);

    for (const app of apps.slice(0, 5)) { // Show first 5
      const fqdn = app.location ? `${app.location}.${app.domain}` : app.domain;
      console.log(`   - ${app.manifest.title} (${fqdn})`);
      console.log(`     State: ${app.installationState}, Health: ${app.health}`);
    }

    if (apps.length > 5) {
      console.log(`   ... and ${apps.length - 5} more\n`);
    } else {
      console.log('');
    }

    // Test 2: Get Single App (if we have any apps)
    if (apps.length > 0) {
      const firstApp = apps[0];
      console.log(`--- Test 2: getApp('${firstApp.id}') ---`);

      const app = await client.getApp(firstApp.id);
      console.log(`✅ Retrieved app: ${app.manifest.title}`);
      console.log(`   ID: ${app.id}`);
      console.log(`   FQDN: ${app.fqdn}`);
      console.log(`   Memory: ${app.memoryLimit} bytes`);
      console.log(`   Created: ${app.creationTime}\n`);
    }

    // Test 3: Error handling - invalid app ID
    console.log('--- Test 3: Error Handling (invalid app ID) ---');
    try {
      await client.getApp('non-existent-app-id-12345');
      console.log('❌ Expected error but got success');
    } catch (error) {
      if (isCloudronError(error)) {
        console.log(`✅ Caught CloudronError as expected`);
        console.log(`   Message: ${error.message}`);
        console.log(`   Status: ${error.statusCode}`);
        console.log(`   Retryable: ${error.isRetryable()}\n`);
      } else {
        throw error;
      }
    }

    console.log('=== All Tests Passed! ===');

  } catch (error) {
    console.error('\n❌ Test Failed:');
    if (isCloudronError(error)) {
      console.error(`   CloudronError: ${error.message}`);
      console.error(`   Status: ${error.statusCode}`);
      console.error(`   Code: ${error.code}`);
    } else if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
    } else {
      console.error('   Unknown error:', error);
    }
    process.exit(1);
  }
}

runTests();
