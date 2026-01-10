/**
 * Formatters for MCP tool responses
 *
 * Functions to format Cloudron data types into human-readable strings.
 */

import type { App, Backup, Domain, Service, User } from "../types.js"

/**
 * Format an app for display
 */
export function formatApp(app: App): string {
  const fqdn = app.location ? `${app.location}.${app.domain}` : app.domain
  return `${app.manifest.title} (${fqdn})
  ID: ${app.id}
  State: ${app.installationState}
  Health: ${app.health ?? "unknown"}
  Memory: ${Math.round(app.memoryLimit / 1024 / 1024)} MB`
}

/**
 * Format a backup for display
 */
export function formatBackup(backup: Backup, index: number): string {
  const timestamp = new Date(backup.creationTime).toLocaleString()
  const size = backup.size
    ? `${Math.round(backup.size / 1024 / 1024)} MB`
    : "N/A"
  const appCount = backup.appCount !== undefined ? backup.appCount : "N/A"

  return `${index + 1}. Backup ${backup.id}
  Timestamp: ${timestamp}
  Version: ${backup.version}
  Type: ${backup.type}
  State: ${backup.state}
  Size: ${size}
  App Count: ${appCount}${backup.errorMessage ? `\n  Error: ${backup.errorMessage}` : ""}`
}

/**
 * Format a user for display
 */
export function formatUser(user: User, index: number): string {
  const createdAt = new Date(user.createdAt).toLocaleString()

  return `${index + 1}. ${user.username} (${user.email})
  ID: ${user.id}
  Role: ${user.role}
  Created: ${createdAt}`
}

/**
 * Format a domain for display
 */
export function formatDomain(domain: Domain): string {
  return `Domain: ${domain.domain}
  Zone: ${domain.zoneName}
  Provider: ${domain.provider}
  TLS: ${domain.tlsConfig.provider} (wildcard: ${domain.tlsConfig.wildcard})`
}

/**
 * Format storage info for display
 */
export function formatStorageInfo(
  storageInfo: {
    available_mb: number
    total_mb: number
    used_mb: number
    sufficient?: boolean
    warning: boolean
    critical: boolean
  },
  requiredMB?: number,
): string {
  let statusText = `Storage Status:
  Available: ${storageInfo.available_mb} MB
  Total: ${storageInfo.total_mb} MB
  Used: ${storageInfo.used_mb} MB`

  if (requiredMB !== undefined) {
    statusText += `\n  Required: ${requiredMB} MB`
    statusText += `\n  Sufficient: ${storageInfo.sufficient ? "Yes" : "No"}`
  }

  if (storageInfo.critical) {
    statusText += "\n  ⚠️  CRITICAL: Less than 5% disk space remaining!"
  } else if (storageInfo.warning) {
    statusText += "\n  ⚠️  WARNING: Less than 10% disk space remaining"
  }

  return statusText
}

/**
 * Format validation result for display
 */
export function formatValidationResult(
  operation: string,
  resourceId: string,
  validationResult: {
    valid: boolean
    errors: string[]
    warnings: string[]
    recommendations: string[]
  },
): string {
  let statusText = `Validation Result for ${operation} on resource '${resourceId}':
  Valid: ${validationResult.valid ? "Yes" : "No"}`

  if (validationResult.errors.length > 0) {
    statusText += "\n\nBlocking Errors:"
    validationResult.errors.forEach((error, i) => {
      statusText += `\n  ${i + 1}. ${error}`
    })
  }

  if (validationResult.warnings.length > 0) {
    statusText += "\n\nWarnings:"
    validationResult.warnings.forEach((warning, i) => {
      statusText += `\n  ${i + 1}. ${warning}`
    })
  }

  if (validationResult.recommendations.length > 0) {
    statusText += "\n\nRecommendations:"
    validationResult.recommendations.forEach((rec, i) => {
      statusText += `\n  ${i + 1}. ${rec}`
    })
  }

  if (validationResult.valid) {
    statusText += "\n\n✅ Operation can proceed (warnings should be reviewed)"
  } else {
    statusText += "\n\n❌ Operation blocked due to errors listed above"
  }

  return statusText
}

/**
 * Format task status for display
 */
export function formatTaskStatus(taskStatus: {
  id: string
  state: string
  progress: number
  message: string
  result?: unknown
  error?: { message: string; code?: string }
}): string {
  let statusText = `Task Status:
  ID: ${taskStatus.id}
  State: ${taskStatus.state}
  Progress: ${taskStatus.progress}%
  Message: ${taskStatus.message}`

  if (taskStatus.state === "success" && taskStatus.result) {
    statusText += `\n  Result: ${JSON.stringify(taskStatus.result, null, 2)}`
  }

  if (taskStatus.state === "error" && taskStatus.error) {
    statusText += `\n  Error: ${taskStatus.error.message}`
    if (taskStatus.error.code) {
      statusText += `\n  Error Code: ${taskStatus.error.code}`
    }
  }

  if (taskStatus.state === "cancelled") {
    statusText += "\n  ℹ️  Task was cancelled by user request"
  }

  return statusText
}

/**
 * Format config changes summary for display
 */
export function formatConfigChanges(config: Record<string, unknown>): string {
  return Object.keys(config)
    .map(key => {
      if (key === "env") {
        const envCount = Object.keys(config.env as object).length
        return `  - Environment variables: ${envCount} variable(s) updated`
      } else if (key === "memoryLimit") {
        return `  - Memory limit: ${config.memoryLimit} MB`
      } else if (key === "accessRestriction") {
        return `  - Access restriction: ${config.accessRestriction ?? "none"}`
      } else {
        return `  - ${key}: updated`
      }
    })
    .join("\n")
}

/**
 * Format async task response with consistent guidance
 * Standardizes how all async operations communicate task tracking to the AI
 */
export function formatAsyncTaskResponse(
  operation: string,
  taskId: string,
  additionalInfo?: string,
): string {
  let response = `${operation} initiated successfully.

Task ID: ${taskId}

Use cloudron_task_status with taskId="${taskId}" to track progress.`

  if (additionalInfo) {
    response += `\n\n${additionalInfo}`
  }

  return response
}

/**
 * Format a service for display
 */
export function formatService(service: Service, index: number): string {
  const statusIcon =
    service.status === "running"
      ? "✅"
      : service.status === "stopped"
        ? "⏹️"
        : service.status === "error"
          ? "❌"
          : "❓"

  let text = `${index + 1}. ${service.name} ${statusIcon}
  Status: ${service.status}`

  if (service.version) {
    text += `\n  Version: ${service.version}`
  }

  if (service.memory !== undefined) {
    const memoryMB = Math.round(service.memory / 1024 / 1024)
    text += `\n  Memory: ${memoryMB} MB`
  }

  if (service.error) {
    text += `\n  Error: ${service.error}`
  }

  return text
}

/**
 * Format service list for display (read-only diagnostics)
 */
export function formatServiceList(services: Service[]): string {
  if (services.length === 0) {
    return "No services found."
  }

  const formatted = services.map((s, i) => formatService(s, i)).join("\n\n")

  return `Platform Services (read-only diagnostics):

${formatted}

Note: This is diagnostic information. Services are managed by Cloudron automatically.`
}
