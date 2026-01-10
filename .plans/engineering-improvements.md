# Engineering Improvements Plan: mcp-cloudron

## Background

The mcp-cloudron project is an MCP (Model Context Protocol) server for managing Cloudron instances. It provides tools for listing apps, managing backups, users, and performing various administrative operations. The codebase is functional with good test coverage at the client level, but has accumulated technical debt in architecture, type safety, and maintainability.

## Problem Statement

The codebase has several engineering issues that increase maintenance burden and risk:

1. **Unsafe type assertions** - Tool arguments use `as` casts without runtime validation, risking silent failures
2. **Lost error context** - Error chains are broken, making debugging difficult
3. **Duplicate type definitions** - `ManifestValidationResult` is defined twice
4. **Monolithic server module** - 1051-line file with mixed concerns
5. **Giant switch statement** - 600+ line switch for tool dispatch
6. **Repeated boilerplate** - Response formatting duplicated across handlers
7. **Magic numbers** - Storage thresholds scattered without documentation
8. **Missing server tests** - Only client layer is tested
9. **Unused test helpers** - `mcp-assert.ts` exists but is never used

## Success Criteria

- [ ] All tool arguments validated at runtime before use
- [ ] Errors preserve original cause for debugging
- [ ] No duplicate type definitions
- [ ] Server module under 100 lines
- [ ] Tool handlers in separate files with registry pattern
- [ ] Response helpers reduce boilerplate
- [ ] Constants centralized with documentation
- [ ] Server handlers have test coverage
- [ ] All test helpers either used or removed

## Gap Analysis

| Area | Current State | Target State |
|------|--------------|--------------|
| Type Safety | `as` casts, no runtime validation | Validated args with proper types |
| Error Handling | Context lost on rethrow | Cause chain preserved |
| Types | Duplicate `ManifestValidationResult` | Single source of truth |
| Server Size | 1051 lines | ~50 lines entry point |
| Tool Dispatch | 600-line switch | Handler registry |
| Response Format | Repeated inline | Helper functions |
| Constants | Scattered magic numbers | Centralized config |
| Test Coverage | Client only | Client + server handlers |
| Test Helpers | Unused `mcp-assert.ts` | Actively used or removed |

---

## Milestones and Tasks

### Milestone 1: Type Safety & Error Handling ✅

Fix foundational issues that could cause bugs or debugging difficulties.

- [x] ✅ Create argument validation functions for each tool in `src/tools/validators.ts`
- [x] ✅ Add `cause` property support to `CloudronError` class
- [x] ✅ Update `makeRequest` to preserve error cause chain
- [x] ✅ Remove duplicate `ManifestValidationResult` definition (keep lines 35-39, remove 302-306)
- [x] ✅ Update all handler argument parsing to use validators

### Milestone 2: Server Modularization ✅

Break apart the monolithic server into focused modules.

- [x] ✅ Create `src/tools/definitions.ts` - move TOOLS array
- [x] ✅ Create `src/tools/formatters.ts` - extract `formatApp` and similar functions
- [x] ✅ Create `src/tools/response.ts` - add `textResponse()` and `errorResponse()` helpers
- [x] ✅ Create handler registry type and pattern in `src/tools/registry.ts`
- [x] ✅ Create `src/tools/handlers/apps.ts` - cloudron_list_apps, cloudron_get_app, cloudron_control_app, cloudron_configure_app, cloudron_install_app, cloudron_uninstall_app
- [x] ✅ Create `src/tools/handlers/backups.ts` - cloudron_list_backups, cloudron_create_backup
- [x] ✅ Create `src/tools/handlers/users.ts` - cloudron_list_users, cloudron_create_user
- [x] ✅ Create `src/tools/handlers/system.ts` - cloudron_get_status, cloudron_task_status, cloudron_cancel_task, cloudron_check_storage, cloudron_validate_operation
- [x] ✅ Create `src/tools/handlers/domains.ts` - cloudron_list_domains
- [x] ✅ Create `src/tools/handlers/logs.ts` - cloudron_get_logs
- [x] ✅ Create `src/tools/handlers/appstore.ts` - cloudron_search_apps, cloudron_validate_manifest
- [x] ✅ Refactor `src/server.ts` to use registry pattern and imports

### Milestone 3: Constants & Configuration ✅

Centralize magic numbers and configuration values.

- [x] ✅ Create `src/config.ts` with documented constants
- [x] ✅ Move `BACKUP_MIN_STORAGE_MB` (5120) to config
- [x] ✅ Move `RESTORE_MIN_STORAGE_MB` (1024) to config
- [x] ✅ Move default `requiredMB` for manifest validation (500) to config
- [x] ✅ Move `DEFAULT_TIMEOUT` (30000) to config
- [x] ✅ Update all usages to import from config

### Milestone 4: Test Coverage ✅

Add server handler tests and utilize existing helpers.

- [x] ✅ Create `tests/server/` directory for handler tests
- [x] ✅ Create test setup file using Jest's `setupFilesAfterEnv`
- [x] ✅ Update `jest.config.cjs` to use setup file
- [x] ✅ Refactor existing tests to use centralized setup
- [x] ✅ Update handler tests to use `mcp-assert.ts` helpers
- [x] ✅ Add tests for `src/tools/handlers/apps.ts`
- [ ] 🔴 Add tests for `src/tools/handlers/backups.ts` (deferred - client tests cover this)
- [ ] 🔴 Add tests for `src/tools/handlers/users.ts` (deferred - client tests cover this)
- [ ] 🔴 Add tests for `src/tools/handlers/system.ts` (deferred - client tests cover this)
- [x] ✅ Add tests for response formatting and error handling

---

## Transitive Effect Analysis

### Dependency Chain: Type Changes

```
ManifestValidationResult removal (types.ts)
  └─► cloudron-client.ts (uses type)
      └─► validateManifest() return type
          └─► installApp() (calls validateManifest)
              └─► server handler cloudron_install_app
                  └─► tests/cloudron-install-app.test.ts
```

**Mitigation**: Keep the first definition (lines 35-39), ensure all imports resolve correctly.

### Dependency Chain: Error Class Changes

```
CloudronError.cause addition (errors.ts)
  └─► makeRequest() (creates errors)
      └─► All client methods
          └─► All server handlers
              └─► All tests mocking errors
```

**Mitigation**: Make `cause` optional to maintain backward compatibility.

### Dependency Chain: Server Modularization

```
server.ts split
  └─► TOOLS array move
  │   └─► ListToolsRequestSchema handler
  └─► Handler extraction
  │   └─► CallToolRequestSchema handler
  │   └─► getClient() function (needs to be shared or injected)
  └─► formatApp() move
      └─► Multiple handlers use it
```

**Mitigation**: 
1. Export `getClient()` from server or inject client into handlers
2. Ensure all formatters are exported from `formatters.ts`
3. Update imports in all handler files

### Dependency Chain: Config Centralization

```
config.ts creation
  └─► cloudron-client.ts (uses constants)
  │   └─► createBackup() - BACKUP_MIN_STORAGE_MB
  │   └─► validateRestoreBackup() - RESTORE_MIN_STORAGE_MB
  │   └─► validateManifest() - default requiredMB
  │   └─► makeRequest() - DEFAULT_TIMEOUT
  └─► Tests that assert on these values
```

**Mitigation**: Export constants with same names to minimize import changes.

### Dependency Chain: Test Restructuring

```
Jest setup file addition
  └─► jest.config.cjs changes
      └─► All test files (implicit)
          └─► setupTestEnv/cleanupTestEnv calls (can be removed)
```

**Mitigation**: 
1. Keep `setupTestEnv`/`cleanupTestEnv` available for tests that need custom setup
2. Make global setup handle common case only

---

## File Structure After Changes

```
src/
├── index.ts              # Public exports
├── server.ts             # Entry point (~50 lines)
├── config.ts             # NEW: Centralized constants
├── cloudron-client.ts    # API client (unchanged structure)
├── errors.ts             # Error classes (+ cause support)
├── types.ts              # Type definitions (deduplicated)
└── tools/
    ├── definitions.ts    # NEW: TOOLS array
    ├── formatters.ts     # NEW: formatApp, formatBackup, etc.
    ├── response.ts       # NEW: textResponse, errorResponse
    ├── registry.ts       # NEW: Handler registry pattern
    ├── validators.ts     # NEW: Argument validation
    └── handlers/
        ├── apps.ts       # NEW: App-related handlers
        ├── backups.ts    # NEW: Backup handlers
        ├── users.ts      # NEW: User handlers
        ├── system.ts     # NEW: System/task handlers
        ├── domains.ts    # NEW: Domain handlers
        ├── logs.ts       # NEW: Log handlers
        └── appstore.ts   # NEW: App store handlers

tests/
├── helpers/
│   ├── cloudron-mock.ts  # Existing mocks
│   ├── mcp-assert.ts     # Existing (will be used)
│   └── setup.ts          # NEW: Global test setup
├── server/               # NEW: Server handler tests
│   ├── apps.test.ts
│   ├── backups.test.ts
│   └── ...
├── cloudron-*.test.ts    # Existing client tests
└── integration/
    └── ...
```
