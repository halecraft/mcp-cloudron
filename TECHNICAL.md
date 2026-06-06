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
├── config.ts           # Centralized configuration constants
├── errors.ts           # Custom error classes
├── types.ts            # TypeScript type definitions
├── client/             # HTTP client and per-domain API modules
│   ├── http-client.ts  # Base HTTP functionality (auth, timeout, errors)
│   ├── apps-api.ts     # App management operations
│   ├── users-api.ts    # User management operations
│   ├── backups-api.ts  # Backup operations
│   ├── groups-api.ts   # Group management operations
│   ├── system-api.ts   # System/status operations
│   ├── tasks-api.ts    # Async task tracking
│   ├── logs-api.ts     # Log retrieval
│   ├── updates-api.ts  # Platform updates
│   ├── appstore-api.ts # App store search
│   ├── context.ts      # CloudronContext aggregator + factory
│   └── index.ts        # Barrel export
├── validation/         # Pure validation functions and services
│   ├── validators.ts   # isValidEmail, isValidPassword, etc.
│   ├── validation-service.ts # Operation pre-flight validators
│   └── index.ts        # Barrel export
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
        ├── groups.ts   # Group management
        ├── logs.ts     # Log retrieval
        ├── services.ts # Platform services (diagnostics)
        ├── system.ts   # System status, tasks, storage
        ├── updates.ts  # Platform update management
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

## API Client Architecture

The Cloudron API is accessed through a modular client architecture under [`src/client/`](src/client/):

- **[`HttpClient`](src/client/http-client.ts)** — Base HTTP layer with Bearer auth, timeout (default 30s), and error mapping
- **Domain-specific API modules** — Each wraps a Cloudron API surface (e.g., `AppsApi`, `UsersApi`)
- **[`CloudronContext`](src/client/context.ts)** — Aggregates all API modules; created via `createCloudronContext()` from env vars

### HTTP Layer

The [`HttpClient`](src/client/http-client.ts) class handles:

- Bearer token authentication
- Request timeout (configurable, default 30s)
- JSON serialization/deserialization
- Error mapping via [`createErrorFromStatus()`](src/errors.ts:88)

**Note:** Retry logic is deferred to a future phase.

### API Modules

| Module | Key Methods | Endpoints |
| ------ | ----------- | --------- |
| `AppsApi` | `listApps`, `getApp`, `startApp`, `stopApp`, `restartApp`, `installApp`, `uninstallApp`, `configureApp`, `cloneApp`, `repairApp`, `restoreApp`, `updateApp`, `backupApp` | `/api/v1/apps/*` |
| `UsersApi` | `listUsers`, `getUser`, `createUser`, `updateUser`, `deleteUser` | `/api/v1/users/*` |
| `BackupsApi` | `listBackups`, `createBackup`, `backupApp` | `/api/v1/backups/*` |
| `GroupsApi` | `listGroups`, `createGroup` | `/api/v1/groups/*` |
| `SystemApi` | `getStatus`, `getDiskUsage`, `checkStorage`, `listDomains`, `listServices` | `/api/v1/cloudron/status`, `/api/v1/system/*`, etc. |
| `TasksApi` | `getTaskStatus`, `cancelTask` | `/api/v1/tasks/*` |
| `LogsApi` | `getLogs` | `/api/v1/apps/:id/logs`, `/api/v1/services/:id/logs` |
| `UpdatesApi` | `checkUpdates`, `applyUpdate` | `/api/v1/updater/*` |
| `AppStoreApi` | `searchApps` | `/api/v1/appstore/*` |

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
- `delete_user`: Verifies user exists, checks if last admin
- `restore_backup`: Validates storage sufficiency

Returns a `ValidationResult` with:

- `valid`: Boolean - can operation proceed?
- `errors`: Blocking issues
- `warnings`: Non-blocking concerns
- `recommendations`: Best practices

### Update Validation ([`validateApplyUpdate()`](src/cloudron-client.ts))

Pre-flight checks for platform updates:

- Verifies update is available
- Checks for recent backup (within 24 hours)
- Provides recommendations for backup and scheduling

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
| `cloudron_clone_app`     | Clone app to new location            |
| `cloudron_repair_app`    | Repair broken app                    |
| `cloudron_restore_app`   | Restore app from backup              |
| `cloudron_update_app`    | Update app to new version            |
| `cloudron_backup_app`    | Create app-specific backup           |

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

| Tool                   | Description                          |
| ---------------------- | ------------------------------------ |
| `cloudron_list_users`  | List all users                       |
| `cloudron_get_user`    | Get details for specific user        |
| `cloudron_create_user` | Create user with role                |
| `cloudron_update_user` | Update user properties               |
| `cloudron_delete_user` | Delete user with pre-flight check    |

### Groups

| Tool                    | Description        |
| ----------------------- | ------------------ |
| `cloudron_list_groups`  | List all groups    |
| `cloudron_create_group` | Create a new group |

### Updates

| Tool                    | Description                          |
| ----------------------- | ------------------------------------ |
| `cloudron_check_updates`| Check for platform updates           |
| `cloudron_apply_update` | Apply update with pre-flight check   |

### Services (Diagnostics)

| Tool                     | Description                        |
| ------------------------ | ---------------------------------- |
| `cloudron_list_services` | List platform services (read-only) |

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

Tests exercise production code paths through handlers via `createTestContext()`:

```typescript
describe("cloudron_list_apps tool", () => {
  beforeAll(() => setupTestEnv());

  it("should list all installed apps", async () => {
    global.fetch = createMockFetch({
      "GET https://my.example.com/api/v1/apps": {
        ok: true, status: 200,
        data: { apps: mockApps },
      },
    });

    const ctx = createTestContext();
    const response = await appHandlers.cloudron_list_apps({}, ctx);

    assertSuccess(response);
    expect(assertHasTextContent(response)).toContain("WordPress");
  });
});
```

HTTP-layer error handling is tested once in [`tests/client/http-client.test.ts`](tests/client/http-client.test.ts) rather than per-endpoint.
Pure functions (like [`parseLogLine`](src/client/parse-log-line.ts)) are tested directly in [`tests/client/parse-log-line.test.ts`](tests/client/parse-log-line.test.ts).

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

## API Coverage Analysis

Based on comparison with the official Cloudron OpenAPI specification (`docs/cloudron-openapi.json`):

### Implemented Endpoints

| Category  | Endpoint                        | Implementation Status |
| --------- | ------------------------------- | --------------------- |
| Apps      | GET /api/v1/apps                | ✅ `listApps()`       |
| Apps      | GET /api/v1/apps/:id            | ✅ `getApp()`         |
| Apps      | POST /api/v1/apps               | ✅ `installApp()`     |
| Apps      | POST /api/v1/apps/:id/start     | ✅ `startApp()`       |
| Apps      | POST /api/v1/apps/:id/stop      | ✅ `stopApp()`        |
| Apps      | POST /api/v1/apps/:id/restart   | ✅ `restartApp()`     |
| Apps      | PUT /api/v1/apps/:id/configure  | ✅ `configureApp()`   |
| Apps      | POST /api/v1/apps/:id/uninstall | ✅ `uninstallApp()`   |
| Apps      | POST /api/v1/apps/:id/clone     | ✅ `cloneApp()`       |
| Apps      | POST /api/v1/apps/:id/repair    | ✅ `repairApp()`      |
| Apps      | POST /api/v1/apps/:id/restore   | ✅ `restoreApp()`     |
| Apps      | POST /api/v1/apps/:id/update    | ✅ `updateApp()`      |
| Apps      | POST /api/v1/apps/:id/backup    | ✅ `backupApp()`      |
| Apps      | GET /api/v1/apps/:id/logs       | ✅ `getLogs()`        |
| Backups   | GET /api/v1/backups             | ✅ `listBackups()`    |
| Backups   | POST /api/v1/backups            | ✅ `createBackup()`   |
| Users     | GET /api/v1/users               | ✅ `listUsers()`      |
| Users     | GET /api/v1/users/:id           | ✅ `getUser()`        |
| Users     | POST /api/v1/users              | ✅ `createUser()`     |
| Users     | PUT /api/v1/users/:id           | ✅ `updateUser()`     |
| Users     | DELETE /api/v1/users/:id        | ✅ `deleteUser()`     |
| Groups    | GET /api/v1/groups              | ✅ `listGroups()`     |
| Groups    | POST /api/v1/groups             | ✅ `createGroup()`    |
| Domains   | GET /api/v1/domains             | ✅ `listDomains()`    |
| System    | GET /api/v1/cloudron/status     | ✅ `getStatus()`      |
| Services  | GET /api/v1/services            | ✅ `listServices()`   |
| Updates   | GET /api/v1/updates             | ✅ `checkUpdates()`   |
| Updates   | POST /api/v1/updates            | ✅ `applyUpdate()`    |
| Tasks     | GET /api/v1/tasks/:id           | ✅ `getTaskStatus()`  |
| Tasks     | DELETE /api/v1/tasks/:id        | ✅ `cancelTask()`     |
| App Store | GET /api/v1/appstore/apps       | ✅ `searchApps()`     |

### Not Yet Implemented (Available in Cloudron API)

| Category      | Endpoint                       | Description                 |
| ------------- | ------------------------------ | --------------------------- |
| Apps          | POST /api/v1/apps/:id/exec     | Execute command in app (⚠️ security risk - see note below) |
| Backups       | DELETE /api/v1/backups/:id     | Delete a backup             |
| Backups       | GET /api/v1/backups/config     | Get backup configuration    |
| Backups       | PUT /api/v1/backups/config     | Update backup configuration |
| Groups        | GET /api/v1/groups/:id         | Get specific group          |
| Groups        | PUT /api/v1/groups/:id         | Update group                |
| Groups        | DELETE /api/v1/groups/:id      | Delete group                |
| Domains       | POST /api/v1/domains           | Add domain                  |
| Domains       | DELETE /api/v1/domains/:domain | Remove domain               |
| Mail          | GET /api/v1/mail               | Mail configuration          |
| Events        | GET /api/v1/eventlog           | Event log                   |
| Notifications | GET /api/v1/notifications      | List notifications          |

### Security Note: App Exec Endpoint

The `/api/v1/apps/:id/exec` endpoint is intentionally **not implemented** due to security concerns:

- **Prompt injection risk**: An AI assistant could be tricked into executing malicious commands
- **No audit trail**: Cloudron wouldn't know the AI initiated the command
- **Privilege escalation**: Containers often run with elevated permissions
- **Data exfiltration**: Commands like `curl` could send sensitive data anywhere

If this functionality is needed in the future, it should be implemented with:
- Command allowlisting (only safe commands like `ls`, `cat`, `ps`)
- Explicit user confirmation before execution
- A dry-run mode that shows what would execute without running it

## Implementation Details

### Handler Registry Pattern

The tool dispatch system uses a flat registry pattern in [`src/tools/handlers/index.ts`](src/tools/handlers/index.ts):

```typescript
export const allHandlers: Record<string, ToolHandler> = {
  ...appHandlers,
  ...appstoreHandlers,
  ...backupHandlers,
  ...domainHandlers,
  ...logHandlers,
  ...systemHandlers,
  ...userHandlers,
};
```

Each handler module exports a `Record<string, ToolHandler>` where:

- Key: Tool name (e.g., `cloudron_list_apps`)
- Value: Async function `(args: unknown, client: CloudronClient) => Promise<McpResponse>`

### Response Formatting

The [`src/tools/formatters.ts`](src/tools/formatters.ts) module provides human-readable output:

- `formatAppList()` - Tabular app listing with status indicators
- `formatAppDetails()` - Detailed single app view
- `formatBackupList()` - Backup listing with sizes and dates
- `formatUserList()` - User listing with roles
- `formatDomainList()` - Domain configuration display
- `formatStorageInfo()` - Disk usage with visual bar
- `formatTaskStatus()` - Task progress display
- `formatValidationResult()` - Pre-flight check results

### Validation Layer

The [`src/tools/validators.ts`](src/tools/validators.ts) module provides runtime argument validation:

- `validateAppId()` - Non-empty string check
- `validateAction()` - Enum validation for start/stop/restart
- `validateLogType()` - Enum validation for app/system
- `validateLogLines()` - Range validation (1-1000)
- `validateStorageRequirement()` - Positive number check
- `validateOperationType()` - Enum validation for operation types

### MCP Response Helpers

The [`src/tools/response.ts`](src/tools/response.ts) module standardizes MCP responses:

```typescript
export function createTextResponse(text: string): McpResponse {
  return { content: [{ type: "text", text }] };
}

export function createErrorResponse(error: unknown): McpResponse {
  return {
    content: [{ type: "text", text: formatError(error) }],
    isError: true,
  };
}
```

## Cloudron API Behavior Notes

Based on the OpenAPI specification analysis:

### Asynchronous Operations

Operations that return `taskId` for polling:

- App installation (`POST /api/v1/apps`)
- App uninstallation (`POST /api/v1/apps/:id/uninstall`)
- App start/stop/restart
- Backup creation (`POST /api/v1/backups`)
- App updates
- App cloning
- App restoration

### Task States

Per the API spec, tasks have these states:

- `pending` - Queued but not started
- `running` - Currently executing
- `success` - Completed successfully
- `error` - Failed with error
- `cancelled` - Cancelled by user

### App States

Apps have two state dimensions:

- `installationState`: `pending_install`, `installed`, `pending_uninstall`, etc.
- `runState`: `running`, `stopped`, `pending_start`, `pending_stop`, etc.
- `health`: `healthy`, `unhealthy`, `dead`

### Authentication

The API supports two authentication methods:

1. **Bearer token** (Authorization header) - Used by this implementation
2. **Query parameter** (`?access_token=...`) - Not used

Tokens can be:

- **Readonly** - Only GET operations
- **Read and Write** - Full access

## Future Considerations

Based on code comments and structure:

1. **Retry Logic (Phase 3):** Currently no retry on transient failures. The `isRetryable()` method exists but isn't used.

2. **Idempotency Keys:** Mentioned as prerequisite for retry logic.

3. **Backup Integrity:** Validation recommends checking but doesn't implement checksum verification.

4. **App Dependencies:** Uninstall validation recommends checking but doesn't implement dependency resolution.

5. **Missing API Coverage:** Some Cloudron API endpoints are not yet exposed as MCP tools (see API Coverage Analysis above).

6. **Pagination:** The Cloudron API supports `page` and `per_page` query parameters for list endpoints. Current implementation doesn't expose pagination controls.

7. **Streaming Logs:** The API supports SSE (Server-Sent Events) for real-time log streaming. Current implementation only fetches static log snapshots.

8. **Group Management:** Only list and create are implemented. Update and delete group operations are not yet available.
