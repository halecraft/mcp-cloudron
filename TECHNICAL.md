# Technical Documentation: mcp-cloudron

## Overview

`mcp-cloudron` is a Model Context Protocol (MCP) server that provides AI assistants (like Claude) with tools to manage Cloudron instances. It wraps the Cloudron REST API and exposes it as MCP tools that can be invoked by AI agents.

**Package:** `@halecraft/mcp-cloudron`  
**Version:** 0.1.0  
**Runtime:** Node.js ≥18.0.0  
**Language:** TypeScript (ESM)

## Architecture

### High-Level Flow

```
┌─────────────────┐     stdio      ┌─────────────────┐     HTTPS     ┌─────────────────┐
│   AI Assistant  │ ◄────────────► │   MCP Server    │ ◄───────────► │  Cloudron API   │
│   (e.g. Claude) │                │  (server.ts)    │               │  (REST v1)      │
└─────────────────┘                └─────────────────┘               └─────────────────┘
```

### Core Components

```
src/
├── server.ts           # MCP server entry point (stdio transport)
├── index.ts            # Library exports for programmatic use
├── cloudron-client.ts  # HTTP client for Cloudron REST API
├── config.ts           # Centralized configuration constants
├── errors.ts           # Custom error classes
├── types.ts            # TypeScript type definitions
└── tools/
    ├── definitions.ts  # MCP tool schemas (JSON Schema)
    ├── registry.ts     # Tool handler registry pattern
    ├── response.ts     # MCP response helpers
    ├── validators.ts   # Runtime argument validation
    ├── formatters.ts   # Human-readable output formatting
    └── handlers/       # Tool implementation by domain
        ├── index.ts    # Combined handler registry
        ├── apps.ts     # App management tools
        ├── appstore.ts # App Store search/validation
        ├── backups.ts  # Backup operations
        ├── domains.ts  # Domain listing
        ├── logs.ts     # Log retrieval
        ├── system.ts   # System status, tasks, storage
        └── users.ts    # User management
```

## MCP Server Implementation

### Entry Point ([`src/server.ts`](src/server.ts))

The server uses the `@modelcontextprotocol/sdk` to create an MCP server with stdio transport:

```typescript
const server = new Server(
  { name: "cloudron-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Key Design Decisions:**

- **Lazy client initialization:** The [`CloudronClient`](src/cloudron-client.ts) is created on first tool invocation, not at startup. This defers environment variable validation until actually needed.
- **Handler registry pattern:** Tools are dispatched via a lookup table rather than a switch statement, making it easy to add new tools.

### Tool Registration

Tools are defined in [`src/tools/definitions.ts`](src/tools/definitions.ts) as an array of MCP tool schemas. Each tool has:

- `name`: Unique identifier (e.g., `cloudron_list_apps`)
- `description`: Human-readable description for the AI
- `inputSchema`: JSON Schema for arguments

The server responds to `ListToolsRequest` by returning the `TOOLS` array.

### Tool Dispatch

When a `CallToolRequest` arrives:

1. Look up handler in [`allHandlers`](src/tools/handlers/index.ts) registry
2. Execute handler with parsed arguments and client
3. Return MCP response (text content or error)

## CloudronClient

The [`CloudronClient`](src/cloudron-client.ts) class wraps all Cloudron API interactions.

### Configuration

```typescript
constructor(config?: Partial<CloudronClientConfig>) {
  const baseUrl = config?.baseUrl ?? process.env.CLOUDRON_BASE_URL
  const token = config?.token ?? process.env.CLOUDRON_API_TOKEN
  // ... validation
}
```

Supports both:

- **Environment variables:** `CLOUDRON_BASE_URL`, `CLOUDRON_API_TOKEN`
- **Dependency injection:** Pass config object (used in tests)

### HTTP Layer

The private [`makeRequest()`](src/cloudron-client.ts:73) method handles:

- Bearer token authentication
- Request timeout (configurable, default 30s)
- JSON serialization/deserialization
- Error mapping via [`createErrorFromStatus()`](src/errors.ts:88)

**Note:** Retry logic is explicitly deferred to "Phase 3" per code comments.

### API Methods

| Method                      | Endpoint                        | Description           |
| --------------------------- | ------------------------------- | --------------------- |
| `listApps()`                | GET /api/v1/apps                | List installed apps   |
| `getApp(id)`                | GET /api/v1/apps/:id            | Get app details       |
| `getStatus()`               | GET /api/v1/cloudron/status     | System status         |
| `listBackups()`             | GET /api/v1/backups             | List backups          |
| `createBackup()`            | POST /api/v1/backups            | Create backup (async) |
| `listUsers()`               | GET /api/v1/users               | List users            |
| `createUser()`              | POST /api/v1/users              | Create user           |
| `listDomains()`             | GET /api/v1/domains             | List domains          |
| `searchApps(query)`         | GET /api/v1/appstore/apps       | Search App Store      |
| `startApp(id)`              | POST /api/v1/apps/:id/start     | Start app (async)     |
| `stopApp(id)`               | POST /api/v1/apps/:id/stop      | Stop app (async)      |
| `restartApp(id)`            | POST /api/v1/apps/:id/restart   | Restart app (async)   |
| `configureApp(id, config)`  | PUT /api/v1/apps/:id/configure  | Update app config     |
| `uninstallApp(id)`          | POST /api/v1/apps/:id/uninstall | Uninstall app (async) |
| `installApp(params)`        | POST /api/v1/apps               | Install app (async)   |
| `getTaskStatus(id)`         | GET /api/v1/tasks/:id           | Check async task      |
| `cancelTask(id)`            | DELETE /api/v1/tasks/:id        | Cancel async task     |
| `getLogs(id, type, lines)`  | GET /api/v1/apps/:id/logs       | Get logs              |
| `checkStorage(requiredMB)`  | GET /api/v1/cloudron/status     | Check disk space      |
| `validateOperation(op, id)` | (composite)                     | Pre-flight validation |
| `validateManifest(appId)`   | (composite)                     | Manifest validation   |

## Pre-flight Safety Checks

The project implements several safety mechanisms for destructive operations:

### Storage Checks ([`checkStorage()`](src/cloudron-client.ts:612))

Validates disk space before operations that create data:

- **Warning threshold:** <10% free space
- **Critical threshold:** <5% free space (blocks operation)
- **Minimum requirements:** 5GB for backup, 1GB for restore, 500MB for install

### Operation Validation ([`validateOperation()`](src/cloudron-client.ts:650))

Pre-flight checks for destructive operations:

- `uninstall_app`: Verifies app exists, checks installation state
- `delete_user`: Provides recommendations (limited implementation)
- `restore_backup`: Validates storage sufficiency

Returns a `ValidationResult` with:

- `valid`: Boolean - can operation proceed?
- `errors`: Blocking issues
- `warnings`: Non-blocking concerns
- `recommendations`: Best practices

### Manifest Validation ([`validateManifest()`](src/cloudron-client.ts:820))

Pre-installation checks:

1. Verify app exists in App Store
2. Check storage sufficiency
3. Warn about potential dependencies

## MCP Tools Reference

### App Management

| Tool                     | Description                          |
| ------------------------ | ------------------------------------ |
| `cloudron_list_apps`     | List all installed applications      |
| `cloudron_get_app`       | Get details for specific app         |
| `cloudron_control_app`   | Start/stop/restart an app            |
| `cloudron_configure_app` | Update env vars, memory, access      |
| `cloudron_uninstall_app` | Uninstall with pre-flight validation |
| `cloudron_install_app`   | Install from App Store               |

### App Store

| Tool                         | Description                 |
| ---------------------------- | --------------------------- |
| `cloudron_search_apps`       | Search available apps       |
| `cloudron_validate_manifest` | Pre-installation validation |

### System

| Tool                          | Description                    |
| ----------------------------- | ------------------------------ |
| `cloudron_get_status`         | Cloudron instance status       |
| `cloudron_task_status`        | Check async operation progress |
| `cloudron_cancel_task`        | Cancel running operation       |
| `cloudron_check_storage`      | Disk space check               |
| `cloudron_validate_operation` | Pre-flight safety check        |

### Backups

| Tool                     | Description       |
| ------------------------ | ----------------- |
| `cloudron_list_backups`  | List all backups  |
| `cloudron_create_backup` | Create new backup |

### Users

| Tool                   | Description           |
| ---------------------- | --------------------- |
| `cloudron_list_users`  | List all users        |
| `cloudron_create_user` | Create user with role |

### Other

| Tool                    | Description               |
| ----------------------- | ------------------------- |
| `cloudron_list_domains` | List configured domains   |
| `cloudron_get_logs`     | Retrieve app/service logs |

## Error Handling

### Error Classes ([`src/errors.ts`](src/errors.ts))

```typescript
class CloudronError extends Error {
  statusCode?: number;
  code?: string;
  cause?: unknown;

  isRetryable(): boolean; // 429 or 5xx
}

class CloudronAuthError extends CloudronError {
  // For 401/403 responses
}
```

### Error Flow

1. HTTP errors → [`createErrorFromStatus()`](src/errors.ts:88) → appropriate error class
2. Network errors → `CloudronError` with `NETWORK_ERROR` code
3. Timeout → `CloudronError` with `TIMEOUT` code
4. Tool handlers catch errors → return MCP error response

## Testing Architecture

### Test Configuration ([`vitest.config.ts`](vitest.config.ts))

Two test projects:

- **unit:** Tests in `tests/**/*.test.ts` (excludes integration)
- **integration:** Tests in `tests/integration/**/*.test.ts` (30s timeout)

### Test Helpers

**[`tests/helpers/cloudron-mock.ts`](tests/helpers/cloudron-mock.ts):**

- Mock data fixtures (apps, status, tasks)
- `createMockFetch()` - route-based fetch mock
- `setupTestEnv()` / `cleanupTestEnv()` - env var management

**[`tests/helpers/mcp-assert.ts`](tests/helpers/mcp-assert.ts):**

- MCP response structure assertions
- `assertSuccess()`, `assertError()`, `assertHasTextContent()`

### Test Pattern

```typescript
describe("cloudron_list_apps tool", () => {
  beforeAll(() => {
    setupTestEnv(); // Set CLOUDRON_BASE_URL, CLOUDRON_API_TOKEN
  });

  it("should list all installed apps", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/apps": {
        ok: true,
        status: 200,
        data: { apps: mockApps },
      },
    });

    const client = new CloudronClient();
    const apps = await client.listApps();

    expect(apps.length).toBe(3);
  });
});
```

### Integration Tests

Located in [`tests/integration/`](tests/integration/), these tests:

- Require real `CLOUDRON_BASE_URL` and `CLOUDRON_API_TOKEN`
- Skip automatically if env vars not set
- Test against live Cloudron instance

## Build & Development

### Scripts

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| `pnpm build`            | Compile TypeScript to `dist/`         |
| `pnpm dev`              | Watch mode with tsx                   |
| `pnpm test`             | Run unit tests                        |
| `pnpm test:integration` | Run integration tests                 |
| `pnpm verify`           | Run all checks (format, tests, types) |
| `pnpm verify:format`    | Biome lint/format check               |
| `pnpm verify:logic`     | Unit tests                            |
| `pnpm verify:types`     | TypeScript type check                 |

### Verification Script ([`scripts/verify.mjs`](scripts/verify.mjs))

Runs all verification tasks in parallel with:

- Colored terminal output (respects NO_COLOR)
- JSON output mode (`--json`)
- Configurable log verbosity (`--logs=all|failed|none`)

### Code Style

Enforced by Biome ([`biome.json`](biome.json)):

- Tab indentation (formatter), space indentation (JS)
- Double quotes
- Trailing commas
- Semicolons as needed
- Organized imports

### TypeScript Configuration

Strict mode with additional checks:

- `noUncheckedIndexedAccess`: true
- `exactOptionalPropertyTypes`: true
- `verbatimModuleSyntax`: true

**Project rules (from AGENTS.md):**

- Non-null assertions forbidden
- `as unknown as` casting forbidden

## Configuration Constants ([`src/config.ts`](src/config.ts))

| Constant                     | Value | Purpose                       |
| ---------------------------- | ----- | ----------------------------- |
| `DEFAULT_TIMEOUT_MS`         | 30000 | HTTP request timeout          |
| `BACKUP_MIN_STORAGE_MB`      | 5120  | Minimum for backup creation   |
| `RESTORE_MIN_STORAGE_MB`     | 1024  | Minimum for backup restore    |
| `INSTALL_DEFAULT_STORAGE_MB` | 500   | Default for app installation  |
| `STORAGE_WARNING_THRESHOLD`  | 0.10  | 10% free space warning        |
| `STORAGE_CRITICAL_THRESHOLD` | 0.05  | 5% free space blocks ops      |
| `MAX_LOG_LINES`              | 1000  | Maximum retrievable log lines |
| `DEFAULT_LOG_LINES`          | 100   | Default log lines             |

## Type System

### Core Types ([`src/types.ts`](src/types.ts))

**App Types:**

- `App` - Installed application
- `AppManifest` - App metadata
- `AppConfig` - Configuration update payload
- `InstallAppParams` - Installation parameters

**System Types:**

- `SystemStatus` / `CloudronStatus` - Instance status
- `StorageInfo` - Disk space info
- `TaskStatus` - Async operation status
- `Domain` - Domain configuration
- `Backup` - Backup metadata
- `User` - User account

**Validation Types:**

- `ValidatableOperation` - Union of operation types
- `ValidationResult` - Pre-flight check result
- `ManifestValidationResult` - Install validation result

## Async Operations

Many Cloudron operations are asynchronous:

- App start/stop/restart
- App install/uninstall
- Backup creation

These return a `taskId` that can be polled via `cloudron_task_status`:

```typescript
interface TaskStatus {
  id: string;
  state: "pending" | "running" | "success" | "error" | "cancelled";
  progress: number; // 0-100
  message: string;
  result?: unknown;
  error?: { message: string; code?: string };
}
```

Tasks can be cancelled via `cloudron_cancel_task`.

## Deployment

### As MCP Server

Configure in Claude Desktop or other MCP clients:

```json
{
  "mcpServers": {
    "cloudron": {
      "command": "npx",
      "args": ["-y", "@halecraft/mcp-cloudron"],
      "env": {
        "CLOUDRON_BASE_URL": "https://my.cloudron.domain",
        "CLOUDRON_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

### As Library

```typescript
import { CloudronClient } from "@halecraft/mcp-cloudron";

const client = new CloudronClient({
  baseUrl: "https://my.cloudron.domain",
  token: "your-api-token",
});

const apps = await client.listApps();
```

## Future Considerations

Based on code comments and structure:

1. **Retry Logic (Phase 3):** Currently no retry on transient failures. The `isRetryable()` method exists but isn't used.

2. **Idempotency Keys:** Mentioned as prerequisite for retry logic.

3. **User Deletion Validation:** Currently limited - needs user existence check, last-admin check, active session check.

4. **Backup Integrity:** Validation recommends checking but doesn't implement checksum verification.

5. **App Dependencies:** Uninstall validation recommends checking but doesn't implement dependency resolution.
