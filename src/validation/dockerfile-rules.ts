/**
 * Dockerfile Validation Rules
 *
 * Validates Dockerfiles for Cloudron package best practices.
 */

import type { ValidationIssue } from "./package-rules.js"

/**
 * Cloudron base image pattern
 */
const BASE_IMAGE_PATTERN = /^FROM\s+cloudron\/base/m

/**
 * Check for cloudron/base image
 */
export function validateBaseImage(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!BASE_IMAGE_PATTERN.test(content)) {
    issues.push({
      severity: "error",
      field: "FROM",
      message: "Dockerfile must use cloudron/base as the base image",
      suggestion:
        "Start your Dockerfile with: FROM cloudron/base:5.0.0@sha256:...",
    })
  }

  // Check for pinned version
  const fromMatch = content.match(/^FROM\s+cloudron\/base:?([^\s]*)/m)
  if (fromMatch) {
    const tag = fromMatch[1]
    if (!tag || tag === "latest") {
      issues.push({
        severity: "warning",
        field: "FROM",
        message: "Base image should be pinned to a specific version",
        suggestion:
          "Use a specific version like cloudron/base:5.0.0@sha256:... for reproducible builds.",
      })
    } else if (!tag.includes("@sha256:")) {
      issues.push({
        severity: "info",
        field: "FROM",
        message: "Consider pinning base image with SHA256 digest",
        suggestion:
          "Add @sha256:... after the version for maximum reproducibility.",
      })
    }
  }

  return issues
}

/**
 * Check for EXPOSE directive
 */
export function validateExposeDirective(
  content: string,
  expectedPort?: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const exposeMatch = content.match(/^EXPOSE\s+(\d+)/m)

  if (!exposeMatch || !exposeMatch[1]) {
    issues.push({
      severity: "warning",
      field: "EXPOSE",
      message: "No EXPOSE directive found",
      suggestion:
        "Add EXPOSE directive matching your httpPort from the manifest.",
    })
  } else if (expectedPort !== undefined) {
    const exposedPort = parseInt(exposeMatch[1], 10)
    if (exposedPort !== expectedPort) {
      issues.push({
        severity: "warning",
        field: "EXPOSE",
        message: `EXPOSE ${exposedPort} does not match manifest httpPort ${expectedPort}`,
        suggestion: `Change EXPOSE to ${expectedPort} to match your manifest.`,
      })
    }
  }

  return issues
}

/**
 * Check for CMD or ENTRYPOINT
 */
export function validateStartCommand(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const hasCMD = /^CMD\s+/m.test(content)
  const hasEntrypoint = /^ENTRYPOINT\s+/m.test(content)

  if (!hasCMD && !hasEntrypoint) {
    issues.push({
      severity: "error",
      field: "CMD",
      message: "No CMD or ENTRYPOINT directive found",
      suggestion:
        'Add CMD ["/app/code/start.sh"] to specify how to start your application.',
    })
  }

  // Check for start.sh pattern
  if (hasCMD || hasEntrypoint) {
    const usesStartScript = /start\.sh/.test(content)
    if (!usesStartScript) {
      issues.push({
        severity: "info",
        field: "CMD",
        message: "Consider using a start.sh script for startup",
        suggestion:
          "A start.sh script allows for initialization logic and proper signal handling.",
      })
    }
  }

  return issues
}

/**
 * Check for non-root user patterns
 */
export function validateNonRootUser(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Check for gosu usage (recommended pattern)
  const hasGosu = /gosu\s+(cloudron|www-data)/i.test(content)

  // Check for USER directive
  const hasUserDirective = /^USER\s+/m.test(content)

  if (!hasGosu && !hasUserDirective) {
    issues.push({
      severity: "info",
      field: "USER",
      message: "No non-root user pattern detected",
      suggestion:
        "Use gosu in start.sh to run your app as non-root: exec /usr/local/bin/gosu cloudron:cloudron ...",
    })
  }

  // Warn against USER directive in Dockerfile (should be in start.sh)
  if (hasUserDirective) {
    issues.push({
      severity: "warning",
      field: "USER",
      message: "USER directive found in Dockerfile",
      suggestion:
        "Consider using gosu in start.sh instead, which allows root for initialization then drops privileges.",
    })
  }

  return issues
}

/**
 * Check for proper WORKDIR
 */
export function validateWorkdir(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const workdirMatch = content.match(/^WORKDIR\s+(.+)/m)

  if (!workdirMatch || !workdirMatch[1]) {
    issues.push({
      severity: "info",
      field: "WORKDIR",
      message: "No WORKDIR directive found",
      suggestion: "Add WORKDIR /app/code to set the working directory.",
    })
  } else {
    const workdir = workdirMatch[1].trim()
    if (!workdir.startsWith("/app/")) {
      issues.push({
        severity: "warning",
        field: "WORKDIR",
        message: `WORKDIR "${workdir}" is not under /app/`,
        suggestion: "Use /app/code for application code.",
      })
    }
  }

  return issues
}

/**
 * Check for common Dockerfile issues
 */
export function validateDockerfilePatterns(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Check for apt-get without cleanup
  if (
    /apt-get\s+install/.test(content) &&
    !/rm\s+-rf\s+\/var\/lib\/apt\/lists/.test(content)
  ) {
    issues.push({
      severity: "warning",
      field: "RUN",
      message: "apt-get install without cleanup",
      suggestion:
        "Add && rm -rf /var/lib/apt/lists/* after apt-get install to reduce image size.",
    })
  }

  // Check for npm install without --only=production
  if (
    /npm\s+install/.test(content) &&
    !/npm\s+(ci|install)\s+.*--only=production/.test(content) &&
    !/npm\s+ci/.test(content)
  ) {
    issues.push({
      severity: "info",
      field: "RUN",
      message: "npm install without --only=production flag",
      suggestion: "Use npm ci --only=production for smaller production images.",
    })
  }

  // Check for COPY . before package.json (bad layer caching)
  const copyAllIndex = content.indexOf("COPY . ")
  const copyPackageIndex = content.indexOf("COPY package")
  if (
    copyAllIndex !== -1 &&
    copyPackageIndex !== -1 &&
    copyAllIndex < copyPackageIndex
  ) {
    issues.push({
      severity: "warning",
      field: "COPY",
      message: "COPY . appears before COPY package*.json",
      suggestion:
        "Copy package.json first, run npm install, then copy the rest for better layer caching.",
    })
  }

  // Check for chmod on start.sh
  if (/start\.sh/.test(content) && !/chmod\s+\+x.*start\.sh/.test(content)) {
    issues.push({
      severity: "warning",
      field: "RUN",
      message: "start.sh may not be executable",
      suggestion:
        "Add RUN chmod +x /app/code/start.sh to make the script executable.",
    })
  }

  return issues
}

/**
 * Validate all Dockerfile rules
 */
export function validateDockerfile(
  content: string,
  manifestHttpPort?: number,
): ValidationIssue[] {
  return [
    ...validateBaseImage(content),
    ...validateExposeDirective(content, manifestHttpPort),
    ...validateStartCommand(content),
    ...validateNonRootUser(content),
    ...validateWorkdir(content),
    ...validateDockerfilePatterns(content),
  ]
}
