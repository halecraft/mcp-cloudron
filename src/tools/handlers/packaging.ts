/**
 * Packaging Guide Tool Handler
 *
 * Provides interactive, topic-specific guidance for creating Cloudron packages.
 */

import {
  type AppType,
  getTopicContent,
  type PackagingTopic,
} from "../../resources/packaging-guide.js"
import type { ToolRegistry } from "../registry.js"
import { errorResponse, textResponse } from "../response.js"

/**
 * Valid topics for the packaging guide
 */
const VALID_TOPICS: PackagingTopic[] = [
  "overview",
  "manifest",
  "dockerfile",
  "addons",
  "testing",
  "publishing",
]

/**
 * Valid app types for language-specific guidance
 */
const VALID_APP_TYPES: AppType[] = [
  "nodejs",
  "php",
  "python",
  "java",
  "go",
  "static",
]

/**
 * Input schema for the packaging guide tool
 */
interface PackagingGuideInput {
  topic: string
  appType?: string
}

/**
 * Validate and parse the input
 */
function parseInput(args: unknown): PackagingGuideInput {
  if (!args || typeof args !== "object") {
    throw new Error("Invalid input: expected an object")
  }

  const input = args as Record<string, unknown>

  if (!input.topic || typeof input.topic !== "string") {
    throw new Error("Invalid input: topic is required and must be a string")
  }

  const result: PackagingGuideInput = {
    topic: input.topic,
  }

  if (input.appType !== undefined) {
    if (typeof input.appType !== "string") {
      throw new Error("Invalid input: appType must be a string")
    }
    result.appType = input.appType
  }

  return result
}

/**
 * Handler for the cloudron_packaging_guide tool
 */
async function handlePackagingGuide(args: unknown) {
  try {
    const input = parseInput(args)

    // Validate topic
    if (!VALID_TOPICS.includes(input.topic as PackagingTopic)) {
      return errorResponse(
        `Invalid topic: "${input.topic}". Valid topics are: ${VALID_TOPICS.join(", ")}`,
      )
    }

    // Validate appType if provided
    let appType: AppType | undefined
    if (input.appType) {
      if (!VALID_APP_TYPES.includes(input.appType as AppType)) {
        return errorResponse(
          `Invalid appType: "${input.appType}". Valid app types are: ${VALID_APP_TYPES.join(", ")}`,
        )
      }
      appType = input.appType as AppType
    }

    // Get topic-specific content
    const content = getTopicContent(input.topic as PackagingTopic, appType)

    return textResponse(content)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred"
    return errorResponse(message)
  }
}

/**
 * Packaging tool handlers registry
 */
export const packagingHandlers: ToolRegistry = {
  cloudron_packaging_guide: handlePackagingGuide,
}
