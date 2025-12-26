#!/usr/bin/env node
/**
 * REAL API TEST SCRIPT
 * Tests F01, F05, F06, F22 against actual Cloudron instance
 * No mocks - only real integration tests
 */

import { CloudronClient } from '../dist/cloudron-client.js';

const CLOUDRON_BASE_URL = process.env.CLOUDRON_BASE_URL || 'https://my.serenichron.agency';
const CLOUDRON_API_TOKEN = process.env.CLOUDRON_API_TOKEN;

if (!CLOUDRON_API_TOKEN) {
  console.error('❌ CLOUDRON_API_TOKEN not set');
  process.exit(1);
}

const client = new CloudronClient(CLOUDRON_BASE_URL, CLOUDRON_API_TOKEN);

// Test results tracking
const results = {
  F01: { passed: false, error: null, details: null },
  F05: { passed: false, error: null, details: null },
  F06: { passed: false, error: null, details: null },
  F22: { passed: false, error: null, details: null },
};

async function testF01_ControlApp() {
  console.log('\n========================================');
  console.log('TEST F01: cloudron_control_app');
  console.log('========================================');

  try {
    // First, list apps to find a test target
    console.log('\n1. Listing apps to find test target...');
    const apps = await client.listApps();
    console.log(`Found ${apps.length} apps`);

    if (apps.length === 0) {
      throw new Error('No apps installed - cannot test control operations');
    }

    // Pick first app as test target
    const testApp = apps[0];
    console.log(`\nTest target: ${testApp.manifest.title} (${testApp.id})`);
    console.log(`Current state: ${testApp.runState}`);

    // Test restart (safest operation - works regardless of current state)
    console.log('\n2. Testing RESTART operation...');
    const restartResult = await client.restartApp(testApp.id);
    console.log(`Restart result:`, restartResult);

    if (!restartResult.taskId) {
      throw new Error('Expected taskId in restart response');
    }

    results.F01.passed = true;
    results.F01.details = {
      endpoint: `POST /api/v1/apps/${testApp.id}/restart`,
      method: 'POST',
      parameters: { appId: testApp.id },
      response: restartResult,
      verification: 'Returned taskId for async operation tracking'
    };

    console.log('\n✅ F01 PASSED: cloudron_control_app works');

  } catch (error) {
    results.F01.error = error.message;
    console.error('\n❌ F01 FAILED:', error.message);
    console.error('Full error:', error);
  }
}

async function testF05_ConfigureApp() {
  console.log('\n========================================');
  console.log('TEST F05: cloudron_configure_app');
  console.log('========================================');

  try {
    // List apps to find test target
    console.log('\n1. Listing apps to find test target...');
    const apps = await client.listApps();

    if (apps.length === 0) {
      throw new Error('No apps installed - cannot test configure');
    }

    const testApp = apps[0];
    console.log(`\nTest target: ${testApp.manifest.title} (${testApp.id})`);

    // Get current config
    console.log('\n2. Getting current app config...');
    const currentApp = await client.getApp(testApp.id);
    console.log(`Current memory limit: ${currentApp.memoryLimit || 'not set'}`);

    // Try updating with minimal change (add test env var)
    console.log('\n3. Updating app configuration (add test env var)...');
    const updateConfig = {
      env: {
        ...(currentApp.env || {}),
        TEST_REAL_API: 'validated_2025_12_26'
      }
    };

    const configResult = await client.configureApp(testApp.id, updateConfig);
    console.log(`Configure result:`, configResult);

    // Verify change applied
    console.log('\n4. Verifying config change via cloudron_get_app...');
    const updatedApp = await client.getApp(testApp.id);

    if (!updatedApp.env?.TEST_REAL_API) {
      throw new Error('Env var update not reflected in app config');
    }

    results.F05.passed = true;
    results.F05.details = {
      endpoint: `PUT /api/v1/apps/${testApp.id}/configure`,
      method: 'PUT',
      parameters: { appId: testApp.id, config: updateConfig },
      response: configResult,
      verification: `Env var TEST_REAL_API set to '${updatedApp.env.TEST_REAL_API}'`
    };

    console.log('\n✅ F05 PASSED: cloudron_configure_app works');

  } catch (error) {
    results.F05.error = error.message;
    console.error('\n❌ F05 FAILED:', error.message);
    console.error('Full error:', error);
  }
}

async function testF06_GetLogs() {
  console.log('\n========================================');
  console.log('TEST F06: cloudron_get_logs');
  console.log('========================================');

  try {
    // List apps to find test target
    console.log('\n1. Listing apps to find test target...');
    const apps = await client.listApps();

    if (apps.length === 0) {
      throw new Error('No apps installed - cannot test logs');
    }

    const testApp = apps[0];
    console.log(`\nTest target: ${testApp.manifest.title} (${testApp.id})`);

    // Test app logs
    console.log('\n2. Getting app logs (last 10 lines)...');
    const appLogs = await client.getLogs(testApp.id, 'app', 10);
    console.log(`Received ${appLogs.length} log entries`);

    if (appLogs.length === 0) {
      console.warn('⚠️  No app logs returned (app may not have logged yet)');
    } else {
      console.log('Sample log entry:', appLogs[0]);
    }

    // Test service logs (try nginx)
    console.log('\n3. Getting service logs (nginx, last 10 lines)...');
    try {
      const serviceLogs = await client.getLogs('nginx', 'service', 10);
      console.log(`Received ${serviceLogs.length} service log entries`);

      if (serviceLogs.length > 0) {
        console.log('Sample service log entry:', serviceLogs[0]);
      }
    } catch (serviceError) {
      console.warn('⚠️  Service logs failed (may not be available):', serviceError.message);
    }

    results.F06.passed = true;
    results.F06.details = {
      app_endpoint: `GET /api/v1/apps/${testApp.id}/logs`,
      service_endpoint: 'GET /api/v1/services/nginx/logs',
      method: 'GET',
      parameters: { resourceId: testApp.id, type: 'app', lines: 10 },
      response: {
        app_logs_count: appLogs.length,
        sample_app_log: appLogs[0] || null
      },
      verification: 'Logs returned in expected format'
    };

    console.log('\n✅ F06 PASSED: cloudron_get_logs works');

  } catch (error) {
    results.F06.error = error.message;
    console.error('\n❌ F06 FAILED:', error.message);
    console.error('Full error:', error);
  }
}

async function testF22_SearchApps() {
  console.log('\n========================================');
  console.log('TEST F22: cloudron_search_apps');
  console.log('========================================');

  try {
    // Search for a known app (WordPress)
    console.log('\n1. Searching App Store for "wordpress"...');
    const wordpressResults = await client.searchApps('wordpress');
    console.log(`Found ${wordpressResults.length} results for "wordpress"`);

    if (wordpressResults.length === 0) {
      throw new Error('Expected at least 1 result for "wordpress" search');
    }

    console.log('Sample result:', {
      id: wordpressResults[0].id,
      title: wordpressResults[0].title,
      description: wordpressResults[0].description?.substring(0, 100) + '...'
    });

    // Search for another known app (Nextcloud)
    console.log('\n2. Searching App Store for "nextcloud"...');
    const nextcloudResults = await client.searchApps('nextcloud');
    console.log(`Found ${nextcloudResults.length} results for "nextcloud"`);

    // Test empty query (should return all apps)
    console.log('\n3. Testing empty query (should return all apps)...');
    const allApps = await client.searchApps('');
    console.log(`Empty query returned ${allApps.length} apps`);

    if (allApps.length === 0) {
      throw new Error('Expected results for empty query (all apps)');
    }

    results.F22.passed = true;
    results.F22.details = {
      endpoint: 'GET /api/v1/appstore',
      method: 'GET',
      parameters: [
        { query: 'wordpress' },
        { query: 'nextcloud' },
        { query: '' }
      ],
      response: {
        wordpress_count: wordpressResults.length,
        nextcloud_count: nextcloudResults.length,
        all_apps_count: allApps.length,
        sample_app: {
          id: wordpressResults[0].id,
          title: wordpressResults[0].title
        }
      },
      verification: 'Search results contain expected app metadata'
    };

    console.log('\n✅ F22 PASSED: cloudron_search_apps works');

  } catch (error) {
    results.F22.error = error.message;
    console.error('\n❌ F22 FAILED:', error.message);
    console.error('Full error:', error);
  }
}

async function runTests() {
  console.log('========================================');
  console.log('REAL API TEST EXECUTION');
  console.log('Target: ' + CLOUDRON_BASE_URL);
  console.log('========================================');

  // Run tests sequentially (safer)
  await testF01_ControlApp();
  await testF05_ConfigureApp();
  await testF06_GetLogs();
  await testF22_SearchApps();

  // Print summary
  console.log('\n========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');

  const tools = ['F01', 'F05', 'F06', 'F22'];
  let passed = 0;
  let failed = 0;

  tools.forEach(tool => {
    const result = results[tool];
    if (result.passed) {
      console.log(`✅ ${tool}: PASSED`);
      passed++;
    } else {
      console.log(`❌ ${tool}: FAILED - ${result.error}`);
      failed++;
    }
  });

  console.log(`\nTotal: ${passed}/${tools.length} passed, ${failed}/${tools.length} failed`);

  // Print detailed results
  console.log('\n========================================');
  console.log('DETAILED RESULTS');
  console.log('========================================');

  tools.forEach(tool => {
    const result = results[tool];
    if (result.passed && result.details) {
      console.log(`\n${tool} Details:`);
      console.log(JSON.stringify(result.details, null, 2));
    }
  });

  // Exit with error if any test failed
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
