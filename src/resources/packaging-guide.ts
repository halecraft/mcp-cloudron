/**
 * Cloudron Packaging Guide Resource
 *
 * Provides comprehensive documentation for creating Cloudron packages,
 * combining all documentation files and reference implementation examples.
 */

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Get the path to the resources/content directory
 */
function getContentPath(): string {
  // In development: src/resources -> resources/content
  // In production (dist): dist/resources -> resources/content
  return join(__dirname, "..", "..", "resources", "content")
}

/**
 * Get the path to the vendor/rocketchat-app directory
 */
function getVendorPath(): string {
  return join(__dirname, "..", "..", "vendor", "rocketchat-app")
}

/**
 * Load a documentation file from resources/content
 */
function loadDocFile(filename: string): string {
  try {
    const filepath = join(getContentPath(), filename)
    return readFileSync(filepath, "utf-8")
  } catch {
    return `[Error: Could not load ${filename}]`
  }
}

/**
 * Load a reference file from vendor/rocketchat-app
 */
function loadReferenceFile(filename: string): string {
  try {
    const filepath = join(getVendorPath(), filename)
    return readFileSync(filepath, "utf-8")
  } catch {
    return `[Error: Could not load ${filename}]`
  }
}

/**
 * Topic types for the packaging guide
 */
export type PackagingTopic =
  | "overview"
  | "manifest"
  | "dockerfile"
  | "addons"
  | "testing"
  | "publishing"

/**
 * App types for language-specific guidance
 */
export type AppType = "nodejs" | "php" | "python" | "java" | "go" | "static"

/**
 * Get the full packaging guide content
 */
export function getFullPackagingGuide(): string {
  const sections = [
    "# Cloudron Packaging Guide",
    "",
    "This comprehensive guide covers everything you need to know about creating Cloudron packages.",
    "",
    "## Table of Contents",
    "1. [Overview & Tutorial](#overview--tutorial)",
    "2. [Manifest Reference](#manifest-reference)",
    "3. [Addons](#addons)",
    "4. [Cheat Sheet & Best Practices](#cheat-sheet--best-practices)",
    "5. [CLI Reference](#cli-reference)",
    "6. [Publishing](#publishing)",
    "7. [Reference Implementation](#reference-implementation)",
    "",
    "---",
    "",
    "## Overview & Tutorial",
    "",
    loadDocFile("packaging-tutorial.md"),
    "",
    "---",
    "",
    "## Manifest Reference",
    "",
    loadDocFile("manifest-reference.md"),
    "",
    "---",
    "",
    "## Addons",
    "",
    loadDocFile("addons.md"),
    "",
    "---",
    "",
    "## Cheat Sheet & Best Practices",
    "",
    loadDocFile("cheat-sheet.md"),
    "",
    "---",
    "",
    "## CLI Reference",
    "",
    loadDocFile("cloudron-cli.md"),
    "",
    "---",
    "",
    "## Publishing",
    "",
    loadDocFile("publishing-to-cloudron-app-store.md"),
    "",
    "---",
    "",
    "## Reference Implementation",
    "",
    "Below is a complete reference implementation from the Rocket.Chat Cloudron package.",
    "",
    "### CloudronManifest.json",
    "",
    "```json",
    loadReferenceFile("CloudronManifest.json"),
    "```",
    "",
    "### Dockerfile",
    "",
    "```dockerfile",
    loadReferenceFile("Dockerfile"),
    "```",
    "",
    "### start.sh",
    "",
    "```bash",
    loadReferenceFile("start.sh"),
    "```",
    "",
  ]

  return sections.join("\n")
}

/**
 * Get topic-specific content from the packaging guide
 */
export function getTopicContent(
  topic: PackagingTopic,
  appType?: AppType,
): string {
  switch (topic) {
    case "overview":
      return getOverviewContent()
    case "manifest":
      return getManifestContent()
    case "dockerfile":
      return getDockerfileContent(appType)
    case "addons":
      return getAddonsContent()
    case "testing":
      return getTestingContent()
    case "publishing":
      return getPublishingContent()
    default:
      return `Unknown topic: ${topic}`
  }
}

function getOverviewContent(): string {
  return `# Cloudron Packaging Overview

## Quick Start Checklist

1. **Prerequisites**
   - Install Cloudron CLI: \`sudo npm install -g cloudron\`
   - Install Docker
   - Login to your Cloudron: \`cloudron login my.example.com\`

2. **Required Files**
   - \`CloudronManifest.json\` - App metadata and configuration
   - \`Dockerfile\` - Build instructions using \`cloudron/base\` image
   - \`start.sh\` - Startup script (optional but recommended)

3. **Development Workflow**
   \`\`\`bash
   # Build the app
   cloudron build
   
   # Install on Cloudron
   cloudron install --location app.example.com --image username/app:tag
   
   # View logs
   cloudron logs --app app.example.com
   
   # Update after changes
   cloudron update --app app.example.com --image docker.halecraft.org/relm:1.0.1
   \`\`\`

4. **Key Concepts**
   - Apps run in read-only containers
   - Use \`/app/data\` for persistent storage (requires localstorage addon)
   - Use \`/run\` for runtime files (not persisted)
   - Environment variables provide addon connection info

## Sample Apps

Clone these to get started:
- Node.js: \`git clone https://git.cloudron.io/docs/tutorial-nodejs-app\`
- PHP: \`git clone https://git.cloudron.io/docs/tutorial-php-app\`
- Multi-process: \`git clone https://git.cloudron.io/docs/tutorial-supervisor-app\`

${loadDocFile("packaging-tutorial.md")}`
}

function getManifestContent(): string {
  const manifest = loadReferenceFile("CloudronManifest.json")

  return `# CloudronManifest.json Reference

## Example Manifest (Rocket.Chat)

\`\`\`json
${manifest}
\`\`\`

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| \`manifestVersion\` | integer | Always set to \`2\` |
| \`httpPort\` | integer | Port your app listens on for HTTP |
| \`healthCheckPath\` | string | Path for health checks (e.g., "/") |
| \`version\` | semver | Package version (e.g., "1.0.0") |

## Common Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| \`id\` | string | Reverse domain ID (e.g., "com.example.app") |
| \`title\` | string | Display name |
| \`addons\` | object | Required platform services |
| \`memoryLimit\` | integer | Memory limit in bytes (default: 256MB) |
| \`optionalSso\` | boolean | Allow installation without Cloudron auth |

${loadDocFile("manifest-reference.md")}`
}

function getDockerfileContent(appType?: AppType): string {
  const dockerfile = loadReferenceFile("Dockerfile")
  const startScript = loadReferenceFile("start.sh")

  let languageSpecific = ""

  switch (appType) {
    case "nodejs":
      languageSpecific = `
## Node.js Specific Tips

- The base image includes Node.js - check version with \`node -v\`
- Use \`gosu cloudron:cloudron\` to run as non-root user
- Example: \`exec /usr/local/bin/gosu cloudron:cloudron node /app/code/server.js\`
`
      break
    case "php":
      languageSpecific = `
## PHP Specific Tips

- Configure Apache to listen on port 8000
- Move PHP sessions to \`/run/php/sessions\`
- Change ownership to \`www-data:www-data\` for web files
- Example session fix:
  \`\`\`dockerfile
  RUN rm -rf /var/lib/php/sessions && ln -s /run/php/sessions /var/lib/php/sessions
  \`\`\`
`
      break
    case "python":
      languageSpecific = `
## Python Specific Tips

- Install dependencies in Dockerfile
- Use virtual environments if needed
- Run with gunicorn or uvicorn for production
`
      break
    case "java":
      languageSpecific = `
## Java Specific Tips

- Java sees host memory, not container limit
- Set memory limits explicitly:
  \`\`\`bash
  ram=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes)
  ram_mb=$(numfmt --to-unit=1048576 --format "%fm" $ram)
  export JAVA_OPTS="-XX:MaxRAM=\${ram_mb}M"
  \`\`\`
`
      break
    case "go":
      languageSpecific = `
## Go Specific Tips

- Compile statically for smaller images
- Go binaries handle signals properly
- Example: \`CGO_ENABLED=0 go build -o /app/code/server\`
`
      break
    case "static":
      languageSpecific = `
## Static Site Tips

- Use nginx to serve static files
- Configure nginx to listen on port 8000
- Add nginx config to \`/etc/nginx/sites-enabled/\`
`
      break
  }

  return `# Dockerfile Best Practices

## Base Image

Always start with the Cloudron base image:
\`\`\`dockerfile
FROM cloudron/base:5.0.0@sha256:04fd70dbd8ad6149c19de39e35718e024417c3e01dc9c6637eaf4a41ec4e596c
\`\`\`

RSS feed of official base images is at https://git.cloudron.io/platform/docker-base-image/-/tags?format=atom

## Example Dockerfile (Rocket.Chat)

\`\`\`dockerfile
${dockerfile}
\`\`\`

## Example start.sh

\`\`\`bash
${startScript}
\`\`\`

## Key Patterns

1. **Read-only Filesystem**
   - Only \`/app/data\`, \`/run\`, and \`/tmp\` are writable
   - Create symlinks for config files that need to be writable

2. **Non-root User**
   - Start script runs as root for setup
   - Use \`gosu cloudron:cloudron\` to run app as non-root

3. **First-run Initialization**
   \`\`\`bash
   if [[ ! -f /app/data/.initialized ]]; then
     echo "First run setup..."
     # Setup commands
     touch /app/data/.initialized
   fi
   \`\`\`

4. **File Ownership**
   \`\`\`bash
   chown -R cloudron:cloudron /app/data
   \`\`\`

5. **Signal Handling**
   - Use \`exec\` for the final command to handle SIGTERM properly
${languageSpecific}

${loadDocFile("cheat-sheet.md")}`
}

function getAddonsContent(): string {
  return `# Cloudron Addons Reference

Addons are platform services (databases, auth, email, caching) managed by Cloudron.

## Quick Reference

| Addon | Environment Variables | Use Case |
|-------|----------------------|----------|
| \`localstorage\` | N/A | Persistent storage at /app/data |
| \`mysql\` | \`CLOUDRON_MYSQL_*\` | MySQL 8.0 database |
| \`postgresql\` | \`CLOUDRON_POSTGRESQL_*\` | PostgreSQL 14.9 database |
| \`mongodb\` | \`CLOUDRON_MONGODB_*\` | MongoDB 4.4 database |
| \`redis\` | \`CLOUDRON_REDIS_*\` | Redis 6.0 caching |
| \`ldap\` | \`CLOUDRON_LDAP_*\` | LDAP authentication |
| \`oidc\` | \`CLOUDRON_OIDC_*\` | OpenID Connect auth |
| \`sendmail\` | \`CLOUDRON_MAIL_SMTP_*\` | Send emails |
| \`recvmail\` | \`CLOUDRON_MAIL_IMAP_*\` | Receive emails |
| \`scheduler\` | N/A | Cron-like task scheduling |

## Example Addon Configuration

\`\`\`json
{
  "addons": {
    "localstorage": {},
    "mongodb": {
      "oplog": true
    },
    "sendmail": {
      "supportsDisplayName": true
    },
    "oidc": {
      "loginRedirectUri": "/_oauth/callback"
    }
  }
}
\`\`\`

${loadDocFile("addons.md")}`
}

function getTestingContent(): string {
  const testFile = loadReferenceFile("test/test.js")

  return `# Testing Cloudron Packages

## Test Structure

Cloudron packages should include integration tests that verify:
1. Fresh installation works
2. Backup and restore preserves data
3. Updates from previous versions work
4. App functionality after restart

## Example Test (Rocket.Chat)

\`\`\`javascript
${testFile}
\`\`\`

## Test Patterns

### 1. Installation Test
\`\`\`javascript
it('install app', function () {
  execSync(\`cloudron install --location \${LOCATION}\`, EXEC_ARGS);
});
\`\`\`

### 2. Backup/Restore Test
\`\`\`javascript
it('backup app', function () {
  execSync(\`cloudron backup create --app \${app.id}\`, EXEC_ARGS);
});

it('restore app', function () {
  const backups = JSON.parse(execSync(\`cloudron backup list --raw --app \${app.id}\`));
  execSync(\`cloudron restore --backup \${backups[0].id} --app \${app.id}\`, EXEC_ARGS);
});
\`\`\`

### 3. Update Test
\`\`\`javascript
it('can install previous version', function () {
  execSync(\`cloudron install --appstore-id com.example.app --location \${LOCATION}\`, EXEC_ARGS);
});

it('can update', function () {
  execSync(\`cloudron update --app \${LOCATION}\`, EXEC_ARGS);
});
\`\`\`

## Running Tests

\`\`\`bash
# Set credentials
export USERNAME=admin
export PASSWORD=secret

# Run tests
cd test && npm test
\`\`\`

## CI/CD Integration

Use \`--server\` and \`--token\` for automated testing:
\`\`\`bash
cloudron update --server my.example.com --token YOUR_TOKEN --app blog.example.com
\`\`\``
}

function getPublishingContent(): string {
  return `# Publishing to Cloudron App Store

${loadDocFile("publishing-to-cloudron-app-store.md")}

## Publishing Checklist

1. **Before Starting**
   - [ ] Post in App Wishlist forum category
   - [ ] Check for existing packages

2. **Package Requirements**
   - [ ] Open Source license (MIT, GPL, BSD, etc.)
   - [ ] CloudronManifest.json with all required fields
   - [ ] Working Dockerfile
   - [ ] Integration tests

3. **Testing**
   - [ ] Fresh install works
   - [ ] Backup/restore preserves data
   - [ ] Update from previous version works
   - [ ] SSO integration (if applicable)

4. **Submission**
   - [ ] Post in App Wishlist topic
   - [ ] Cloudron team reviews and takes over maintenance
   - [ ] Package published to https://git.cloudron.io

## CLI Commands for Publishing

\`\`\`bash
# Build and push image
cloudron build

# Install for testing
cloudron install --image username/app:tag

# Verify everything works
cloudron logs -f

# Submit for review (via forum)
\`\`\``
}

/**
 * Resource URI for the packaging guide
 */
export const PACKAGING_GUIDE_URI = "cloudron://packaging-guide"

/**
 * Resource metadata
 */
export const PACKAGING_GUIDE_RESOURCE = {
  uri: PACKAGING_GUIDE_URI,
  name: "Cloudron Packaging Guide",
  description:
    "Comprehensive guide for creating Cloudron packages, including documentation, best practices, and reference implementations.",
  mimeType: "text/markdown",
}
