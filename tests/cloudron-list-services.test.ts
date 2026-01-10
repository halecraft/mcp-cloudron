/**
 * Tests for cloudron_list_services tool
 */

import { CloudronClient } from "../src/cloudron-client"
import { serviceHandlers } from "../src/tools/handlers/services"
import {
  cleanupTestEnv,
  createMockFetch,
  mockServices,
  setupTestEnv,
} from "./helpers/cloudron-mock"
import { assertHasTextContent, assertSuccess } from "./helpers/mcp-assert"

describe("cloudron_list_services tool", () => {
  beforeAll(() => {
    setupTestEnv()
  })

  afterAll(() => {
    cleanupTestEnv()
  })

  describe("Happy path", () => {
    it("should list all platform services", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/services": {
          ok: true,
          status: 200,
          data: { services: mockServices },
        },
      })

      const client = new CloudronClient()
      const response = await serviceHandlers.cloudron_list_services({}, client)

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("Platform Services")
      expect(text).toContain("mysql")
      expect(text).toContain("postgresql")
      expect(text).toContain("mongodb")
      expect(text).toContain("mail")
      expect(text).toContain("redis")
      expect(text).toContain("read-only diagnostics")
    })

    it("should show service status indicators", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/services": {
          ok: true,
          status: 200,
          data: { services: mockServices },
        },
      })

      const client = new CloudronClient()
      const response = await serviceHandlers.cloudron_list_services({}, client)

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("running")
      expect(text).toContain("stopped")
      expect(text).toContain("error")
    })

    it("should show service versions", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/services": {
          ok: true,
          status: 200,
          data: { services: mockServices },
        },
      })

      const client = new CloudronClient()
      const response = await serviceHandlers.cloudron_list_services({}, client)

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("8.0.35") // mysql version
      expect(text).toContain("15.4") // postgresql version
    })

    it("should handle empty service list", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/services": {
          ok: true,
          status: 200,
          data: { services: [] },
        },
      })

      const client = new CloudronClient()
      const response = await serviceHandlers.cloudron_list_services({}, client)

      assertSuccess(response)
      const text = assertHasTextContent(response)
      expect(text).toContain("No services found")
    })
  })

  describe("Error handling", () => {
    it("should handle API error", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/services": {
          ok: false,
          status: 500,
          data: { message: "Internal server error" },
        },
      })

      const client = new CloudronClient()
      await expect(
        serviceHandlers.cloudron_list_services({}, client),
      ).rejects.toThrow()
    })

    it("should handle authentication error", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/services": {
          ok: false,
          status: 401,
          data: { message: "Unauthorized" },
        },
      })

      const client = new CloudronClient()
      await expect(
        serviceHandlers.cloudron_list_services({}, client),
      ).rejects.toThrow()
    })
  })
})
