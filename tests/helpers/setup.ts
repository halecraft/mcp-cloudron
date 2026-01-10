/**
 * Global test setup for Vitest
 *
 * This file is loaded via Vitest's setupFiles configuration.
 * It provides common setup/teardown for all tests.
 */

import { afterAll, afterEach, beforeAll, vi } from "vitest"
import { cleanupTestEnv, setupTestEnv } from "./cloudron-mock"

// Store original fetch for restoration
let originalFetch: typeof global.fetch

beforeAll(() => {
  setupTestEnv()
  originalFetch = global.fetch
})

afterAll(() => {
  cleanupTestEnv()
  global.fetch = originalFetch
})

afterEach(() => {
  vi.clearAllMocks()
})
