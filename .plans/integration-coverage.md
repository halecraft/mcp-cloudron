# Plan: Full, Safe Integration Coverage

## Background
The `mcp-cloudron` project provides an MCP server for managing Cloudron instances. While it has comprehensive unit tests with mocked responses, the integration tests (which run against a real Cloudron instance) are currently minimal. They cover only a few endpoints (`restart`, `configure`, `logs`, `search`) and rely on existing apps, which poses a risk to production environments.

## Problem Statement
The current integration test suite is:
1.  **Incomplete**: Covers < 20% of supported endpoints.
2.  **Risky**: Selects the first available app (`apps[0]`) for testing, which could be a critical production app.
3.  **Shallow**: Verifies API acceptance (200 OK) but often fails to verify the actual state change on the server.
4.  **Stateless**: Lacks end-to-end lifecycle tests (e.g., Install → Configure → Uninstall).

## Success Criteria
1.  **100% Endpoint Coverage**: Every supported MCP tool has at least one corresponding integration test.
2.  **Safety**: Tests run in a sandboxed manner (using dedicated test resources) and do not interfere with existing production apps/users.
3.  **Verification**: Tests assert that the server state has actually changed (e.g., fetching a user after creating it).
4.  **Cleanup**: Tests automatically clean up any resources (apps, users, backups) they create.

## Gap Analysis
As detailed in `tests/integration/cloudron.integration.md`, the following areas are completely missing integration tests:
*   **App Lifecycle**: Install, Uninstall, Clone, Restore.
*   **User Management**: List, Create, Update, Delete.
*   **Group Management**: List, Create.
*   **Backups**: List, Create.
*   **System**: Status, Services, Domains, Updates.
*   **Tasks**: Status, Cancel.

## Milestones and Tasks

### Milestone 1: Safe Test Infrastructure ✅
Establish the foundation for safe, isolated testing.

- [x] Create `TestContext` helper to generate unique resource names (e.g., `mcp-test-${timestamp}`) ✅
- [x] Implement `waitForTask` helper to poll async task status until completion ✅
- [x] Implement `ensureTestApp` helper that installs a lightweight app (e.g., `lamp`) if missing, or finds a dedicated test app ✅
- [x] Implement `cleanupTestResources` helper to remove created apps, users, and groups after tests ✅

### Milestone 2: Read-Only & System Coverage ✅
Add low-risk tests for system information and listing resources.

- [x] Add tests for `cloudron_get_status`, `cloudron_list_services`, `cloudron_list_domains` ✅
- [x] Add tests for `cloudron_check_updates` ✅
- [x] Add tests for `cloudron_list_users` and `cloudron_get_user` (read-only) ✅
- [x] Add tests for `cloudron_list_groups` (read-only) ✅
- [x] Add tests for `cloudron_list_backups` (read-only) ✅

### Milestone 3: App Lifecycle Coverage ✅
Implement the core app management workflow.

- [x] Implement `cloudron_install_app` test (install a safe, lightweight app) ✅
- [x] Implement `cloudron_control_app` test (Stop → Start → Restart) on the test app ✅
- [x] Implement `cloudron_configure_app` test with state verification (check env vars changed) ✅
- [x] Implement `cloudron_uninstall_app` test (verify app is removed) ✅

### Milestone 4: User & Group Management ✅
Implement tests for creating and managing users and groups.

- [x] Implement `cloudron_create_user` test ✅
- [x] Implement `cloudron_update_user` test (verify changes) ✅
- [x] Implement `cloudron_create_group` test ✅
- [x] Implement `cloudron_delete_user` test (verify removal) ✅

### Milestone 5: Advanced Operations ✅
Cover complex and potentially long-running operations.

- [x] Implement `cloudron_create_backup` test (verify backup appears in list) ✅
- [x] Implement `cloudron_clone_app` test (clone test app, verify clone exists) ✅
- [x] Implement `cloudron_restore_app` test (restore test app, verify success) ✅
- [x] Implement `cloudron_task_status` and `cloudron_cancel_task` tests ✅

## Transitive Effect Analysis

1.  **Storage Constraints**:
    *   *Effect*: Creating test apps and backups consumes disk space.
    *   *Mitigation*: `ensureTestApp` should check for available storage before installing. Tests should fail gracefully if the instance is full. Cleanup must be robust to prevent "leakage" filling up the disk over time.

2.  **Concurrency**:
    *   *Effect*: If multiple developers or CI jobs run integration tests simultaneously against the same Cloudron instance, they might conflict (e.g., trying to delete the same user).
    *   *Mitigation*: Use unique, timestamped names for all created resources (`mcp-test-user-${uuid}`).

3.  **Rate Limiting**:
    *   *Effect*: Rapidly creating/deleting resources might trigger Cloudron API rate limits (if any exist) or overload the server.
    *   *Mitigation*: Add small delays between heavy operations if necessary.

4.  **App Store Dependencies**:
    *   *Effect*: `install_app` tests depend on the Cloudron App Store being reachable and the specific app (e.g., `lamp`) being available.
    *   *Mitigation*: Use a standard, reliable app ID. Handle network errors gracefully.
