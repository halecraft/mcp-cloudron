/**
 * CloudronManifest.json Validation Rules
 *
 * Validates package manifest files for correctness and best practices.
 */

/**
 * Validation result for a single rule
 */
export interface ValidationIssue {
  severity: "error" | "warning" | "info"
  field: string
  message: string
  suggestion?: string
}

/**
 * Parsed manifest for validation
 */
export interface ParsedManifest {
  manifestVersion?: unknown
  id?: unknown
  title?: unknown
  version?: unknown
  description?: unknown
  httpPort?: unknown
  healthCheckPath?: unknown
  addons?: unknown
  memoryLimit?: unknown
  optionalSso?: unknown
  minBoxVersion?: unknown
  [key: string]: unknown
}

/**
 * Valid addon names
 */
const VALID_ADDONS = [
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
  "proxyAuth",
  "simpleauth",
]

/**
 * Validate manifest JSON structure
 */
export function validateManifestJson(content: string): {
  manifest: ParsedManifest | null
  issues: ValidationIssue[]
} {
  const issues: ValidationIssue[] = []

  try {
    const manifest = JSON.parse(content) as ParsedManifest
    return { manifest, issues }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown parse error"
    issues.push({
      severity: "error",
      field: "json",
      message: `Invalid JSON: ${message}`,
      suggestion:
        "Ensure the manifest is valid JSON. Check for missing commas, brackets, or quotes.",
    })
    return { manifest: null, issues }
  }
}

/**
 * Validate manifestVersion field
 */
export function validateManifestVersion(
  manifest: ParsedManifest,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (manifest.manifestVersion === undefined) {
    issues.push({
      severity: "error",
      field: "manifestVersion",
      message: "Missing required field: manifestVersion",
      suggestion: 'Add "manifestVersion": 2 to your manifest.',
    })
  } else if (manifest.manifestVersion !== 2) {
    issues.push({
      severity: "error",
      field: "manifestVersion",
      message: `Invalid manifestVersion: ${manifest.manifestVersion}. Must be 2.`,
      suggestion: "Set manifestVersion to 2 (the current version).",
    })
  }

  return issues
}

/**
 * Validate id field
 */
export function validateId(manifest: ParsedManifest): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (manifest.id === undefined) {
    issues.push({
      severity: "warning",
      field: "id",
      message: "Missing recommended field: id",
      suggestion:
        'Add an "id" field in reverse domain format (e.g., "com.example.myapp").',
    })
  } else if (typeof manifest.id !== "string") {
    issues.push({
      severity: "error",
      field: "id",
      message: "id must be a string",
    })
  } else if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i.test(manifest.id)) {
    issues.push({
      severity: "warning",
      field: "id",
      message: `id "${manifest.id}" is not in reverse domain format`,
      suggestion: 'Use reverse domain format like "com.example.myapp".',
    })
  }

  return issues
}

/**
 * Validate title field
 */
export function validateTitle(manifest: ParsedManifest): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (manifest.title === undefined) {
    issues.push({
      severity: "warning",
      field: "title",
      message: "Missing recommended field: title",
      suggestion: "Add a title for your application.",
    })
  } else if (typeof manifest.title !== "string") {
    issues.push({
      severity: "error",
      field: "title",
      message: "title must be a string",
    })
  } else if (manifest.title.length < 2 || manifest.title.length > 50) {
    issues.push({
      severity: "warning",
      field: "title",
      message: "title should be between 2 and 50 characters",
    })
  }

  return issues
}

/**
 * Validate version field (semver)
 */
export function validateVersion(manifest: ParsedManifest): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (manifest.version === undefined) {
    issues.push({
      severity: "error",
      field: "version",
      message: "Missing required field: version",
      suggestion: 'Add a "version" field in semver format (e.g., "1.0.0").',
    })
  } else if (typeof manifest.version !== "string") {
    issues.push({
      severity: "error",
      field: "version",
      message: "version must be a string",
    })
  } else if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(manifest.version)) {
    issues.push({
      severity: "error",
      field: "version",
      message: `Invalid version format: "${manifest.version}"`,
      suggestion:
        'Use semantic versioning format: "MAJOR.MINOR.PATCH" (e.g., "1.0.0").',
    })
  }

  return issues
}

/**
 * Validate httpPort field
 */
export function validateHttpPort(manifest: ParsedManifest): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (manifest.httpPort === undefined) {
    issues.push({
      severity: "error",
      field: "httpPort",
      message: "Missing required field: httpPort",
      suggestion:
        "Add httpPort specifying the port your application listens on (commonly 8000).",
    })
  } else if (typeof manifest.httpPort !== "number") {
    issues.push({
      severity: "error",
      field: "httpPort",
      message: "httpPort must be a number",
    })
  } else if (manifest.httpPort < 1 || manifest.httpPort > 65535) {
    issues.push({
      severity: "error",
      field: "httpPort",
      message: `Invalid httpPort: ${manifest.httpPort}. Must be between 1 and 65535.`,
    })
  } else if (
    manifest.httpPort < 1024 &&
    manifest.httpPort !== 80 &&
    manifest.httpPort !== 443
  ) {
    issues.push({
      severity: "warning",
      field: "httpPort",
      message: `httpPort ${manifest.httpPort} is a privileged port. Consider using 8000 or higher.`,
      suggestion:
        "Use port 8000 (the Cloudron convention) unless your app requires a specific port.",
    })
  }

  return issues
}

/**
 * Validate healthCheckPath field
 */
export function validateHealthCheckPath(
  manifest: ParsedManifest,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (manifest.healthCheckPath === undefined) {
    issues.push({
      severity: "error",
      field: "healthCheckPath",
      message: "Missing required field: healthCheckPath",
      suggestion:
        'Add healthCheckPath (e.g., "/" or "/health") for Cloudron to check app health.',
    })
  } else if (typeof manifest.healthCheckPath !== "string") {
    issues.push({
      severity: "error",
      field: "healthCheckPath",
      message: "healthCheckPath must be a string",
    })
  } else if (!manifest.healthCheckPath.startsWith("/")) {
    issues.push({
      severity: "error",
      field: "healthCheckPath",
      message: "healthCheckPath must start with /",
    })
  }

  return issues
}

/**
 * Validate addons field
 */
export function validateAddons(manifest: ParsedManifest): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (manifest.addons === undefined) {
    issues.push({
      severity: "info",
      field: "addons",
      message: "No addons configured",
      suggestion:
        'Consider adding "localstorage" addon if your app needs persistent storage.',
    })
    return issues
  }

  if (
    typeof manifest.addons !== "object" ||
    manifest.addons === null ||
    Array.isArray(manifest.addons)
  ) {
    issues.push({
      severity: "error",
      field: "addons",
      message: "addons must be an object",
      suggestion: 'Use format: "addons": { "localstorage": {}, "mysql": {} }',
    })
    return issues
  }

  const addons = manifest.addons as Record<string, unknown>

  for (const addonName of Object.keys(addons)) {
    if (!VALID_ADDONS.includes(addonName)) {
      issues.push({
        severity: "warning",
        field: `addons.${addonName}`,
        message: `Unknown addon: "${addonName}"`,
        suggestion: `Valid addons are: ${VALID_ADDONS.join(", ")}`,
      })
    }

    const addonConfig = addons[addonName]
    if (typeof addonConfig !== "object" || addonConfig === null) {
      issues.push({
        severity: "error",
        field: `addons.${addonName}`,
        message: `Addon "${addonName}" configuration must be an object`,
        suggestion: `Use format: "${addonName}": {}`,
      })
    }
  }

  // Check for common addon combinations
  const hasDatabase = ["mysql", "postgresql", "mongodb"].some(
    db => db in addons,
  )
  if (hasDatabase && !("localstorage" in addons)) {
    issues.push({
      severity: "info",
      field: "addons",
      message: "Database addon configured without localstorage",
      suggestion:
        "Consider adding localstorage addon for config files and uploads.",
    })
  }

  return issues
}

/**
 * Validate memoryLimit field
 */
export function validateMemoryLimit(
  manifest: ParsedManifest,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (manifest.memoryLimit === undefined) {
    issues.push({
      severity: "info",
      field: "memoryLimit",
      message: "No memoryLimit specified (default: 256MB)",
      suggestion:
        "Consider setting memoryLimit based on your app's requirements.",
    })
    return issues
  }

  if (typeof manifest.memoryLimit !== "number") {
    issues.push({
      severity: "error",
      field: "memoryLimit",
      message: "memoryLimit must be a number (in bytes)",
    })
    return issues
  }

  const memoryMB = manifest.memoryLimit / (1024 * 1024)

  if (memoryMB < 64) {
    issues.push({
      severity: "warning",
      field: "memoryLimit",
      message: `memoryLimit of ${memoryMB}MB may be too low for most applications`,
      suggestion:
        "Consider at least 128MB for simple apps, 256MB+ for typical apps.",
    })
  }

  if (memoryMB > 4096) {
    issues.push({
      severity: "info",
      field: "memoryLimit",
      message: `memoryLimit of ${memoryMB}MB is quite high`,
      suggestion: "Ensure your app actually needs this much memory.",
    })
  }

  return issues
}

/**
 * Validate all manifest rules
 */
export function validateManifest(content: string): ValidationIssue[] {
  const { manifest, issues } = validateManifestJson(content)

  if (!manifest) {
    return issues
  }

  return [
    ...issues,
    ...validateManifestVersion(manifest),
    ...validateId(manifest),
    ...validateTitle(manifest),
    ...validateVersion(manifest),
    ...validateHttpPort(manifest),
    ...validateHealthCheckPath(manifest),
    ...validateAddons(manifest),
    ...validateMemoryLimit(manifest),
  ]
}
