/**
 * MCP Resources Index
 *
 * Exports all MCP resources and handlers for the Cloudron MCP server.
 */

export {
  type AppType,
  getFullPackagingGuide,
  getTopicContent,
  PACKAGING_GUIDE_RESOURCE,
  PACKAGING_GUIDE_URI,
  type PackagingTopic,
} from "./packaging-guide.js"

/**
 * List of all available resources
 */
export const RESOURCES = [
  {
    uri: "cloudron://packaging-guide",
    name: "Cloudron Packaging Guide",
    description:
      "Comprehensive guide for creating Cloudron packages, including documentation, best practices, and reference implementations.",
    mimeType: "text/markdown",
  },
]
