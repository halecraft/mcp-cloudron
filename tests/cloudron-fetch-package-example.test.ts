import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { gitFetchHandlers } from "../src/tools/handlers/git-fetch.js"

// Mock global fetch
const fetchMock = vi.fn()
global.fetch = fetchMock

describe("cloudron_fetch_package_example", () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should fetch package files when repo is found", async () => {
    // Mock projects response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 1,
          name: "Ackee App",
          path: "ackee-app",
          default_branch: "master",
          http_url_to_repo: "https://git.cloudron.io/packages/ackee-app.git",
        },
      ],
    })
    // Mock projects response (Page 2 - Empty)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    // Mock manifest response (for verification)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: "com.electerious.ackee" }),
    })

    // Mock file responses
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "manifest content",
    })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "dockerfile content",
    })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "start script content",
    })

    const result = await gitFetchHandlers.cloudron_fetch_package_example(
      { appId: "com.electerious.ackee" },
      {} as any,
    )

    expect(result.content[0].text).toContain("Found repository: Ackee App")
    expect(result.content[0].text).toContain("--- CloudronManifest.json ---")
    expect(result.content[0].text).toContain("manifest content")
  })

  it("should return error when repo is not found", async () => {
    // Mock projects response (empty or no match)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    const result = await gitFetchHandlers.cloudron_fetch_package_example(
      { appId: "com.unknown.app" },
      {} as any,
    )

    expect(result.content[0].text).toContain(
      "Could not find a repository for App ID: com.unknown.app",
    )
  })

  it("should handle file fetch errors gracefully", async () => {
    // Mock projects response (Page 1)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 1,
          name: "Ackee App",
          path: "ackee-app",
          default_branch: "master",
          http_url_to_repo: "https://git.cloudron.io/packages/ackee-app.git",
        },
      ],
    })
    // Mock projects response (Page 2 - Empty to stop pagination)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    // Mock manifest response (for verification)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: "com.electerious.ackee" }),
    })

    // Mock file responses (one failure)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "manifest content",
    })
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    })
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => "start script content",
    })

    const result = await gitFetchHandlers.cloudron_fetch_package_example(
      { appId: "com.electerious.ackee" },
      {} as any,
    )

    expect(result.content[0].text).toContain("Found repository: Ackee App")
    expect(result.content[0].text).toContain("(File not found or error")
  })
})
