import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
/**
 * Test cloudron_install_app tool
 * Validates app installation with pre-flight manifest validation and storage check
 */

import { CloudronClient } from "../src/cloudron-client"
import { CloudronError } from "../src/errors"
import {
  cleanupTestEnv,
  createMockFetch,
  mockDiskUsage,
  setupTestEnv,
} from "./helpers/cloudron-mock"

describe("cloudron_install_app", () => {
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
    vi.clearAllMocks()
  })

  describe("Test Anchor: Pre-flight validation", () => {
    it("should call validateManifest before installation", async () => {
      // Mock API responses:
      // 1. GET /api/v1/appstore/apps (manifest check)
      // 2. GET /api/v1/system/disk_usage (storage check)
      // 3. POST /api/v1/apps (actual installation)
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/appstore/apps?search=io.example.app":
          {
            ok: true,
            status: 200,
            data: {
              apps: [
                {
                  id: "io.example.app",
                  name: "Example App",
                  description: "Test application",
                  version: "1.0.0",
                  iconUrl: "https://example.com/icon.png",
                  installCount: 100,
                  relevanceScore: 1.0,
                },
              ],
            },
          },
        "GET https://my.example.com/api/v1/system/disk_usage": {
          ok: true,
          status: 200,
          data: mockDiskUsage,
        },
        "POST https://my.example.com/api/v1/apps": {
          ok: true,
          status: 202,
          data: { taskId: "task-install-12345" },
        },
      })

      const client = new CloudronClient()
      const taskId = await client.installApp({
        manifestId: "io.example.app",
        location: "myapp",
        domain: "example.com",
        accessRestriction: null,
      })

      expect(taskId).toBe("task-install-12345")
      expect(typeof taskId).toBe("string")
      expect(taskId).toMatch(/^task-/)
    })

    it("should proceed with installation even when app not found in App Store (with warning)", async () => {
      // App not found is now a warning, not an error - installation proceeds
      // This allows installing apps that may not be in the search index
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/appstore/apps?search=io.nonexistent.app":
          {
            ok: true,
            status: 200,
            data: { apps: [] }, // App not found
          },
        "GET https://my.example.com/api/v1/system/disk_usage": {
          ok: true,
          status: 200,
          data: mockDiskUsage,
        },
        "POST https://my.example.com/api/v1/apps": {
          ok: true,
          status: 202,
          data: { taskId: "task-install-unknown-app" },
        },
      })

      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {})

      const client = new CloudronClient()
      const taskId = await client.installApp({
        manifestId: "io.nonexistent.app",
        location: "myapp",
        domain: "example.com",
        accessRestriction: null,
      })

      // Installation should succeed
      expect(taskId).toBe("task-install-unknown-app")

      // But warnings should be logged
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it("should reject installation when storage check fails", async () => {
      const lowDiskUsage = {
        usage: {
          filesystems: {
            "/dev/root": {
              available: 268435456, // 256MB (insufficient - less than 500MB default requirement)
              size: 10737418240, // 10GB
              used: 10468982784, // ~9.75GB
              mountpoint: "/",
            },
          },
        },
      }

      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/appstore/apps?search=io.example.app":
          {
            ok: true,
            status: 200,
            data: {
              apps: [
                {
                  id: "io.example.app",
                  name: "Example App",
                  description: "Test application",
                  version: "1.0.0",
                  iconUrl: "https://example.com/icon.png",
                  installCount: 100,
                  relevanceScore: 1.0,
                },
              ],
            },
          },
        "GET https://my.example.com/api/v1/system/disk_usage": {
          ok: true,
          status: 200,
          data: lowDiskUsage,
        },
      })

      const client = new CloudronClient()

      await expect(
        client.installApp({
          manifestId: "io.example.app",
          location: "myapp",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow(CloudronError)
      await expect(
        client.installApp({
          manifestId: "io.example.app",
          location: "myapp",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow(/Pre-flight validation failed/)
      await expect(
        client.installApp({
          manifestId: "io.example.app",
          location: "myapp",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow(/disk space/)
    })

    it("should NOT call installation API when pre-flight validation fails (insufficient storage)", async () => {
      // Use insufficient storage to trigger validation failure
      const lowDiskUsage = {
        usage: {
          filesystems: {
            "/dev/root": {
              available: 100 * 1024 * 1024, // 100MB (insufficient)
              size: 10737418240, // 10GB
              used: 10637418240,
              mountpoint: "/",
            },
          },
        },
      }

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ apps: [] }), // App not found (warning only)
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => lowDiskUsage, // Insufficient storage (error)
        })

      global.fetch = mockFetch as any

      const client = new CloudronClient()

      await expect(
        client.installApp({
          manifestId: "io.nonexistent.app",
          location: "myapp",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow(/Pre-flight validation failed/)

      // Verify TWO API calls made (GET appstore + GET disk_usage), NOT installation POST
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("/api/v1/appstore"),
        expect.any(Object),
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/api/v1/system/disk_usage"),
        expect.any(Object),
      )
    })
  })

  describe("Test Anchor: Installation parameters", () => {
    it("should install app with required parameters only", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/appstore/apps?search=io.example.app":
          {
            ok: true,
            status: 200,
            data: {
              apps: [
                {
                  id: "io.example.app",
                  name: "Example App",
                  description: "Test application",
                  version: "1.0.0",
                  iconUrl: "https://example.com/icon.png",
                  installCount: 100,
                  relevanceScore: 1.0,
                },
              ],
            },
          },
        "GET https://my.example.com/api/v1/system/disk_usage": {
          ok: true,
          status: 200,
          data: mockDiskUsage,
        },
        "POST https://my.example.com/api/v1/apps": {
          ok: true,
          status: 202,
          data: { taskId: "task-basic-install" },
        },
      })

      const client = new CloudronClient()
      const taskId = await client.installApp({
        manifestId: "io.example.app",
        location: "myapp",
        domain: "example.com",
        accessRestriction: null,
      })

      expect(taskId).toBe("task-basic-install")
    })

    it("should install app with optional parameters (env, portBindings, accessRestriction)", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            apps: [
              {
                id: "io.example.app",
                name: "Example App",
                description: "Test application",
                version: "1.0.0",
                iconUrl: "https://example.com/icon.png",
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockDiskUsage,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ taskId: "task-full-config" }),
        })

      global.fetch = mockFetch as any

      const client = new CloudronClient()
      const taskId = await client.installApp({
        manifestId: "io.example.app",
        location: "myapp",
        domain: "example.com",
        env: { MY_VAR: "value123", ANOTHER: "test" },
        portBindings: { "8080": 8080 },
        accessRestriction: "admin",
      })

      expect(taskId).toBe("task-full-config")

      // Verify POST body includes optional parameters
      const installCall = mockFetch.mock.calls.find(
        call => call[0].includes("/api/v1/apps") && call[1].method === "POST",
      )
      expect(installCall).toBeDefined()

      const requestBody = JSON.parse(installCall?.[1].body)
      expect(requestBody).toEqual({
        appStoreId: "io.example.app",
        subdomain: "myapp", // API field is 'subdomain' not 'location'
        domain: "example.com",
        accessRestriction: "admin",
        env: { MY_VAR: "value123", ANOTHER: "test" },
        ports: { "8080": 8080 }, // API field is 'ports' not 'portBindings'
      })
    })

    it("should throw error when manifestId is missing", async () => {
      const client = new CloudronClient()

      await expect(
        client.installApp({
          manifestId: "",
          location: "myapp",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow(CloudronError)
      await expect(
        client.installApp({
          manifestId: "",
          location: "myapp",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow(/manifestId is required/)
    })

    it("should throw error when location is missing", async () => {
      const client = new CloudronClient()

      await expect(
        client.installApp({
          manifestId: "io.example.app",
          location: "",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow(CloudronError)
      await expect(
        client.installApp({
          manifestId: "io.example.app",
          location: "",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow(/location.*is required/)
    })
  })

  describe("Test Anchor: Task ID return", () => {
    it("should return task ID for tracking", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/appstore/apps?search=io.example.app":
          {
            ok: true,
            status: 200,
            data: {
              apps: [
                {
                  id: "io.example.app",
                  name: "Example App",
                  description: "Test application",
                  version: "1.0.0",
                  iconUrl: "https://example.com/icon.png",
                  installCount: 100,
                  relevanceScore: 1.0,
                },
              ],
            },
          },
        "GET https://my.example.com/api/v1/system/disk_usage": {
          ok: true,
          status: 200,
          data: mockDiskUsage,
        },
        "POST https://my.example.com/api/v1/apps": {
          ok: true,
          status: 202,
          data: { taskId: "task-async-install-001" },
        },
      })

      const client = new CloudronClient()
      const taskId = await client.installApp({
        manifestId: "io.example.app",
        location: "myapp",
        domain: "example.com",
        accessRestriction: null,
      })

      // Task ID format suitable for task_status tracking
      expect(taskId).toMatch(/^task-/)
      expect(taskId.length).toBeGreaterThan(5)
    })

    it("should throw error when installation API returns 202 but missing taskId", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/appstore/apps?search=io.example.app":
          {
            ok: true,
            status: 200,
            data: {
              apps: [
                {
                  id: "io.example.app",
                  name: "Example App",
                  description: "Test application",
                  version: "1.0.0",
                  iconUrl: "https://example.com/icon.png",
                  installCount: 100,
                  relevanceScore: 1.0,
                },
              ],
            },
          },
        "GET https://my.example.com/api/v1/system/disk_usage": {
          ok: true,
          status: 200,
          data: mockDiskUsage,
        },
        "POST https://my.example.com/api/v1/apps": {
          ok: true,
          status: 202,
          data: {}, // Missing taskId
        },
      })

      const client = new CloudronClient()

      await expect(
        client.installApp({
          manifestId: "io.example.app",
          location: "myapp",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow(CloudronError)
      await expect(
        client.installApp({
          manifestId: "io.example.app",
          location: "myapp",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow(/missing taskId/i)
    })
  })

  describe("Test Anchor: Error handling", () => {
    it("should handle installation API authentication error (401)", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/appstore/apps?search=io.example.app":
          {
            ok: true,
            status: 200,
            data: {
              apps: [
                {
                  id: "io.example.app",
                  name: "Example App",
                  description: "Test application",
                  version: "1.0.0",
                  iconUrl: "https://example.com/icon.png",
                  installCount: 100,
                  relevanceScore: 1.0,
                },
              ],
            },
          },
        "GET https://my.example.com/api/v1/system/disk_usage": {
          ok: true,
          status: 200,
          data: mockDiskUsage,
        },
        "POST https://my.example.com/api/v1/apps": {
          ok: false,
          status: 401,
          data: { message: "Invalid token" },
        },
      })

      const client = new CloudronClient()

      await expect(
        client.installApp({
          manifestId: "io.example.app",
          location: "myapp",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow()
    })

    it("should handle installation API server error (500)", async () => {
      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/appstore/apps?search=io.example.app":
          {
            ok: true,
            status: 200,
            data: {
              apps: [
                {
                  id: "io.example.app",
                  name: "Example App",
                  description: "Test application",
                  version: "1.0.0",
                  iconUrl: "https://example.com/icon.png",
                  installCount: 100,
                  relevanceScore: 1.0,
                },
              ],
            },
          },
        "GET https://my.example.com/api/v1/system/disk_usage": {
          ok: true,
          status: 200,
          data: mockDiskUsage,
        },
        "POST https://my.example.com/api/v1/apps": {
          ok: false,
          status: 500,
          data: { message: "Installation service unavailable" },
        },
      })

      const client = new CloudronClient()

      await expect(
        client.installApp({
          manifestId: "io.example.app",
          location: "myapp",
          domain: "example.com",
          accessRestriction: null,
        }),
      ).rejects.toThrow()
    })

    it("should use POST HTTP method and correct endpoint", async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            apps: [
              {
                id: "io.example.app",
                name: "Example App",
                description: "Test application",
                version: "1.0.0",
                iconUrl: "https://example.com/icon.png",
                installCount: 100,
                relevanceScore: 1.0,
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockDiskUsage,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ taskId: "task-123" }),
        })

      global.fetch = mockFetch as any

      const client = new CloudronClient()
      await client.installApp({
        manifestId: "io.example.app",
        location: "myapp",
        domain: "example.com",
        accessRestriction: null,
      })

      // Verify POST /api/v1/apps called
      expect(mockFetch).toHaveBeenCalledWith(
        "https://my.example.com/api/v1/apps",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token-12345",
          }),
        }),
      )
    })
  })

  describe("Integration: Full installation workflow", () => {
    it("should complete full installation workflow with all checks", async () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {})

      global.fetch = createMockFetch({
        "GET https://my.example.com/api/v1/appstore/apps?search=io.example.app":
          {
            ok: true,
            status: 200,
            data: {
              apps: [
                {
                  id: "io.example.app",
                  name: "Example App",
                  description: "Test application",
                  version: "1.0.0",
                  iconUrl: "https://example.com/icon.png",
                  installCount: 100,
                  relevanceScore: 1.0,
                },
              ],
            },
          },
        "GET https://my.example.com/api/v1/system/disk_usage": {
          ok: true,
          status: 200,
          data: mockDiskUsage,
        },
        "POST https://my.example.com/api/v1/apps": {
          ok: true,
          status: 202,
          data: { taskId: "task-workflow-complete" },
        },
      })

      const client = new CloudronClient()
      const taskId = await client.installApp({
        manifestId: "io.example.app",
        location: "myapp",
        domain: "example.com",
        accessRestriction: null,
        env: { TEST: "value" },
      })

      // Verify task ID returned
      expect(taskId).toBe("task-workflow-complete")

      // Verify warnings logged (from validation)
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })
})
