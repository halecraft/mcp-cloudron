/**
 * start.sh Validation Rules
 *
 * Validates startup scripts for Cloudron package best practices.
 */

import type { ValidationIssue } from "./package-rules.js"

/**
 * Check for bash shebang
 */
export function validateShebang(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (
    !content.startsWith("#!/bin/bash") &&
    !content.startsWith("#!/usr/bin/env bash")
  ) {
    issues.push({
      severity: "warning",
      field: "shebang",
      message: "Script should start with #!/bin/bash",
      suggestion: "Add #!/bin/bash as the first line of your script.",
    })
  }

  return issues
}

/**
 * Check for set -eu (strict mode)
 */
export function validateStrictMode(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!/set\s+-[euo]+/.test(content) && !/set\s+-e/.test(content)) {
    issues.push({
      severity: "warning",
      field: "set",
      message: "Script should use 'set -eu' for error handling",
      suggestion:
        "Add 'set -eu' near the top of your script to exit on errors and undefined variables.",
    })
  }

  return issues
}

/**
 * Check for exec usage (signal handling)
 */
export function validateExecUsage(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Check if exec is used for the final command
  const hasExec = /\bexec\s+/.test(content)

  if (!hasExec) {
    issues.push({
      severity: "warning",
      field: "exec",
      message: "No 'exec' command found for starting the application",
      suggestion:
        "Use 'exec' for the final command to properly handle signals (SIGTERM). Example: exec /usr/local/bin/gosu cloudron:cloudron node server.js",
    })
  }

  return issues
}

/**
 * Check for gosu usage (non-root execution)
 */
export function validateGosuUsage(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const hasGosu = /gosu\s+(cloudron|www-data)/i.test(content)
  const hasSu = /\bsu\s+-/.test(content)
  const hasSudo = /\bsudo\s+/.test(content)

  if (!hasGosu && !hasSu && !hasSudo) {
    issues.push({
      severity: "info",
      field: "gosu",
      message: "No privilege dropping detected",
      suggestion:
        "Use gosu to run your application as non-root: exec /usr/local/bin/gosu cloudron:cloudron <command>",
    })
  }

  if (hasSu || hasSudo) {
    issues.push({
      severity: "warning",
      field: "gosu",
      message: "Using su or sudo instead of gosu",
      suggestion:
        "Prefer gosu over su/sudo for better signal handling in containers.",
    })
  }

  return issues
}

/**
 * Check for file ownership patterns
 */
export function validateOwnership(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const hasChown = /chown\s+/.test(content)

  if (!hasChown) {
    issues.push({
      severity: "info",
      field: "chown",
      message: "No chown commands found",
      suggestion:
        "Consider adding 'chown -R cloudron:cloudron /app/data' to ensure proper file ownership.",
    })
  }

  // Check for chown on /app/data
  if (hasChown && !/chown.*\/app\/data/.test(content)) {
    issues.push({
      severity: "info",
      field: "chown",
      message: "chown found but not for /app/data",
      suggestion:
        "Ensure /app/data has correct ownership: chown -R cloudron:cloudron /app/data",
    })
  }

  return issues
}

/**
 * Check for first-run initialization pattern
 */
export function validateFirstRunInit(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const hasInitCheck =
    /\.initialized/.test(content) || /first.?run/i.test(content)

  if (!hasInitCheck) {
    issues.push({
      severity: "info",
      field: "initialization",
      message: "No first-run initialization pattern detected",
      suggestion:
        "Consider adding first-run initialization: if [[ ! -f /app/data/.initialized ]]; then ... fi",
    })
  }

  return issues
}

/**
 * Check for environment variable usage
 */
export function validateEnvVarUsage(
  content: string,
  addons: string[] = [],
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Check for database env vars if database addon is used
  if (addons.includes("mysql") && !/CLOUDRON_MYSQL/.test(content)) {
    issues.push({
      severity: "warning",
      field: "env",
      message: "MySQL addon configured but CLOUDRON_MYSQL_* variables not used",
      suggestion:
        "Use CLOUDRON_MYSQL_HOST, CLOUDRON_MYSQL_DATABASE, etc. to connect to MySQL.",
    })
  }

  if (addons.includes("postgresql") && !/CLOUDRON_POSTGRESQL/.test(content)) {
    issues.push({
      severity: "warning",
      field: "env",
      message:
        "PostgreSQL addon configured but CLOUDRON_POSTGRESQL_* variables not used",
      suggestion:
        "Use CLOUDRON_POSTGRESQL_HOST, CLOUDRON_POSTGRESQL_DATABASE, etc. to connect to PostgreSQL.",
    })
  }

  if (addons.includes("mongodb") && !/CLOUDRON_MONGODB/.test(content)) {
    issues.push({
      severity: "warning",
      field: "env",
      message:
        "MongoDB addon configured but CLOUDRON_MONGODB_* variables not used",
      suggestion: "Use CLOUDRON_MONGODB_URL to connect to MongoDB.",
    })
  }

  if (addons.includes("redis") && !/CLOUDRON_REDIS/.test(content)) {
    issues.push({
      severity: "warning",
      field: "env",
      message: "Redis addon configured but CLOUDRON_REDIS_* variables not used",
      suggestion:
        "Use CLOUDRON_REDIS_HOST, CLOUDRON_REDIS_PORT, CLOUDRON_REDIS_PASSWORD to connect to Redis.",
    })
  }

  return issues
}

/**
 * Check for common script issues
 */
export function validateScriptPatterns(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Check for hardcoded paths that should be variables
  if (/\/home\/cloudron/.test(content)) {
    issues.push({
      severity: "warning",
      field: "paths",
      message: "Hardcoded /home/cloudron path found",
      suggestion:
        "Use /app/data for persistent storage instead of /home/cloudron.",
    })
  }

  // Check for sleep in startup (usually indicates a race condition workaround)
  if (/\bsleep\s+\d+/.test(content)) {
    issues.push({
      severity: "info",
      field: "sleep",
      message: "sleep command found in startup script",
      suggestion:
        "Consider using proper wait mechanisms instead of sleep for service dependencies.",
    })
  }

  // Check for background processes without wait
  if (/&\s*$/.test(content) && !/\bwait\b/.test(content)) {
    issues.push({
      severity: "warning",
      field: "background",
      message: "Background process started without wait",
      suggestion:
        "If starting background processes, ensure proper cleanup with 'wait' or trap handlers.",
    })
  }

  return issues
}

/**
 * Validate all start script rules
 */
export function validateStartScript(
  content: string,
  addons: string[] = [],
): ValidationIssue[] {
  return [
    ...validateShebang(content),
    ...validateStrictMode(content),
    ...validateExecUsage(content),
    ...validateGosuUsage(content),
    ...validateOwnership(content),
    ...validateFirstRunInit(content),
    ...validateEnvVarUsage(content, addons),
    ...validateScriptPatterns(content),
  ]
}
