/**
 * Package Validator
 *
 * Aggregates all validation rules for Cloudron packages.
 */

import { validateDockerfile } from "./dockerfile-rules.js"
import {
  type ValidationIssue,
  validateManifest,
  validateManifestJson,
} from "./package-rules.js"
import { validateStartScript } from "./startscript-rules.js"

/**
 * Package validation input
 */
export interface PackageValidationInput {
  /** CloudronManifest.json content */
  manifest?: string | undefined
  /** Dockerfile content */
  dockerfile?: string | undefined
  /** start.sh content */
  startScript?: string | undefined
}

/**
 * Package validation result
 */
export interface PackageValidationResult {
  /** Overall validation passed (no errors) */
  valid: boolean
  /** Blocking errors that must be fixed */
  errors: ValidationIssue[]
  /** Warnings that should be addressed */
  warnings: ValidationIssue[]
  /** Informational suggestions */
  suggestions: ValidationIssue[]
  /** Summary statistics */
  summary: {
    totalIssues: number
    errorCount: number
    warningCount: number
    infoCount: number
    filesValidated: string[]
  }
}

/**
 * Extract httpPort from manifest content
 */
function extractHttpPort(manifestContent: string): number | undefined {
  const { manifest } = validateManifestJson(manifestContent)
  if (manifest && typeof manifest.httpPort === "number") {
    return manifest.httpPort
  }
  return undefined
}

/**
 * Extract addons from manifest content
 */
function extractAddons(manifestContent: string): string[] {
  const { manifest } = validateManifestJson(manifestContent)
  if (
    manifest &&
    typeof manifest.addons === "object" &&
    manifest.addons !== null
  ) {
    return Object.keys(manifest.addons as Record<string, unknown>)
  }
  return []
}

/**
 * Validate a complete Cloudron package
 */
export function validatePackage(
  input: PackageValidationInput,
): PackageValidationResult {
  const allIssues: ValidationIssue[] = []
  const filesValidated: string[] = []

  // Extract manifest info for cross-file validation
  let httpPort: number | undefined
  let addons: string[] = []

  // Validate manifest
  if (input.manifest) {
    filesValidated.push("CloudronManifest.json")
    const manifestIssues = validateManifest(input.manifest)
    allIssues.push(
      ...manifestIssues.map(issue => ({
        ...issue,
        field: `manifest.${issue.field}`,
      })),
    )

    // Extract info for other validations
    httpPort = extractHttpPort(input.manifest)
    addons = extractAddons(input.manifest)
  }

  // Validate Dockerfile
  if (input.dockerfile) {
    filesValidated.push("Dockerfile")
    const dockerfileIssues = validateDockerfile(input.dockerfile, httpPort)
    allIssues.push(
      ...dockerfileIssues.map(issue => ({
        ...issue,
        field: `dockerfile.${issue.field}`,
      })),
    )
  }

  // Validate start script
  if (input.startScript) {
    filesValidated.push("start.sh")
    const startScriptIssues = validateStartScript(input.startScript, addons)
    allIssues.push(
      ...startScriptIssues.map(issue => ({
        ...issue,
        field: `startScript.${issue.field}`,
      })),
    )
  }

  // Categorize issues by severity
  const errors = allIssues.filter(i => i.severity === "error")
  const warnings = allIssues.filter(i => i.severity === "warning")
  const suggestions = allIssues.filter(i => i.severity === "info")

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    summary: {
      totalIssues: allIssues.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      infoCount: suggestions.length,
      filesValidated,
    },
  }
}

/**
 * Format validation result as markdown
 */
export function formatValidationResult(
  result: PackageValidationResult,
): string {
  const lines: string[] = []

  // Header
  if (result.valid) {
    lines.push("# ✅ Package Validation Passed")
  } else {
    lines.push("# ❌ Package Validation Failed")
  }
  lines.push("")

  // Summary
  lines.push("## Summary")
  lines.push("")
  lines.push(
    `- **Files validated**: ${result.summary.filesValidated.join(", ") || "None"}`,
  )
  lines.push(`- **Total issues**: ${result.summary.totalIssues}`)
  lines.push(`  - Errors: ${result.summary.errorCount}`)
  lines.push(`  - Warnings: ${result.summary.warningCount}`)
  lines.push(`  - Suggestions: ${result.summary.infoCount}`)
  lines.push("")

  // Errors
  if (result.errors.length > 0) {
    lines.push("## ❌ Errors (must fix)")
    lines.push("")
    for (const error of result.errors) {
      lines.push(`### ${error.field}`)
      lines.push("")
      lines.push(`**Issue**: ${error.message}`)
      if (error.suggestion) {
        lines.push("")
        lines.push(`**Fix**: ${error.suggestion}`)
      }
      lines.push("")
    }
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push("## ⚠️ Warnings (should fix)")
    lines.push("")
    for (const warning of result.warnings) {
      lines.push(`### ${warning.field}`)
      lines.push("")
      lines.push(`**Issue**: ${warning.message}`)
      if (warning.suggestion) {
        lines.push("")
        lines.push(`**Fix**: ${warning.suggestion}`)
      }
      lines.push("")
    }
  }

  // Suggestions
  if (result.suggestions.length > 0) {
    lines.push("## 💡 Suggestions (optional)")
    lines.push("")
    for (const suggestion of result.suggestions) {
      lines.push(`- **${suggestion.field}**: ${suggestion.message}`)
      if (suggestion.suggestion) {
        lines.push(`  - ${suggestion.suggestion}`)
      }
    }
    lines.push("")
  }

  // Next steps
  if (!result.valid) {
    lines.push("## Next Steps")
    lines.push("")
    lines.push("1. Fix all errors listed above")
    lines.push("2. Address warnings for better compatibility")
    lines.push("3. Consider implementing suggestions for best practices")
    lines.push("4. Re-run validation to verify fixes")
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Export types
 */
export type { ValidationIssue }
