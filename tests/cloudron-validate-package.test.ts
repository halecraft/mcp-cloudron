/**
 * Tests for cloudron_validate_package tool
 */

import { describe, expect, it } from "vitest"
import { validateDockerfile } from "../src/validation/dockerfile-rules.js"
import { validateManifest } from "../src/validation/package-rules.js"
import {
  formatValidationResult,
  validatePackage,
} from "../src/validation/package-validator.js"
import { validateStartScript } from "../src/validation/startscript-rules.js"

describe("cloudron_validate_package", () => {
  describe("validateManifest", () => {
    it("should validate a correct manifest", () => {
      const manifest = JSON.stringify({
        manifestVersion: 2,
        id: "com.example.myapp",
        title: "My App",
        version: "1.0.0",
        httpPort: 8000,
        healthCheckPath: "/",
        addons: {
          localstorage: {},
        },
      })

      const issues = validateManifest(manifest)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors).toHaveLength(0)
    })

    it("should detect missing manifestVersion", () => {
      const manifest = JSON.stringify({
        id: "com.example.myapp",
        version: "1.0.0",
        httpPort: 8000,
        healthCheckPath: "/",
      })

      const issues = validateManifest(manifest)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors.some(e => e.field === "manifestVersion")).toBe(true)
    })

    it("should detect invalid manifestVersion", () => {
      const manifest = JSON.stringify({
        manifestVersion: 1,
        version: "1.0.0",
        httpPort: 8000,
        healthCheckPath: "/",
      })

      const issues = validateManifest(manifest)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors.some(e => e.field === "manifestVersion")).toBe(true)
    })

    it("should detect missing version", () => {
      const manifest = JSON.stringify({
        manifestVersion: 2,
        httpPort: 8000,
        healthCheckPath: "/",
      })

      const issues = validateManifest(manifest)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors.some(e => e.field === "version")).toBe(true)
    })

    it("should detect invalid version format", () => {
      const manifest = JSON.stringify({
        manifestVersion: 2,
        version: "invalid",
        httpPort: 8000,
        healthCheckPath: "/",
      })

      const issues = validateManifest(manifest)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors.some(e => e.field === "version")).toBe(true)
    })

    it("should detect missing httpPort", () => {
      const manifest = JSON.stringify({
        manifestVersion: 2,
        version: "1.0.0",
        healthCheckPath: "/",
      })

      const issues = validateManifest(manifest)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors.some(e => e.field === "httpPort")).toBe(true)
    })

    it("should detect missing healthCheckPath", () => {
      const manifest = JSON.stringify({
        manifestVersion: 2,
        version: "1.0.0",
        httpPort: 8000,
      })

      const issues = validateManifest(manifest)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors.some(e => e.field === "healthCheckPath")).toBe(true)
    })

    it("should detect invalid JSON", () => {
      const manifest = "{ invalid json }"

      const issues = validateManifest(manifest)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors.some(e => e.field === "json")).toBe(true)
    })

    it("should warn about unknown addons", () => {
      const manifest = JSON.stringify({
        manifestVersion: 2,
        version: "1.0.0",
        httpPort: 8000,
        healthCheckPath: "/",
        addons: {
          unknownAddon: {},
        },
      })

      const issues = validateManifest(manifest)
      const warnings = issues.filter(i => i.severity === "warning")
      expect(warnings.some(w => w.message.includes("Unknown addon"))).toBe(true)
    })
  })

  describe("validateDockerfile", () => {
    it("should validate a correct Dockerfile", () => {
      const dockerfile = `FROM cloudron/base:5.0.0@sha256:abc123
WORKDIR /app/code
COPY . .
EXPOSE 8000
CMD ["/app/code/start.sh"]`

      const issues = validateDockerfile(dockerfile)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors).toHaveLength(0)
    })

    it("should detect missing cloudron/base image", () => {
      const dockerfile = `FROM ubuntu:20.04
WORKDIR /app/code
CMD ["/app/code/start.sh"]`

      const issues = validateDockerfile(dockerfile)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors.some(e => e.field === "FROM")).toBe(true)
    })

    it("should detect missing CMD/ENTRYPOINT", () => {
      const dockerfile = `FROM cloudron/base:5.0.0
WORKDIR /app/code
COPY . .`

      const issues = validateDockerfile(dockerfile)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors.some(e => e.field === "CMD")).toBe(true)
    })

    it("should warn about unpinned base image", () => {
      const dockerfile = `FROM cloudron/base:latest
WORKDIR /app/code
CMD ["/app/code/start.sh"]`

      const issues = validateDockerfile(dockerfile)
      const warnings = issues.filter(i => i.severity === "warning")
      expect(warnings.some(w => w.message.includes("pinned"))).toBe(true)
    })

    it("should warn about mismatched EXPOSE port", () => {
      const dockerfile = `FROM cloudron/base:5.0.0
EXPOSE 3000
CMD ["/app/code/start.sh"]`

      const issues = validateDockerfile(dockerfile, 8000)
      const warnings = issues.filter(i => i.severity === "warning")
      expect(warnings.some(w => w.message.includes("does not match"))).toBe(
        true,
      )
    })

    it("should warn about apt-get without cleanup", () => {
      const dockerfile = `FROM cloudron/base:5.0.0
RUN apt-get update && apt-get install -y curl
CMD ["/app/code/start.sh"]`

      const issues = validateDockerfile(dockerfile)
      const warnings = issues.filter(i => i.severity === "warning")
      expect(warnings.some(w => w.message.includes("apt-get"))).toBe(true)
    })
  })

  describe("validateStartScript", () => {
    it("should validate a correct start script", () => {
      const script = `#!/bin/bash
set -eu

if [[ ! -f /app/data/.initialized ]]; then
    touch /app/data/.initialized
fi

chown -R cloudron:cloudron /app/data
exec /usr/local/bin/gosu cloudron:cloudron node server.js`

      const issues = validateStartScript(script)
      const errors = issues.filter(i => i.severity === "error")
      expect(errors).toHaveLength(0)
    })

    it("should warn about missing shebang", () => {
      const script = `set -eu
exec node server.js`

      const issues = validateStartScript(script)
      const warnings = issues.filter(i => i.severity === "warning")
      expect(warnings.some(w => w.field === "shebang")).toBe(true)
    })

    it("should warn about missing set -eu", () => {
      const script = `#!/bin/bash
exec node server.js`

      const issues = validateStartScript(script)
      const warnings = issues.filter(i => i.severity === "warning")
      expect(warnings.some(w => w.field === "set")).toBe(true)
    })

    it("should warn about missing exec", () => {
      const script = `#!/bin/bash
set -eu
node server.js`

      const issues = validateStartScript(script)
      const warnings = issues.filter(i => i.severity === "warning")
      expect(warnings.some(w => w.field === "exec")).toBe(true)
    })

    it("should warn about unused database env vars", () => {
      const script = `#!/bin/bash
set -eu
exec node server.js`

      const issues = validateStartScript(script, ["mysql"])
      const warnings = issues.filter(i => i.severity === "warning")
      expect(warnings.some(w => w.message.includes("CLOUDRON_MYSQL"))).toBe(
        true,
      )
    })
  })

  describe("validatePackage", () => {
    it("should validate all files together", () => {
      const manifest = JSON.stringify({
        manifestVersion: 2,
        id: "com.example.myapp",
        title: "My App",
        version: "1.0.0",
        httpPort: 8000,
        healthCheckPath: "/",
        addons: {
          localstorage: {},
        },
      })

      const dockerfile = `FROM cloudron/base:5.0.0@sha256:abc123
WORKDIR /app/code
EXPOSE 8000
CMD ["/app/code/start.sh"]`

      const startScript = `#!/bin/bash
set -eu
chown -R cloudron:cloudron /app/data
exec /usr/local/bin/gosu cloudron:cloudron node server.js`

      const result = validatePackage({
        manifest,
        dockerfile,
        startScript,
      })

      expect(result.valid).toBe(true)
      expect(result.summary.filesValidated).toContain("CloudronManifest.json")
      expect(result.summary.filesValidated).toContain("Dockerfile")
      expect(result.summary.filesValidated).toContain("start.sh")
    })

    it("should cross-validate httpPort between manifest and Dockerfile", () => {
      const manifest = JSON.stringify({
        manifestVersion: 2,
        version: "1.0.0",
        httpPort: 8000,
        healthCheckPath: "/",
      })

      const dockerfile = `FROM cloudron/base:5.0.0
EXPOSE 3000
CMD ["/app/code/start.sh"]`

      const result = validatePackage({
        manifest,
        dockerfile,
      })

      const warnings = result.warnings
      expect(warnings.some(w => w.message.includes("does not match"))).toBe(
        true,
      )
    })

    it("should validate only provided files", () => {
      const manifest = JSON.stringify({
        manifestVersion: 2,
        version: "1.0.0",
        httpPort: 8000,
        healthCheckPath: "/",
      })

      const result = validatePackage({ manifest })

      expect(result.summary.filesValidated).toContain("CloudronManifest.json")
      expect(result.summary.filesValidated).not.toContain("Dockerfile")
      expect(result.summary.filesValidated).not.toContain("start.sh")
    })

    it("should return valid=false when errors exist", () => {
      const manifest = JSON.stringify({
        // Missing required fields
        id: "com.example.myapp",
      })

      const result = validatePackage({ manifest })

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe("formatValidationResult", () => {
    it("should format passing validation", () => {
      const result = validatePackage({
        manifest: JSON.stringify({
          manifestVersion: 2,
          version: "1.0.0",
          httpPort: 8000,
          healthCheckPath: "/",
        }),
      })

      const formatted = formatValidationResult(result)

      expect(formatted).toContain("✅")
      expect(formatted).toContain("Summary")
    })

    it("should format failing validation", () => {
      const result = validatePackage({
        manifest: JSON.stringify({
          // Missing required fields
        }),
      })

      const formatted = formatValidationResult(result)

      expect(formatted).toContain("❌")
      expect(formatted).toContain("Errors")
      expect(formatted).toContain("Next Steps")
    })

    it("should include warnings section", () => {
      const result = validatePackage({
        manifest: JSON.stringify({
          manifestVersion: 2,
          version: "1.0.0",
          httpPort: 8000,
          healthCheckPath: "/",
          addons: {
            unknownAddon: {},
          },
        }),
      })

      const formatted = formatValidationResult(result)

      expect(formatted).toContain("⚠️")
      expect(formatted).toContain("Warnings")
    })

    it("should include suggestions section", () => {
      const result = validatePackage({
        manifest: JSON.stringify({
          manifestVersion: 2,
          version: "1.0.0",
          httpPort: 8000,
          healthCheckPath: "/",
        }),
      })

      const formatted = formatValidationResult(result)

      expect(formatted).toContain("💡")
      expect(formatted).toContain("Suggestions")
    })
  })
})
