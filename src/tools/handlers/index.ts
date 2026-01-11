/**
 * Handler exports and combined registry
 */

import { createRegistry, type ToolRegistry } from "../registry.js"
import { appHandlers } from "./apps.js"
import { appstoreHandlers } from "./appstore.js"
import { backupHandlers } from "./backups.js"
import { domainHandlers } from "./domains.js"
import { groupHandlers } from "./groups.js"
import { logHandlers } from "./logs.js"
import { packageValidationHandlers } from "./package-validation.js"
import { packagingHandlers } from "./packaging.js"
import { scaffoldingHandlers } from "./scaffolding.js"
import { serviceHandlers } from "./services.js"
import { systemHandlers } from "./system.js"
import { updateHandlers } from "./updates.js"
import { userHandlers } from "./users.js"

// Export individual handler registries
export {
  appHandlers,
  appstoreHandlers,
  backupHandlers,
  domainHandlers,
  groupHandlers,
  logHandlers,
  packageValidationHandlers,
  packagingHandlers,
  scaffoldingHandlers,
  serviceHandlers,
  systemHandlers,
  updateHandlers,
  userHandlers,
}

// Combined registry of all handlers
export const allHandlers: ToolRegistry = createRegistry(
  appHandlers,
  appstoreHandlers,
  backupHandlers,
  domainHandlers,
  groupHandlers,
  logHandlers,
  packageValidationHandlers,
  packagingHandlers,
  scaffoldingHandlers,
  serviceHandlers,
  systemHandlers,
  updateHandlers,
  userHandlers,
)
