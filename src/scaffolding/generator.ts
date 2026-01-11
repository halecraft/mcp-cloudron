/**
 * Cloudron Package Scaffold Generator
 *
 * Combines all templates to generate a complete package scaffold.
 */

import { generateDockerfile } from "./templates/dockerfile.template.js"
import { generateManifestWithDocs } from "./templates/manifest.template.js"
import { generateStartScript } from "./templates/start-script.template.js"
import { generateTestFile } from "./templates/test.template.js"
import type {
  AuthMethod,
  CloudronAddon,
  ScaffoldAppType,
  ScaffoldInput,
  ScaffoldOutput,
} from "./types.js"

/**
 * Valid app types for scaffolding
 */
export const VALID_APP_TYPES: ScaffoldAppType[] = [
  "nodejs",
  "php",
  "python",
  "java",
  "go",
  "static",
]

/**
 * Valid authentication methods
 */
export const VALID_AUTH_METHODS: AuthMethod[] = [
  "ldap",
  "oidc",
  "proxyAuth",
  "none",
]

/**
 * Valid Cloudron addons
 */
export const VALID_ADDONS: CloudronAddon[] = [
  "localstorage",
  "mysql",
  "postgresql",
  "mongodb",
  "redis",
  "ldap",
  "oidc",
  "sendmail",
  "recvmail",
  "scheduler",
]

/**
 * Validation error for scaffold input
 */
export class ScaffoldValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message)
    this.name = "ScaffoldValidationError"
  }
}

/**
 * Validate scaffold input parameters
 */
export function validateScaffoldInput(input: unknown): ScaffoldInput {
  if (!input || typeof input !== "object") {
    throw new ScaffoldValidationError("Input must be an object", "input")
  }

  const obj = input as Record<string, unknown>

  // Validate required fields
  if (!obj.appType || typeof obj.appType !== "string") {
    throw new ScaffoldValidationError(
      "appType is required and must be a string",
      "appType",
    )
  }

  if (!VALID_APP_TYPES.includes(obj.appType as ScaffoldAppType)) {
    throw new ScaffoldValidationError(
      `Invalid appType: "${obj.appType}". Valid types are: ${VALID_APP_TYPES.join(", ")}`,
      "appType",
    )
  }

  if (!obj.appName || typeof obj.appName !== "string") {
    throw new ScaffoldValidationError(
      "appName is required and must be a string",
      "appName",
    )
  }

  if (obj.appName.length < 2 || obj.appName.length > 50) {
    throw new ScaffoldValidationError(
      "appName must be between 2 and 50 characters",
      "appName",
    )
  }

  // Validate optional fields
  if (obj.appId !== undefined) {
    if (typeof obj.appId !== "string") {
      throw new ScaffoldValidationError("appId must be a string", "appId")
    }
    // Validate reverse domain format
    if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i.test(obj.appId)) {
      throw new ScaffoldValidationError(
        "appId must be in reverse domain format (e.g., com.example.myapp)",
        "appId",
      )
    }
  }

  if (obj.version !== undefined) {
    if (typeof obj.version !== "string") {
      throw new ScaffoldValidationError("version must be a string", "version")
    }
    // Validate semver format
    if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(obj.version)) {
      throw new ScaffoldValidationError(
        "version must be in semver format (e.g., 1.0.0)",
        "version",
      )
    }
  }

  if (obj.httpPort !== undefined) {
    if (
      typeof obj.httpPort !== "number" ||
      obj.httpPort < 1 ||
      obj.httpPort > 65535
    ) {
      throw new ScaffoldValidationError(
        "httpPort must be a number between 1 and 65535",
        "httpPort",
      )
    }
  }

  if (obj.healthCheckPath !== undefined) {
    if (typeof obj.healthCheckPath !== "string") {
      throw new ScaffoldValidationError(
        "healthCheckPath must be a string",
        "healthCheckPath",
      )
    }
    if (!obj.healthCheckPath.startsWith("/")) {
      throw new ScaffoldValidationError(
        "healthCheckPath must start with /",
        "healthCheckPath",
      )
    }
  }

  if (obj.addons !== undefined) {
    if (!Array.isArray(obj.addons)) {
      throw new ScaffoldValidationError("addons must be an array", "addons")
    }
    for (const addon of obj.addons) {
      if (!VALID_ADDONS.includes(addon as CloudronAddon)) {
        throw new ScaffoldValidationError(
          `Invalid addon: "${addon}". Valid addons are: ${VALID_ADDONS.join(", ")}`,
          "addons",
        )
      }
    }
  }

  if (obj.authMethod !== undefined) {
    if (!VALID_AUTH_METHODS.includes(obj.authMethod as AuthMethod)) {
      throw new ScaffoldValidationError(
        `Invalid authMethod: "${obj.authMethod}". Valid methods are: ${VALID_AUTH_METHODS.join(", ")}`,
        "authMethod",
      )
    }
  }

  if (obj.memoryLimit !== undefined) {
    if (typeof obj.memoryLimit !== "number" || obj.memoryLimit < 0) {
      throw new ScaffoldValidationError(
        "memoryLimit must be a positive number (in bytes)",
        "memoryLimit",
      )
    }
  }

  return {
    appType: obj.appType as ScaffoldAppType,
    appName: obj.appName as string,
    appId: obj.appId as string | undefined,
    version: obj.version as string | undefined,
    httpPort: obj.httpPort as number | undefined,
    healthCheckPath: obj.healthCheckPath as string | undefined,
    addons: obj.addons as CloudronAddon[] | undefined,
    authMethod: obj.authMethod as AuthMethod | undefined,
    description: obj.description as string | undefined,
    website: obj.website as string | undefined,
    memoryLimit: obj.memoryLimit as number | undefined,
  }
}

/**
 * Generate a complete package scaffold
 */
export function generateScaffold(input: ScaffoldInput): ScaffoldOutput {
  // Generate all files
  const manifest = generateManifestWithDocs(input)
  const dockerfile = generateDockerfile(input)
  const startScript = generateStartScript(input)
  const testFile = generateTestFile(input)

  // Generate summary
  const summary = generateSummary(input)

  return {
    manifest,
    dockerfile,
    startScript,
    testFile,
    summary,
  }
}

/**
 * Generate a summary of the scaffold
 */
function generateSummary(input: ScaffoldInput): string {
  const {
    appType,
    appName,
    appId = `io.cloudron.${appName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    version = "1.0.0",
    httpPort = 8000,
    addons = ["localstorage"],
    authMethod = "none",
  } = input

  const lines = [
    `# ${appName} - Cloudron Package Scaffold`,
    "",
    "## Generated Files",
    "",
    "| File | Description |",
    "|------|-------------|",
    "| `CloudronManifest.json` | Package metadata and configuration |",
    "| `Dockerfile` | Build instructions for the container |",
    "| `start.sh` | Application startup script |",
    "| `test/test.js` | Integration tests |",
    "",
    "## Configuration",
    "",
    `- **App ID**: ${appId}`,
    `- **Version**: ${version}`,
    `- **App Type**: ${appType}`,
    `- **HTTP Port**: ${httpPort}`,
    `- **Auth Method**: ${authMethod}`,
    `- **Addons**: ${addons.join(", ")}`,
    "",
    "## Next Steps",
    "",
    "1. **Create project directory**:",
    "   ```bash",
    `   mkdir ${appName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    `   cd ${appName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    "   ```",
    "",
    "2. **Save the generated files** to your project directory",
    "",
    "3. **Add your application code**",
    "",
    "4. **Build and test**:",
    "   ```bash",
    "   cloudron build",
    "   cloudron install --image <your-image>",
    "   cloudron logs -f",
    "   ```",
    "",
    "5. **Run integration tests**:",
    "   ```bash",
    "   cd test",
    "   npm install",
    "   npm test",
    "   ```",
    "",
    "## Documentation",
    "",
    "- [Cloudron Packaging Tutorial](https://docs.cloudron.io/packaging/tutorial/)",
    "- [Manifest Reference](https://docs.cloudron.io/packaging/manifest/)",
    "- [Addons Reference](https://docs.cloudron.io/packaging/addons/)",
    "",
  ]

  return lines.join("\n")
}

/**
 * Export types for external use
 */
export type {
  AuthMethod,
  CloudronAddon,
  ScaffoldAppType,
  ScaffoldInput,
  ScaffoldOutput,
}
