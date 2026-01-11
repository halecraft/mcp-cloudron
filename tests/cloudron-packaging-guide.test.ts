/**
 * Tests for the Cloudron Packaging Guide tool
 */

import { describe, expect, it } from "vitest"
import { packagingHandlers } from "../src/tools/handlers/packaging"
import {
  assertError,
  assertHasTextContent,
  assertSuccess,
} from "./helpers/mcp-assert"

// The packaging guide handler doesn't need CloudronContext since it reads local files
const handler = packagingHandlers.cloudron_packaging_guide!

describe("cloudron_packaging_guide", () => {
  describe("valid topics", () => {
    it("should return overview content", async () => {
      const result = await handler({ topic: "overview" }, {} as never)

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("Cloudron Packaging Overview")
      expect(text).toContain("Quick Start Checklist")
    })

    it("should return manifest content", async () => {
      const result = await handler({ topic: "manifest" }, {} as never)

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("CloudronManifest.json")
      expect(text).toContain("manifestVersion")
    })

    it("should return dockerfile content", async () => {
      const result = await handler({ topic: "dockerfile" }, {} as never)

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("Dockerfile")
      expect(text).toContain("cloudron/base")
    })

    it("should return addons content", async () => {
      const result = await handler({ topic: "addons" }, {} as never)

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("Addons")
      expect(text).toContain("localstorage")
      expect(text).toContain("mysql")
    })

    it("should return testing content", async () => {
      const result = await handler({ topic: "testing" }, {} as never)

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("Testing")
      expect(text).toContain("backup")
      expect(text).toContain("restore")
    })

    it("should return publishing content", async () => {
      const result = await handler({ topic: "publishing" }, {} as never)

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("Publishing")
      expect(text).toContain("App Store")
    })
  })

  describe("appType parameter", () => {
    it("should include nodejs-specific guidance", async () => {
      const result = await handler(
        { topic: "dockerfile", appType: "nodejs" },
        {} as never,
      )

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("Node.js")
      expect(text).toContain("gosu cloudron:cloudron")
    })

    it("should include php-specific guidance", async () => {
      const result = await handler(
        { topic: "dockerfile", appType: "php" },
        {} as never,
      )

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("PHP")
      expect(text).toContain("www-data")
    })

    it("should include java-specific guidance", async () => {
      const result = await handler(
        { topic: "dockerfile", appType: "java" },
        {} as never,
      )

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("Java")
      expect(text).toContain("MaxRAM")
    })

    it("should include python-specific guidance", async () => {
      const result = await handler(
        { topic: "dockerfile", appType: "python" },
        {} as never,
      )

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("Python")
    })

    it("should include go-specific guidance", async () => {
      const result = await handler(
        { topic: "dockerfile", appType: "go" },
        {} as never,
      )

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("Go")
    })

    it("should include static-specific guidance", async () => {
      const result = await handler(
        { topic: "dockerfile", appType: "static" },
        {} as never,
      )

      assertSuccess(result)
      const text = assertHasTextContent(result)
      expect(text).toContain("Static")
      expect(text).toContain("nginx")
    })
  })

  describe("error handling", () => {
    it("should return error for invalid topic", async () => {
      const result = await handler({ topic: "invalid-topic" }, {} as never)

      assertError(result, "Invalid topic")
    })

    it("should return error for invalid appType", async () => {
      const result = await handler(
        { topic: "dockerfile", appType: "invalid-type" },
        {} as never,
      )

      assertError(result, "Invalid appType")
    })

    it("should return error when topic is missing", async () => {
      const result = await handler({}, {} as never)

      assertError(result, "topic is required")
    })

    it("should return error when args is null", async () => {
      const result = await handler(null, {} as never)

      assertError(result, "Invalid input")
    })
  })
})
