/**
 * Cloudron Package Scaffolding Module
 *
 * Provides tools for generating Cloudron package scaffolds.
 */

export {
  generateScaffold,
  ScaffoldValidationError,
  VALID_ADDONS,
  VALID_APP_TYPES,
  VALID_AUTH_METHODS,
  validateScaffoldInput,
} from "./generator.js"

export type {
  AuthMethod,
  CloudronAddon,
  ScaffoldAppType,
  ScaffoldInput,
  ScaffoldOutput,
} from "./types.js"
