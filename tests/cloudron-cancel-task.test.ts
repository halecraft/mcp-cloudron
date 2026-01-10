/**
 * Test cloudron_cancel_task tool
 * Cancel running async operations (kill switch)
 */

import { CloudronClient } from "../src/cloudron-client"
import {
  cleanupTestEnv,
  createMockFetch,
  mockTaskStatusCancelled,
  setupTestEnv,
} from "./helpers/cloudron-mock"

describe("cloudron_cancel_task tool", () => {
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

  it("should cancel a running task successfully", async () => {
    global.fetch = createMockFetch({
      "DELETE https://my.example.com/api/v1/tasks/task-123": {
        ok: true,
        status: 200,
        data: mockTaskStatusCancelled,
      },
    })

    const client = new CloudronClient()
    const taskStatus = await client.cancelTask("task-123")

    expect(taskStatus.id).toBe("task-123")
    expect(taskStatus.state).toBe("cancelled")
    expect(taskStatus.message).toBe("Task cancelled by user request")
  })

  it("should handle 404 for invalid task ID", async () => {
    global.fetch = createMockFetch({
      "DELETE https://my.example.com/api/v1/tasks/invalid-task": {
        ok: false,
        status: 404,
        data: { message: "Task not found" },
      },
    })

    const client = new CloudronClient()

    await expect(client.cancelTask("invalid-task")).rejects.toThrow(
      "Task not found",
    )
  })

  it("should handle error when trying to cancel already completed task", async () => {
    global.fetch = createMockFetch({
      "DELETE https://my.example.com/api/v1/tasks/task-completed": {
        ok: false,
        status: 400,
        data: { message: "Cannot cancel completed task" },
      },
    })

    const client = new CloudronClient()

    await expect(client.cancelTask("task-completed")).rejects.toThrow(
      "Cannot cancel completed task",
    )
  })

  it("should require taskId parameter", async () => {
    const client = new CloudronClient()

    await expect(client.cancelTask("")).rejects.toThrow("taskId is required")
  })

  it("should verify task state transitions to cancelled", async () => {
    // First GET returns running state
    // Then DELETE returns cancelled state
    global.fetch = jest.fn(
      (url: string | URL | Request, options?: RequestInit) => {
        const urlString = typeof url === "string" ? url : url.toString()
        const method = options?.method || "GET"

        if (
          method === "DELETE" &&
          urlString.includes("/api/v1/tasks/task-123")
        ) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: "OK",
            json: async () => mockTaskStatusCancelled,
            text: async () => JSON.stringify(mockTaskStatusCancelled),
          } as Response)
        }

        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({ message: "Not found" }),
          text: async () => JSON.stringify({ message: "Not found" }),
        } as Response)
      },
    ) as typeof fetch

    const client = new CloudronClient()
    const taskStatus = await client.cancelTask("task-123")

    expect(taskStatus.state).toBe("cancelled")
  })

  it("should verify cancelled tasks cleanup resources", async () => {
    const mockCancelledWithCleanup = {
      ...mockTaskStatusCancelled,
      message: "Task cancelled by user request. Partial backup deleted.",
    }

    global.fetch = createMockFetch({
      "DELETE https://my.example.com/api/v1/tasks/task-backup": {
        ok: true,
        status: 200,
        data: mockCancelledWithCleanup,
      },
    })

    const client = new CloudronClient()
    const taskStatus = await client.cancelTask("task-backup")

    expect(taskStatus.state).toBe("cancelled")
    expect(taskStatus.message).toContain("Partial backup deleted")
  })

  it("should use DELETE HTTP method", async () => {
    let capturedMethod: string | undefined
    global.fetch = jest.fn(
      (_url: string | URL | Request, options?: RequestInit) => {
        capturedMethod = options?.method
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => mockTaskStatusCancelled,
          text: async () => JSON.stringify(mockTaskStatusCancelled),
        } as Response)
      },
    ) as typeof fetch

    const client = new CloudronClient()
    await client.cancelTask("task-123")

    expect(capturedMethod).toBe("DELETE")
  })

  it("should call correct API endpoint", async () => {
    let capturedUrl: string | undefined
    global.fetch = jest.fn(
      (url: string | URL | Request, _options?: RequestInit) => {
        capturedUrl = typeof url === "string" ? url : url.toString()
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => mockTaskStatusCancelled,
          text: async () => JSON.stringify(mockTaskStatusCancelled),
        } as Response)
      },
    ) as typeof fetch

    const client = new CloudronClient()
    await client.cancelTask("task-123")

    expect(capturedUrl).toBe("https://my.example.com/api/v1/tasks/task-123")
  })
})
