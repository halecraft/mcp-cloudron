/**
 * Package Validation Tool Handler
 *
 * Validates Cloudron package files and provides actionable feedback.
 */

import {
  formatValidationResult,
  type PackageValidationInput,
  validatePackage,
} from "../../validation/package-validator.js"
import type { ToolRegistry } from "../registry.js"
import { errorResponse, textResponse } from "../response.js"

/**
 * Input schema for the package validation tool
 */
interface ValidatePackageInput {
  manifest?: string
  dockerfile?: string
  startScript?: string
}

/**
 * Parse and validate input
 */
function parseInput(args: unknown): ValidatePackageInput {
  if (!args || typeof args !== "object") {
    throw new Error("Invalid input: expected an object")
  }

  const input = args as Record<string, unknown>
  const result: ValidatePackageInput = {}

  // At least one file must be provided
  if (!input.manifest && !input.dockerfile && !input.startScript) {
    throw new Error(
      "At least one file must be provided: manifest, dockerfile, or startScript",
    )
  }

  if (input.manifest !== undefined) {
    if (typeof input.manifest !== "string") {
      throw new Error("manifest must be a string containing the file content")
    }
    result.manifest = input.manifest
  }

  if (input.dockerfile !== undefined) {
    if (typeof input.dockerfile !== "string") {
      throw new Error("dockerfile must be a string containing the file content")
    }
    result.dockerfile = input.dockerfile
  }

  if (input.startScript !== undefined) {
    if (typeof input.startScript !== "string") {
      throw new Error(
        "startScript must be a string containing the file content",
      )
    }
    result.startScript = input.startScript
  }

  return result
}

/**
 * Handler for the cloudron_validate_package tool
 */
async function handleValidatePackage(args: unknown) {
  try {
    const input = parseInput(args)

    // Convert to validation input
    const validationInput: PackageValidationInput = {
      manifest: input.manifest,
      dockerfile: input.dockerfile,
      startScript: input.startScript,
    }

    // Run validation
    const result = validatePackage(validationInput)

    // Format output
    const output = formatValidationResult(result)

    return textResponse(output)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred"
    return errorResponse(message)
  }
}

/**
 * Package validation tool handlers registry
 */
export const packageValidationHandlers: ToolRegistry = {
  cloudron_validate_package: handleValidatePackage,
}
