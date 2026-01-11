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

// Add fail() helper for tests (similar to Jest's fail)
;(globalThis as Record<string, unknown>).fail = (message?: string): never => {
  throw new Error(message ?? "Test failed")
}

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
