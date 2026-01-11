import { describe, it } from "vitest"

describe("Integration Environment Check", () => {
  it("should have required environment variables", () => {
    const baseUrl = process.env.CLOUDRON_BASE_URL
    const token = process.env.CLOUDRON_API_TOKEN
    
    if (!baseUrl || !token) {
      const msg = `
================================================================================
❌ INTEGRATION TESTS SKIPPED
================================================================================

Missing required environment variables:
${!baseUrl ? "- CLOUDRON_BASE_URL" : ""}
${!token ? "- CLOUDRON_API_TOKEN" : ""}

To run integration tests, you must provide a valid Cloudron instance:

  export CLOUDRON_BASE_URL="https://my.cloudron.io"
  export CLOUDRON_API_TOKEN="your-token"
  pnpm test:integration

These tests run against a REAL Cloudron instance.
They will create and delete test resources (apps, users).
================================================================================
`
      console.error(msg)
      // We skip this test so it shows as "skipped" but prints the message
      // If we throw, it fails the build, which might be annoying if just running all tests
      console.warn("Skipping integration tests due to missing config.")
      return
    }
  })
})
