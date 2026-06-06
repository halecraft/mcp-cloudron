/**
 * HTTP Client unit tests
 * Tests error propagation, timeout, and constructor validation
 * so these concerns don't need to be tested per-endpoint.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { HttpClient } from "../../src/client/http-client.js"
import { CloudronError } from "../../src/errors.js"

describe("HttpClient", () => {
  const validConfig = {
    baseUrl: "https://test.cloudron.io",
    token: "test-token",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("constructor", () => {
    it("should throw when baseUrl is missing", () => {
      expect(() => new HttpClient({ baseUrl: "", token: "t" })).toThrow(
        CloudronError,
      )
      expect(() => new HttpClient({ baseUrl: "", token: "t" })).toThrow(
        "baseUrl is required",
      )
    })

    it("should throw when token is missing", () => {
      expect(
        () => new HttpClient({ baseUrl: "https://example.com", token: "" }),
      ).toThrow(CloudronError)
      expect(
        () => new HttpClient({ baseUrl: "https://example.com", token: "" }),
      ).toThrow("token is required")
    })

    it("should strip trailing slash from baseUrl", () => {
      const client = new HttpClient({
        baseUrl: "https://example.com/",
        token: "t",
      })
      // Verify via a request URL construction — we check that the base URL
      // doesn't produce double slashes by mocking fetch and inspecting the URL.
      const mockFetch = vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        ),
      )
      global.fetch = mockFetch

      client.get("/api/test")

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/api/test",
        expect.any(Object),
      )
    })
  })

  describe("request success", () => {
    it("should return parsed JSON body on successful GET", async () => {
      const mockData = { apps: [{ id: "app-1" }] }
      global.fetch = vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockData), { status: 200 }),
        ),
      )

      const client = new HttpClient(validConfig)
      const result = await client.get<typeof mockData>("/api/v1/apps")

      expect(result).toEqual(mockData)
    })

    it("should send Bearer token in Authorization header", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({}), { status: 200 })),
      )

      const client = new HttpClient(validConfig)
      await client.get("/api/test")

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.cloudron.io/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      )
    })
  })

  describe("error responses", () => {
    it("should throw CloudronError with extracted message on 4xx", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Not found" }), {
            status: 404,
            statusText: "Not Found",
          }),
        ),
      )

      const client = new HttpClient(validConfig)

      await expect(client.get("/api/v1/apps/nonexistent")).rejects.toThrow(
        CloudronError,
      )
      await expect(client.get("/api/v1/apps/nonexistent")).rejects.toThrow(
        "Not found",
      )
    })

    it("should throw CloudronError on 5xx", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Server error" }), {
            status: 500,
            statusText: "Internal Server Error",
          }),
        ),
      )

      const client = new HttpClient(validConfig)

      await expect(client.get("/api/test")).rejects.toThrow(CloudronError)
      await expect(client.get("/api/test")).rejects.toThrow("Server error")
    })

    it("should use default message if error body is not JSON", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve(
          new Response("plain text error", {
            status: 502,
            statusText: "Bad Gateway",
          }),
        ),
      )

      const client = new HttpClient(validConfig)

      await expect(client.get("/api/test")).rejects.toThrow(CloudronError)
      await expect(client.get("/api/test")).rejects.toThrow(
        "Cloudron API error: 502 Bad Gateway",
      )
    })
  })

  describe("network errors", () => {
    it("should throw CloudronError with NETWORK_ERROR code on fetch rejection", async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error("Connection refused")),
      )

      const client = new HttpClient(validConfig)

      await expect(client.get("/api/test")).rejects.toThrow(CloudronError)
      await expect(client.get("/api/test")).rejects.toThrow(
        "Network error: Connection refused",
      )

      try {
        await client.get("/api/test")
      } catch (error) {
        expect(error).toBeInstanceOf(CloudronError)
        if (error instanceof CloudronError) {
          expect(error.code).toBe("NETWORK_ERROR")
        }
      }
    })
  })

  describe("timeout", () => {
    it("should throw CloudronError with TIMEOUT code on AbortError", async () => {
      const client = new HttpClient(validConfig)

      // Simulate what happens when AbortController aborts the fetch:
      // the fetch rejects with a DOMException whose name is "AbortError"
      global.fetch = vi.fn(() =>
        Promise.reject(
          new DOMException("The operation was aborted", "AbortError"),
        ),
      )

      await expect(client.get("/api/test")).rejects.toThrow(CloudronError)

      try {
        await client.get("/api/test")
      } catch (error) {
        expect(error).toBeInstanceOf(CloudronError)
        if (error instanceof CloudronError) {
          expect(error.code).toBe("TIMEOUT")
        }
      }
    })
  })
})
