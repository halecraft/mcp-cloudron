/**
 * Tests for cloudron_scaffold_package tool
 */

import { describe, expect, it } from "vitest"
import {
  generateScaffold,
  ScaffoldValidationError,
  VALID_ADDONS,
  VALID_APP_TYPES,
  VALID_AUTH_METHODS,
  validateScaffoldInput,
} from "../src/scaffolding/index.js"

describe("cloudron_scaffold_package", () => {
  describe("validateScaffoldInput", () => {
    it("should validate minimal valid input", () => {
      const input = validateScaffoldInput({
        appType: "nodejs",
        appName: "MyApp",
      })

      expect(input.appType).toBe("nodejs")
      expect(input.appName).toBe("MyApp")
    })

    it("should validate full input with all options", () => {
      const input = validateScaffoldInput({
        appType: "python",
        appName: "TestApp",
        appId: "com.example.testapp",
        version: "2.0.0",
        httpPort: 3000,
        healthCheckPath: "/health",
        addons: ["localstorage", "postgresql", "redis"],
        authMethod: "oidc",
        description: "A test application",
        website: "https://example.com",
        memoryLimit: 512 * 1024 * 1024,
      })

      expect(input.appType).toBe("python")
      expect(input.appName).toBe("TestApp")
      expect(input.appId).toBe("com.example.testapp")
      expect(input.version).toBe("2.0.0")
      expect(input.httpPort).toBe(3000)
      expect(input.healthCheckPath).toBe("/health")
      expect(input.addons).toEqual(["localstorage", "postgresql", "redis"])
      expect(input.authMethod).toBe("oidc")
    })

    it("should reject missing appType", () => {
      expect(() =>
        validateScaffoldInput({
          appName: "MyApp",
        }),
      ).toThrow(ScaffoldValidationError)
    })

    it("should reject missing appName", () => {
      expect(() =>
        validateScaffoldInput({
          appType: "nodejs",
        }),
      ).toThrow(ScaffoldValidationError)
    })

    it("should reject invalid appType", () => {
      expect(() =>
        validateScaffoldInput({
          appType: "invalid",
          appName: "MyApp",
        }),
      ).toThrow(ScaffoldValidationError)
    })

    it("should reject invalid appId format", () => {
      expect(() =>
        validateScaffoldInput({
          appType: "nodejs",
          appName: "MyApp",
          appId: "invalid-id",
        }),
      ).toThrow(ScaffoldValidationError)
    })

    it("should reject invalid version format", () => {
      expect(() =>
        validateScaffoldInput({
          appType: "nodejs",
          appName: "MyApp",
          version: "invalid",
        }),
      ).toThrow(ScaffoldValidationError)
    })

    it("should reject invalid httpPort", () => {
      expect(() =>
        validateScaffoldInput({
          appType: "nodejs",
          appName: "MyApp",
          httpPort: 70000,
        }),
      ).toThrow(ScaffoldValidationError)
    })

    it("should reject healthCheckPath not starting with /", () => {
      expect(() =>
        validateScaffoldInput({
          appType: "nodejs",
          appName: "MyApp",
          healthCheckPath: "health",
        }),
      ).toThrow(ScaffoldValidationError)
    })

    it("should reject invalid addon", () => {
      expect(() =>
        validateScaffoldInput({
          appType: "nodejs",
          appName: "MyApp",
          addons: ["invalid-addon"],
        }),
      ).toThrow(ScaffoldValidationError)
    })

    it("should reject invalid authMethod", () => {
      expect(() =>
        validateScaffoldInput({
          appType: "nodejs",
          appName: "MyApp",
          authMethod: "invalid",
        }),
      ).toThrow(ScaffoldValidationError)
    })

    it("should accept all valid app types", () => {
      for (const appType of VALID_APP_TYPES) {
        const input = validateScaffoldInput({
          appType,
          appName: "TestApp",
        })
        expect(input.appType).toBe(appType)
      }
    })

    it("should accept all valid auth methods", () => {
      for (const authMethod of VALID_AUTH_METHODS) {
        const input = validateScaffoldInput({
          appType: "nodejs",
          appName: "TestApp",
          authMethod,
        })
        expect(input.authMethod).toBe(authMethod)
      }
    })

    it("should accept all valid addons", () => {
      const input = validateScaffoldInput({
        appType: "nodejs",
        appName: "TestApp",
        addons: VALID_ADDONS,
      })
      expect(input.addons).toEqual(VALID_ADDONS)
    })
  })

  describe("generateScaffold", () => {
    it("should generate all required files", () => {
      const scaffold = generateScaffold({
        appType: "nodejs",
        appName: "MyApp",
      })

      expect(scaffold.manifest).toBeDefined()
      expect(scaffold.dockerfile).toBeDefined()
      expect(scaffold.startScript).toBeDefined()
      expect(scaffold.testFile).toBeDefined()
      expect(scaffold.summary).toBeDefined()
    })

    describe("manifest generation", () => {
      it("should include required manifest fields", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.manifest).toContain('"manifestVersion": 2')
        expect(scaffold.manifest).toContain('"title": "MyApp"')
        expect(scaffold.manifest).toContain('"httpPort"')
        expect(scaffold.manifest).toContain('"healthCheckPath"')
      })

      it("should include custom appId", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
          appId: "com.example.myapp",
        })

        expect(scaffold.manifest).toContain('"id": "com.example.myapp"')
      })

      it("should include addons", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
          addons: ["localstorage", "postgresql"],
        })

        expect(scaffold.manifest).toContain('"localstorage"')
        expect(scaffold.manifest).toContain('"postgresql"')
      })
    })

    describe("dockerfile generation", () => {
      it("should use cloudron base image", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.dockerfile).toContain("FROM cloudron/base:")
      })

      it("should generate Node.js specific dockerfile", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.dockerfile).toContain("Node.js")
        expect(scaffold.dockerfile).toContain("npm")
      })

      it("should generate PHP specific dockerfile", () => {
        const scaffold = generateScaffold({
          appType: "php",
          appName: "MyApp",
        })

        expect(scaffold.dockerfile).toContain("PHP")
        expect(scaffold.dockerfile).toContain("Apache")
      })

      it("should generate Python specific dockerfile", () => {
        const scaffold = generateScaffold({
          appType: "python",
          appName: "MyApp",
        })

        expect(scaffold.dockerfile).toContain("Python")
        expect(scaffold.dockerfile).toContain("gunicorn")
      })

      it("should generate Java specific dockerfile", () => {
        const scaffold = generateScaffold({
          appType: "java",
          appName: "MyApp",
        })

        expect(scaffold.dockerfile).toContain("Java")
        expect(scaffold.dockerfile).toContain("openjdk")
      })

      it("should generate Go specific dockerfile", () => {
        const scaffold = generateScaffold({
          appType: "go",
          appName: "MyApp",
        })

        expect(scaffold.dockerfile).toContain("Go")
      })

      it("should generate static site dockerfile", () => {
        const scaffold = generateScaffold({
          appType: "static",
          appName: "MyApp",
        })

        expect(scaffold.dockerfile).toContain("Static")
        expect(scaffold.dockerfile).toContain("nginx")
      })

      it("should include custom httpPort", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
          httpPort: 3000,
        })

        expect(scaffold.dockerfile).toContain("EXPOSE 3000")
      })
    })

    describe("start script generation", () => {
      it("should include bash shebang", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.startScript).toContain("#!/bin/bash")
      })

      it("should include first-run initialization", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.startScript).toContain(".initialized")
        expect(scaffold.startScript).toContain("First run")
      })

      it("should include database env vars for mysql addon", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
          addons: ["mysql"],
        })

        expect(scaffold.startScript).toContain("CLOUDRON_MYSQL")
      })

      it("should include database env vars for postgresql addon", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
          addons: ["postgresql"],
        })

        expect(scaffold.startScript).toContain("CLOUDRON_POSTGRESQL")
      })

      it("should include OIDC env vars for oidc auth", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
          authMethod: "oidc",
        })

        expect(scaffold.startScript).toContain("CLOUDRON_OIDC")
      })

      it("should include LDAP env vars for ldap auth", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
          authMethod: "ldap",
        })

        expect(scaffold.startScript).toContain("CLOUDRON_LDAP")
      })

      it("should use gosu for non-root execution", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.startScript).toContain("gosu")
      })
    })

    describe("test file generation", () => {
      it("should include mocha test structure", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.testFile).toContain("describe")
        expect(scaffold.testFile).toContain("it(")
      })

      it("should include installation test", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.testFile).toContain("cloudron install")
      })

      it("should include backup/restore test", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.testFile).toContain("backup")
        expect(scaffold.testFile).toContain("restore")
      })

      it("should include app name in test description", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.testFile).toContain("MyApp")
      })
    })

    describe("summary generation", () => {
      it("should include app name", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.summary).toContain("MyApp")
      })

      it("should include next steps", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.summary).toContain("Next Steps")
        expect(scaffold.summary).toContain("cloudron build")
      })

      it("should list generated files", () => {
        const scaffold = generateScaffold({
          appType: "nodejs",
          appName: "MyApp",
        })

        expect(scaffold.summary).toContain("CloudronManifest.json")
        expect(scaffold.summary).toContain("Dockerfile")
        expect(scaffold.summary).toContain("start.sh")
        expect(scaffold.summary).toContain("test/test.js")
      })
    })
  })
})
