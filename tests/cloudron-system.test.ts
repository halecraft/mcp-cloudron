/**
 * Handler-level tests for system, groups, and updates tools
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { groupHandlers } from "../src/tools/handlers/groups"
import { systemHandlers } from "../src/tools/handlers/system"
import { updateHandlers } from "../src/tools/handlers/updates"
import {
  cleanupTestEnv,
  createMockFetch,
  createTestContext,
  mockDiskUsage,
  mockGroups,
  setupTestEnv,
} from "./helpers/cloudron-mock"
import { assertHasTextContent, assertSuccess } from "./helpers/mcp-assert"

describe("System & Groups & Updates Handlers", () => {
  beforeAll(() => setupTestEnv())
  afterAll(() => cleanupTestEnv())

  describe("cloudron_get_status", () => {
    it("should return system status", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/cloudron/status": {
          ok: true,
          status: 200,
          data: { version: "7.6.0", cloudronName: "TestBox" },
        },
      })
      const ctx = createTestContext()
      const response = await systemHandlers.cloudron_get_status({}, ctx)
      assertSuccess(response)
      expect(assertHasTextContent(response)).toContain("7.6.0")
    })
  })

  describe("cloudron_task_status", () => {
    it("should return task status", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/tasks/task-1": {
          ok: true,
          status: 200,
          data: { id: "task-1", success: true, percent: 100, message: "Done" },
        },
      })
      const ctx = createTestContext()
      const response = await systemHandlers.cloudron_task_status(
        { taskId: "task-1" },
        ctx,
      )
      assertSuccess(response)
      expect(assertHasTextContent(response)).toContain("task-1")
    })
  })

  describe("cloudron_check_storage", () => {
    it("should return storage info", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/system/disk_usage": {
          ok: true,
          status: 200,
          data: mockDiskUsage,
        },
      })
      const ctx = createTestContext()
      const response = await systemHandlers.cloudron_check_storage({}, ctx)
      assertSuccess(response)
      expect(assertHasTextContent(response)).toContain("Storage")
    })
  })

  describe("cloudron_list_services", () => {
    it("should map the {id, name} objects returned by /api/v1/services into Service[]", async () => {
      // Real Cloudron returns objects, not strings. Regression test for
      // ServicesResponse type / listServices() mapping bug.
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/services": {
          ok: true,
          status: 200,
          data: {
            services: [
              { id: "mysql", name: "MySQL" },
              { id: "postgresql", name: "PostgreSQL" },
              {
                id: "redis:5aa61658-e4cb-4804-83a7-34a5160ab5a7",
                name: "Redis 5aa61658-e4cb-4804-83a7-34a5160ab5a7",
              },
            ],
          },
        },
      })
      const ctx = createTestContext()
      const services = await ctx.system.listServices()

      expect(services).toHaveLength(3)
      expect(services[0]).toMatchObject({
        id: "mysql",
        name: "MySQL",
        status: "unknown",
      })
      expect(services[2]?.id).toBe("redis:5aa61658-e4cb-4804-83a7-34a5160ab5a7")
      // The display name must be a string, not an embedded {id, name} object.
      expect(typeof services[0]?.name).toBe("string")
    })
  })

  describe("cloudron_list_groups", () => {
    it("should return formatted list of groups", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/groups": {
          ok: true,
          status: 200,
          data: { groups: mockGroups },
        },
      })
      const ctx = createTestContext()
      const response = await groupHandlers.cloudron_list_groups({}, ctx)
      assertSuccess(response)
      expect(assertHasTextContent(response)).toContain("Developers")
    })
  })

  describe("cloudron_check_updates", () => {
    it("should return update availability", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/updater/updates": {
          ok: true,
          status: 200,
          data: {
            updates: {
              available: true,
              version: "8.0.0",
              changelog: "New features",
            },
          },
        },
      })
      const ctx = createTestContext()
      const response = await updateHandlers.cloudron_check_updates({}, ctx)
      assertSuccess(response)
      expect(assertHasTextContent(response)).toContain("8.0.0")
    })
  })
})
