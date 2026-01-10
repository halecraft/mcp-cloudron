/**
 * Global test setup for Jest
 *
 * This file is loaded via Jest's setupFilesAfterEnv configuration.
 * It provides common setup/teardown for all tests.
 */

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

beforeEach(() => {
  jest.clearAllMocks()
})
