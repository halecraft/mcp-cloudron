/**
 * Package Scaffolding Tool Handler
 *
 * Generates complete Cloudron package scaffolds with all required files.
 */

import {
  generateScaffold,
  ScaffoldValidationError,
  validateScaffoldInput,
} from "../../scaffolding/index.js"
import type { ToolRegistry } from "../registry.js"
import { errorResponse, textResponse } from "../response.js"

/**
 * Handler for the cloudron_scaffold_package tool
 */
async function handleScaffoldPackage(args: unknown) {
  try {
    // Validate and parse input
    const input = validateScaffoldInput(args)

    // Generate scaffold
    const scaffold = generateScaffold(input)

    // Format output as markdown with code blocks
    const output = formatScaffoldOutput(scaffold, input.appName)

    return textResponse(output)
  } catch (error) {
    if (error instanceof ScaffoldValidationError) {
      return errorResponse(
        `Validation error (${error.field}): ${error.message}`,
      )
    }
    const message =
      error instanceof Error ? error.message : "Unknown error occurred"
    return errorResponse(message)
  }
}

/**
 * Format scaffold output as markdown
 */
function formatScaffoldOutput(
  scaffold: {
    manifest: string
    dockerfile: string
    startScript: string
    testFile: string
    summary: string
  },
  _appName: string,
): string {
  const sections = [
    scaffold.summary,
    "",
    "---",
    "",
    "## CloudronManifest.json",
    "",
    "```json",
    scaffold.manifest,
    "```",
    "",
    "---",
    "",
    "## Dockerfile",
    "",
    "```dockerfile",
    scaffold.dockerfile,
    "```",
    "",
    "---",
    "",
    "## start.sh",
    "",
    "```bash",
    scaffold.startScript,
    "```",
    "",
    "---",
    "",
    "## test/test.js",
    "",
    "```javascript",
    scaffold.testFile,
    "```",
    "",
  ]

  return sections.join("\n")
}

/**
 * Scaffolding tool handlers registry
 */
export const scaffoldingHandlers: ToolRegistry = {
  cloudron_scaffold_package: handleScaffoldPackage,
}
