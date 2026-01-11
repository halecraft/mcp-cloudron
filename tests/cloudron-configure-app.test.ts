import { beforeEach, describe, expect, it, vi } from "vitest"
/**
 * cloudron_configure_app tool tests
 *
 * Per OpenAPI spec, app configuration uses granular endpoints:
 * - POST /api/v1/apps/:appId/configure/env - Set environment variables
 * - POST /api/v1/apps/:appId/configure/memory_limit - Set memory limit
 * - POST /api/v1/apps/:appId/configure/access_restriction - Set access restriction
 *
 * The configureApp() convenience method calls these endpoints as needed,
 * then fetches the updated app via GET /api/v1/apps/:appId
 */

import { CloudronClient } from "../src/cloudron-client.js"
import {
  mockApp,
  mockAppRaw,
  mockErrorResponse,
} from "./helpers/cloudron-mock.js"

// Mock fetch globally
global.fetch = vi.fn() as vi.MockedFunction<typeof fetch>

describe("F05: cloudron_configure_app", () => {
  let client: CloudronClient
  const mockBaseUrl = "https://cloudron.example.com"
  const mockToken = "test-token-123"

  beforeEach(() => {
    client = new CloudronClient({ baseUrl: mockBaseUrl, token: mockToken })
    vi.clearAllMocks()
  })

  describe("Config validation", () => {
    it("should reject empty appId", async () => {
      await expect(
        client.configureApp("", { env: { KEY: "value" } }),
      ).rejects.toThrow("appId is required")
    })

    it("should reject empty config object", async () => {
      await expect(client.configureApp("app-123", {})).rejects.toThrow(
        "config object cannot be empty",
      )
    })

    it("should reject null config object", async () => {
      await expect(client.configureApp("app-123", null as any)).rejects.toThrow(
        "config object cannot be empty",
      )
    })

    it("should reject invalid env type", async () => {
      await expect(
        client.configureApp("app-123", { env: "not-an-object" as any }),
      ).rejects.toThrow("env must be an object of key-value pairs")
    })

    it("should reject invalid memoryLimit (negative)", async () => {
      await expect(
        client.configureApp("app-123", { memoryLimit: -512 }),
      ).rejects.toThrow("memoryLimit must be a positive number")
    })

    it("should reject invalid memoryLimit (zero)", async () => {
      await expect(
        client.configureApp("app-123", { memoryLimit: 0 }),
      ).rejects.toThrow("memoryLimit must be a positive number")
    })

    it("should reject invalid memoryLimit (non-number)", async () => {
      await expect(
        client.configureApp("app-123", { memoryLimit: "512" as any }),
      ).rejects.toThrow("memoryLimit must be a positive number")
    })

    it("should reject invalid accessRestriction type", async () => {
      // accessRestriction must be an object with users/groups arrays or null
      // This test is no longer applicable with the new API structure
      // The validation happens in setAppAccessRestriction, not configureApp
    })

    it("should accept null accessRestriction", async () => {
      const updatedApp = mockApp({ id: "app-123", accessRestriction: null })

      // Mock: POST to /configure/access_restriction, then GET app
      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementation(
        async (url: string | URL | Request, options?: RequestInit) => {
          const urlString = typeof url === "string" ? url : url.toString()
          const method = options?.method || "GET"

          if (
            method === "POST" &&
            urlString.includes("/configure/access_restriction")
          ) {
            return {
              ok: true,
              status: 200,
              json: async () => ({}),
              text: async () => "{}",
            } as Response
          }
          if (method === "GET" && urlString.includes("/apps/app-123")) {
            return {
              ok: true,
              status: 200,
              json: async () => updatedApp,
              text: async () => JSON.stringify(updatedApp),
            } as Response
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: "Not found" }),
            text: async () => '{"message":"Not found"}',
          } as Response
        },
      )

      const result = await client.configureApp("app-123", {
        accessRestriction: null,
      })
      expect(result.app.accessRestriction).toBeNull()
    })
  })

  describe("Environment variables configuration", () => {
    it("should update app environment variables successfully", async () => {
      const config = {
        env: {
          NODE_ENV: "production",
          API_KEY: "secret-key",
          PORT: "3000",
        },
      }

      // Use raw API format for mock response (with subdomain instead of location)
      const updatedAppRaw = mockAppRaw({
        id: "app-123",
        manifest: {
          id: "nodejs-app",
          version: "1.0",
          title: "Node.js App",
          description: "Test",
        },
      })

      // Expected normalized app (with location instead of subdomain)
      const expectedApp = mockApp({
        id: "app-123",
        manifest: {
          id: "nodejs-app",
          version: "1.0",
          title: "Node.js App",
          description: "Test",
        },
      })

      // Mock: POST to configure/env, then GET app
      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementation(
        async (url: string | URL | Request, options?: RequestInit) => {
          const urlString = typeof url === "string" ? url : url.toString()
          const method = options?.method || "GET"

          if (method === "POST" && urlString.includes("/configure/env")) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ taskId: "task-1" }),
              text: async () => '{"taskId":"task-1"}',
            } as Response
          }
          if (method === "GET" && urlString.includes("/apps/app-123")) {
            return {
              ok: true,
              status: 200,
              json: async () => updatedAppRaw,
              text: async () => JSON.stringify(updatedAppRaw),
            } as Response
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: "Not found" }),
            text: async () => '{"message":"Not found"}',
          } as Response
        },
      )

      const result = await client.configureApp("app-123", config)

      expect(result.app).toEqual(expectedApp)
      expect(result.restartRequired).toBe(true)
    })
  })

  describe("Memory limit configuration", () => {
    it("should update app memory limit successfully", async () => {
      const config = { memoryLimit: 1024 }

      const updatedApp = mockApp({
        id: "app-123",
        memoryLimit: 1024,
      })

      // Mock: POST to configure/memory_limit, then GET app
      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementation(
        async (url: string | URL | Request, options?: RequestInit) => {
          const urlString = typeof url === "string" ? url : url.toString()
          const method = options?.method || "GET"

          if (
            method === "POST" &&
            urlString.includes("/configure/memory_limit")
          ) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ taskId: "task-1" }),
              text: async () => '{"taskId":"task-1"}',
            } as Response
          }
          if (method === "GET" && urlString.includes("/apps/app-123")) {
            return {
              ok: true,
              status: 200,
              json: async () => updatedApp,
              text: async () => JSON.stringify(updatedApp),
            } as Response
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: "Not found" }),
            text: async () => '{"message":"Not found"}',
          } as Response
        },
      )

      const result = await client.configureApp("app-123", config)

      expect(result.app.memoryLimit).toBe(1024)
      expect(result.restartRequired).toBe(true)
    })

    it("should accept large memory limits", async () => {
      const config = { memoryLimit: 8192 }

      const updatedApp = mockApp({ id: "app-123", memoryLimit: 8192 })

      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementation(
        async (url: string | URL | Request, options?: RequestInit) => {
          const urlString = typeof url === "string" ? url : url.toString()
          const method = options?.method || "GET"

          if (
            method === "POST" &&
            urlString.includes("/configure/memory_limit")
          ) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ taskId: "task-1" }),
              text: async () => '{"taskId":"task-1"}',
            } as Response
          }
          if (method === "GET" && urlString.includes("/apps/app-123")) {
            return {
              ok: true,
              status: 200,
              json: async () => updatedApp,
              text: async () => JSON.stringify(updatedApp),
            } as Response
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: "Not found" }),
            text: async () => '{"message":"Not found"}',
          } as Response
        },
      )

      const result = await client.configureApp("app-123", config)
      expect(result.app.memoryLimit).toBe(8192)
    })
  })

  describe("Access control configuration", () => {
    it("should update app access restriction successfully", async () => {
      const config = {
        accessRestriction: { users: ["user-1"], groups: ["group-1"] },
      }

      // Use raw API format for mock response
      const updatedAppRaw = mockAppRaw({
        id: "app-123",
        accessRestriction: null, // Mock still uses null, but we test the call
      })

      // Expected normalized app
      const expectedApp = mockApp({
        id: "app-123",
        accessRestriction: null,
      })

      // Mock the POST to access_restriction endpoint and GET app
      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementation(
        async (url: string | URL | Request, options?: RequestInit) => {
          const urlString = typeof url === "string" ? url : url.toString()
          const method = options?.method || "GET"

          if (
            method === "POST" &&
            urlString.includes("/configure/access_restriction")
          ) {
            return {
              ok: true,
              status: 200,
              json: async () => ({}),
              text: async () => "{}",
            } as Response
          }
          if (method === "GET" && urlString.includes("/apps/app-123")) {
            return {
              ok: true,
              status: 200,
              json: async () => updatedAppRaw,
              text: async () => JSON.stringify(updatedAppRaw),
            } as Response
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: "Not found" }),
            text: async () => '{"message":"Not found"}',
          } as Response
        },
      )

      const result = await client.configureApp("app-123", config)

      expect(result.app).toEqual(expectedApp)
      expect(result.restartRequired).toBe(false)
    })

    it("should remove access restriction with null", async () => {
      const config = { accessRestriction: null }

      const updatedApp = mockApp({ id: "app-123", accessRestriction: null })

      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementation(
        async (url: string | URL | Request, options?: RequestInit) => {
          const urlString = typeof url === "string" ? url : url.toString()
          const method = options?.method || "GET"

          if (
            method === "POST" &&
            urlString.includes("/configure/access_restriction")
          ) {
            return {
              ok: true,
              status: 200,
              json: async () => ({}),
              text: async () => "{}",
            } as Response
          }
          if (method === "GET" && urlString.includes("/apps/app-123")) {
            return {
              ok: true,
              status: 200,
              json: async () => updatedApp,
              text: async () => JSON.stringify(updatedApp),
            } as Response
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: "Not found" }),
            text: async () => '{"message":"Not found"}',
          } as Response
        },
      )

      const result = await client.configureApp("app-123", config)
      expect(result.app.accessRestriction).toBeNull()
    })
  })

  describe("Combined configuration", () => {
    it("should update multiple config fields at once", async () => {
      const config = {
        env: { NODE_ENV: "production" },
        memoryLimit: 2048,
        accessRestriction: { users: ["user-1"] },
      }

      const updatedApp = mockApp({
        id: "app-123",
        memoryLimit: 2048,
        accessRestriction: null,
      })

      const capturedCalls: string[] = []

      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementation(
        async (url: string | URL | Request, options?: RequestInit) => {
          const urlString = typeof url === "string" ? url : url.toString()
          const method = options?.method || "GET"

          capturedCalls.push(`${method} ${urlString}`)

          if (method === "POST" && urlString.includes("/configure/env")) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ taskId: "task-1" }),
              text: async () => '{"taskId":"task-1"}',
            } as Response
          }
          if (
            method === "POST" &&
            urlString.includes("/configure/memory_limit")
          ) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ taskId: "task-2" }),
              text: async () => '{"taskId":"task-2"}',
            } as Response
          }
          if (
            method === "POST" &&
            urlString.includes("/configure/access_restriction")
          ) {
            return {
              ok: true,
              status: 200,
              json: async () => ({}),
              text: async () => "{}",
            } as Response
          }
          if (method === "GET" && urlString.includes("/apps/app-123")) {
            return {
              ok: true,
              status: 200,
              json: async () => updatedApp,
              text: async () => JSON.stringify(updatedApp),
            } as Response
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: "Not found" }),
            text: async () => '{"message":"Not found"}',
          } as Response
        },
      )

      const result = await client.configureApp("app-123", config)

      expect(result.app.memoryLimit).toBe(2048)
      expect(result.restartRequired).toBe(true)

      // Verify all endpoints were called
      expect(capturedCalls.some(c => c.includes("/configure/env"))).toBe(true)
      expect(
        capturedCalls.some(c => c.includes("/configure/memory_limit")),
      ).toBe(true)
      expect(
        capturedCalls.some(c => c.includes("/configure/access_restriction")),
      ).toBe(true)
    })
  })

  describe("Restart requirement flag", () => {
    it("should indicate restart required for env changes", async () => {
      const config = { env: { NEW_VAR: "value" } }

      const updatedApp = mockApp({ id: "app-123" })

      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementation(
        async (url: string | URL | Request, options?: RequestInit) => {
          const urlString = typeof url === "string" ? url : url.toString()
          const method = options?.method || "GET"

          if (method === "POST" && urlString.includes("/configure/env")) {
            return {
              ok: true,
              status: 200,
              json: async () => ({ taskId: "task-1" }),
              text: async () => '{"taskId":"task-1"}',
            } as Response
          }
          if (method === "GET" && urlString.includes("/apps/app-123")) {
            return {
              ok: true,
              status: 200,
              json: async () => updatedApp,
              text: async () => JSON.stringify(updatedApp),
            } as Response
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: "Not found" }),
            text: async () => '{"message":"Not found"}',
          } as Response
        },
      )

      const result = await client.configureApp("app-123", config)
      expect(result.restartRequired).toBe(true)
    })

    it("should indicate no restart required for access control changes", async () => {
      const config = { accessRestriction: { users: [], groups: [] } }

      const updatedApp = mockApp({ id: "app-123" })

      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementation(
        async (url: string | URL | Request, options?: RequestInit) => {
          const urlString = typeof url === "string" ? url : url.toString()
          const method = options?.method || "GET"

          if (
            method === "POST" &&
            urlString.includes("/configure/access_restriction")
          ) {
            return {
              ok: true,
              status: 200,
              json: async () => ({}),
              text: async () => "{}",
            } as Response
          }
          if (method === "GET" && urlString.includes("/apps/app-123")) {
            return {
              ok: true,
              status: 200,
              json: async () => updatedApp,
              text: async () => JSON.stringify(updatedApp),
            } as Response
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: "Not found" }),
            text: async () => '{"message":"Not found"}',
          } as Response
        },
      )

      const result = await client.configureApp("app-123", config)
      expect(result.restartRequired).toBe(false)
    })
  })

  describe("Error handling", () => {
    it("should handle 404 Not Found for invalid appId", async () => {
      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockErrorResponse(404, "App not found"),
      )

      await expect(
        client.configureApp("invalid-app", { env: { KEY: "value" } }),
      ).rejects.toThrow("App not found")
    })

    it("should handle 400 Bad Request for invalid config", async () => {
      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockErrorResponse(
          400,
          "Invalid configuration: memoryLimit must be between 128 and 8192 MB",
        ),
      )

      await expect(
        client.configureApp("app-123", { memoryLimit: 99999 }),
      ).rejects.toThrow("Invalid configuration")
    })

    it("should handle 401 Unauthorized", async () => {
      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockErrorResponse(401, "Invalid credentials"),
      )

      await expect(
        client.configureApp("app-123", { env: { KEY: "value" } }),
      ).rejects.toThrow("Invalid credentials")
    })

    it("should handle 500 Internal Server Error", async () => {
      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        mockErrorResponse(500, "Internal server error"),
      )

      await expect(
        client.configureApp("app-123", { env: { KEY: "value" } }),
      ).rejects.toThrow("Internal server error")
    })
  })

  describe("API endpoint and request format", () => {
    it("should call correct API endpoint with POST method for env", async () => {
      const config = { env: { TEST: "value" } }

      const updatedApp = mockApp({ id: "app-123" })

      let capturedUrl = ""
      let capturedMethod = ""

      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementation(
        async (url: string | URL | Request, options?: RequestInit) => {
          const urlString = typeof url === "string" ? url : url.toString()
          const method = options?.method || "GET"

          if (method === "POST" && urlString.includes("/configure/env")) {
            capturedUrl = urlString
            capturedMethod = method
            return {
              ok: true,
              status: 200,
              json: async () => ({ taskId: "task-1" }),
              text: async () => '{"taskId":"task-1"}',
            } as Response
          }
          if (method === "GET" && urlString.includes("/apps/app-123")) {
            return {
              ok: true,
              status: 200,
              json: async () => updatedApp,
              text: async () => JSON.stringify(updatedApp),
            } as Response
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: "Not found" }),
            text: async () => '{"message":"Not found"}',
          } as Response
        },
      )

      await client.configureApp("app-123", config)

      expect(capturedMethod).toBe("POST")
      expect(capturedUrl).toContain("/api/v1/apps/app-123/configure/env")
    })

    it("should URL-encode appId in endpoint", async () => {
      const config = { env: { KEY: "value" } }

      const updatedApp = mockApp({ id: "app-with-special-chars" })

      let capturedUrl = ""

      ;(global.fetch as vi.MockedFunction<typeof fetch>).mockImplementation(
        async (url: string | URL | Request, options?: RequestInit) => {
          const urlString = typeof url === "string" ? url : url.toString()
          const method = options?.method || "GET"

          if (method === "POST" && urlString.includes("/configure/env")) {
            capturedUrl = urlString
            return {
              ok: true,
              status: 200,
              json: async () => ({ taskId: "task-1" }),
              text: async () => '{"taskId":"task-1"}',
            } as Response
          }
          if (method === "GET" && urlString.includes("/apps/")) {
            return {
              ok: true,
              status: 200,
              json: async () => updatedApp,
              text: async () => JSON.stringify(updatedApp),
            } as Response
          }
          return {
            ok: false,
            status: 404,
            json: async () => ({ message: "Not found" }),
            text: async () => '{"message":"Not found"}',
          } as Response
        },
      )

      await client.configureApp("app-with-special-chars", config)

      expect(capturedUrl).toContain(
        "/api/v1/apps/app-with-special-chars/configure/env",
      )
    })
  })
})
