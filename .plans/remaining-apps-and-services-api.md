# Plan: Implement Remaining Apps Category APIs and List Services API

## Background Information

The `mcp-cloudron` project is an MCP server that wraps the Cloudron REST API, exposing it as tools for AI assistants. The current implementation covers basic app lifecycle operations (list, get, start, stop, restart, configure, install, uninstall) but is missing several important app management endpoints and the services API.

Based on the Cloudron OpenAPI specification (`docs/cloudron-openapi.json`), the following endpoints are available but not yet implemented:

### Apps Category (Missing)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/apps/{appId}/clone` | POST | Clone an existing app |
| `/api/v1/apps/{appId}/repair` | POST | Repair a broken app |
| `/api/v1/apps/{appId}/restore` | POST | Restore app from backup |
| `/api/v1/apps/{appId}/update` | POST | Update app to new version |
| `/api/v1/apps/{appId}/backup` | POST | Create app-specific backup |

### Services Category (Missing)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/services` | GET | List all platform services (mail, mysql, postgresql, mongodb, etc.) |

### Excluded from Scope
| Endpoint | Reason |
|----------|--------|
| `/api/v1/apps/{appId}/exec` | **Security risk** - allows arbitrary command execution in containers. Prompt injection attacks could exfiltrate data or destroy systems. Omitting until explicit security controls are designed. |

## Problem Statement

AI assistants using this MCP server cannot:
1. Clone apps to create duplicates with different configurations
2. Repair apps that are in a broken state
3. Restore apps from specific backups
4. Update apps to newer versions
5. Create app-specific backups (only full system backups are supported)
6. View the status of platform services (databases, mail, etc.)

## Success Criteria

1. All 5 app endpoints are implemented as MCP tools
2. The services list endpoint is implemented as an MCP tool (categorized as diagnostics)
3. Each new tool has:
   - Type definitions in `src/types.ts`
   - Client method in `src/cloudron-client.ts`
   - Tool definition in `src/tools/definitions.ts`
   - Handler in `src/tools/handlers/apps.ts` or new `services.ts`
   - Formatter in `src/tools/formatters.ts`
   - Unit tests (happy path, error, validation)
4. Pre-flight validation for destructive operations (clone, restore, update)
5. Standardized async task response formatting
6. All existing tests continue to pass
7. `pnpm verify` passes (format, types, tests)

## The Gap

### Current State
- 18 Cloudron API endpoints implemented
- App operations limited to basic lifecycle
- No visibility into platform services
- No app cloning, repair, restore, or update capabilities
- Inconsistent async task response formatting

### Desired State
- 24 Cloudron API endpoints implemented (+6)
- Full app lifecycle management including maintenance operations
- Platform service visibility for troubleshooting (read-only diagnostics)
- Complete app management capabilities
- Consistent async task response pattern

## API Parameter Schemas (from OpenAPI)

### Clone App Parameters
```typescript
interface CloneAppParams {
  location: string;        // Required: subdomain for the clone
  domain?: string;         // Optional: target domain (defaults to same)
  portBindings?: Record<string, number>; // Optional: port configuration
  backupId?: string;       // Optional: clone from specific backup state
}
```

### Restore App Parameters
```typescript
interface RestoreAppParams {
  backupId: string;        // Required: backup to restore from
}
```

### Update App Parameters
```typescript
interface UpdateAppParams {
  manifest?: {
    version?: string;      // Optional: specific version to update to
  };
  force?: boolean;         // Optional: force update even if same version
}
```

### Backup App Parameters
```typescript
// No parameters - creates backup of current app state
```

### Repair App Parameters
```typescript
// No parameters - attempts automatic repair
```

## Milestones and Tasks

### Milestone 1: Infrastructure Improvements ✅

- [x] ✅ Create `formatAsyncTaskResponse(operation: string, taskId: string)` helper in `src/tools/formatters.ts`
- [x] ✅ Add startup validation in `src/server.ts` to verify all tools in `TOOLS` have handlers in `allHandlers`
- [x] ✅ Refactor existing async handlers to use new `formatAsyncTaskResponse()` helper

### Milestone 2: Implement App Management Tools ✅

#### Types and Client Methods
- [x] ✅ Add `CloneAppParams`, `RestoreAppParams`, `UpdateAppParams` types to `src/types.ts`
- [x] ✅ Add `cloneApp(appId, params)` method to `src/cloudron-client.ts`
- [x] ✅ Add `repairApp(appId)` method to `src/cloudron-client.ts`
- [x] ✅ Add `restoreApp(appId, backupId)` method to `src/cloudron-client.ts`
- [x] ✅ Add `updateApp(appId, params?)` method to `src/cloudron-client.ts`
- [x] ✅ Add `backupApp(appId)` method to `src/cloudron-client.ts`

#### Pre-flight Validation
- [x] ✅ Add `validateCloneOperation(appId, params)` - checks target location availability
- [x] ✅ Add `validateRestoreOperation(appId, backupId)` - verifies backup exists and is compatible
- [x] ✅ Add `validateUpdateOperation(appId)` - checks if update is available

#### Tool Definitions and Handlers
- [x] ✅ Add `cloudron_clone_app` tool definition and handler
- [x] ✅ Add `cloudron_repair_app` tool definition and handler
- [x] ✅ Add `cloudron_restore_app` tool definition and handler
- [x] ✅ Add `cloudron_update_app` tool definition and handler
- [x] ✅ Add `cloudron_backup_app` tool definition and handler

#### Tests (3 per tool)
- [x] ✅ Add tests for `cloudron_clone_app` (happy, error, validation)
- [x] ✅ Add tests for `cloudron_repair_app` (happy, error, validation)
- [x] ✅ Add tests for `cloudron_restore_app` (happy, error, validation)
- [x] ✅ Add tests for `cloudron_update_app` (happy, error, validation)
- [x] ✅ Add tests for `cloudron_backup_app` (happy, error, validation)

### Milestone 3: Implement Services Diagnostics Tool ✅

#### Types and Client Methods
- [x] ✅ Add `Service` and `ServiceStatus` types to `src/types.ts`
- [x] ✅ Add `listServices()` method to `src/cloudron-client.ts`

#### Tool Definition and Handler
- [x] ✅ Create `src/tools/handlers/services.ts` with `cloudron_list_services` handler
- [x] ✅ Register services handlers in `src/tools/handlers/index.ts`
- [x] ✅ Add `cloudron_list_services` tool definition (description emphasizes read-only diagnostics)
- [x] ✅ Add `formatServiceList()` formatter

#### Tests
- [x] ✅ Add tests for `cloudron_list_services` (happy, error, empty list)
- [x] ✅ Add mock service data to `tests/helpers/cloudron-mock.ts`

### Milestone 4: Documentation ✅

- [x] ✅ Update TECHNICAL.md API Coverage section
- [x] ✅ Add security note about why exec is not implemented

## Transitive Effect Analysis

### Direct Dependencies

```
src/types.ts
    └── src/cloudron-client.ts (imports types)
        └── src/tools/handlers/*.ts (imports client)
            └── src/tools/handlers/index.ts (aggregates handlers)
                └── src/server.ts (uses handler registry)
```

### Transitive Effects

1. **Type Changes → Client → Handlers → Tests**
   - Adding new types in `types.ts` requires corresponding client methods
   - Client methods require handler implementations
   - Handlers require test coverage
   - Mock data in `cloudron-mock.ts` must match new types

2. **Tool Definitions → Server Registration**
   - New tools in `definitions.ts` are automatically registered via `TOOLS` array
   - Server's `ListToolsRequest` handler returns all tools from this array
   - **NEW:** Startup validation will catch mismatches between tools and handlers

3. **Handler Registry → Tool Dispatch**
   - New handlers must be exported from their module
   - Handler module must be imported in `handlers/index.ts`
   - Handler keys must match tool names in `definitions.ts`
   - **MITIGATED:** Startup validation prevents silent failures

4. **Async Response Formatting → AI Behavior**
   - **NEW:** Standardized `formatAsyncTaskResponse()` ensures consistent guidance
   - All async operations will tell AI to use `cloudron_task_status` the same way
   - Reduces AI confusion about how to poll for completion

5. **Pre-flight Validation → Operation Safety**
   - Clone validation prevents overwriting existing apps
   - Restore validation prevents using incompatible backups
   - Update validation prevents "no update available" errors

### Risk Areas

1. **Async Operations**: Clone, repair, restore, update, and backup all return `taskId`. Standardized response formatting mitigates inconsistency.

2. **Service Dependencies**: Some services depend on others (e.g., apps depend on databases). Service status may affect app operations. Formatter should show dependency relationships if available.

3. **Backup Compatibility**: Restore operation requires valid backup ID. Pre-flight validation will verify backup exists and is compatible with target app.

4. **Update Availability**: Update operation may fail if no update is available. Pre-flight validation will check availability first.

5. **Clone Target Conflicts**: Clone to existing location would fail. Pre-flight validation will check target availability.
