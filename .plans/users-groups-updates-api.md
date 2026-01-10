# Plan: Implement Users, Groups, and Updates APIs

## Background Information

The `mcp-cloudron` project is an MCP server that wraps the Cloudron REST API. Following the successful implementation of app management tools (clone, repair, restore, update, backup) and services diagnostics, we now extend coverage to user management, groups, and system updates.

### Established Patterns (from previous implementation)

1. **File Structure:**
   - Types in `src/types.ts`
   - Client methods in `src/cloudron-client.ts`
   - Tool definitions in `src/tools/definitions.ts`
   - Validators in `src/tools/validators.ts`
   - Formatters in `src/tools/formatters.ts`
   - Handlers in `src/tools/handlers/{domain}.ts`
   - Tests in `tests/cloudron-{tool-name}.test.ts`

2. **Async Response Pattern:**
   - Use `formatAsyncTaskResponse(operation, taskId, additionalInfo?)` for all async operations
   - Consistent guidance: "Use cloudron_task_status with taskId=..."

3. **Pre-flight Validation Pattern:**
   - Destructive operations (delete user) should have validation
   - Return `ValidationResult` with `valid`, `errors`, `warnings`, `recommendations`

4. **Test Pattern:**
   - 3 tests per tool: happy path, error handling, validation
   - Use `createMockFetch()` for route-based mocking
   - Use `setupTestEnv()` / `cleanupTestEnv()` for env vars

5. **TypeScript Strictness:**
   - `exactOptionalPropertyTypes: true` - build params objects conditionally
   - No non-null assertions, no `as unknown as` casting

### Endpoints to Implement

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| Users | /api/v1/users/:id | GET | Get specific user |
| Users | /api/v1/users/:id | PUT | Update user |
| Users | /api/v1/users/:id | DELETE | Delete user |
| Groups | /api/v1/groups | GET | List groups |
| Groups | /api/v1/groups | POST | Create group |
| Updates | /api/v1/updates | GET | Check for updates |
| Updates | /api/v1/updates | POST | Apply updates |

## Problem Statement

AI assistants using this MCP server cannot:
1. Get details for a specific user by ID
2. Update user properties (email, role, password)
3. Delete users (with safety validation)
4. View or manage user groups
5. Check if Cloudron updates are available
6. Apply Cloudron platform updates

## Success Criteria

1. All 7 endpoints are implemented as MCP tools
2. Each new tool has:
   - Type definitions in `src/types.ts`
   - Client method in `src/cloudron-client.ts`
   - Tool definition in `src/tools/definitions.ts`
   - Handler in appropriate handler file
   - Formatter in `src/tools/formatters.ts`
   - Unit tests (happy path, error, validation)
3. Delete user has pre-flight validation (last admin check, etc.)
4. Apply updates has pre-flight validation (backup recommended)
5. All existing tests continue to pass
6. `pnpm verify` passes (format, types, tests)

## The Gap

### Current State
- 24 Cloudron API endpoints implemented
- User management limited to list and create
- No group management
- No update management
- Delete user validation is placeholder only

### Desired State
- 31 Cloudron API endpoints implemented (+7)
- Full user CRUD operations
- Group listing and creation
- Update checking and application
- Proper delete user validation

## API Parameter Schemas (from OpenAPI)

### Get User
```typescript
// No parameters beyond userId in path
```

### Update User Parameters
```typescript
interface UpdateUserParams {
  email?: string;        // Optional: new email
  displayName?: string;  // Optional: display name
  role?: 'admin' | 'user' | 'guest';  // Optional: new role
  password?: string;     // Optional: new password
}
```

### Delete User
```typescript
// No parameters beyond userId in path
// Returns 204 No Content on success
```

### Create Group Parameters
```typescript
interface CreateGroupParams {
  name: string;          // Required: group name
}
```

### Group Response
```typescript
interface Group {
  id: string;
  name: string;
  createdAt: string;
}
```

### Update Status Response
```typescript
interface UpdateInfo {
  available: boolean;
  version?: string;      // Available version if update exists
  changelog?: string;    // Changelog for the update
}
```

### Apply Update
```typescript
// No parameters - applies available update
// Returns taskId for async operation tracking
```

## Milestones and Tasks

### Milestone 1: Implement User Management Tools ✅

#### Types and Client Methods
- [x] ✅ Add `UpdateUserParams` type to `src/types.ts`
- [x] ✅ Add `getUser(userId)` method to `src/cloudron-client.ts`
- [x] ✅ Add `updateUser(userId, params)` method to `src/cloudron-client.ts`
- [x] ✅ Add `deleteUser(userId)` method to `src/cloudron-client.ts`

#### Pre-flight Validation
- [x] ✅ Implement proper `validateDeleteUser(userId)` - check user exists, not last admin, not self

#### Tool Definitions and Handlers
- [x] ✅ Add `cloudron_get_user` tool definition and handler
- [x] ✅ Add `cloudron_update_user` tool definition and handler
- [x] ✅ Add `cloudron_delete_user` tool definition and handler

#### Formatters
- [x] ✅ Add `formatUserDetails()` formatter for single user display

#### Validators
- [x] ✅ Add `parseGetUserArgs()` validator
- [x] ✅ Add `parseUpdateUserArgs()` validator
- [x] ✅ Add `parseDeleteUserArgs()` validator

#### Tests
- [x] ✅ Add tests for `cloudron_get_user` (happy, error, validation)
- [x] ✅ Add tests for `cloudron_update_user` (happy, error, validation)
- [x] ✅ Add tests for `cloudron_delete_user` (happy, error, validation)

### Milestone 2: Implement Group Management Tools ✅

#### Types and Client Methods
- [x] ✅ Add `Group` and `CreateGroupParams` types to `src/types.ts`
- [x] ✅ Add `listGroups()` method to `src/cloudron-client.ts`
- [x] ✅ Add `createGroup(params)` method to `src/cloudron-client.ts`

#### Tool Definitions and Handlers
- [x] ✅ Create `src/tools/handlers/groups.ts` with handlers
- [x] ✅ Register groups handlers in `src/tools/handlers/index.ts`
- [x] ✅ Add `cloudron_list_groups` tool definition
- [x] ✅ Add `cloudron_create_group` tool definition

#### Formatters
- [x] ✅ Add `formatGroup()` formatter
- [x] ✅ Add `formatGroupList()` formatter

#### Validators
- [x] ✅ Add `parseCreateGroupArgs()` validator

#### Tests
- [x] ✅ Add tests for `cloudron_list_groups` (happy, error, empty list)
- [x] ✅ Add tests for `cloudron_create_group` (happy, error, validation)
- [x] ✅ Add mock group data to `tests/helpers/cloudron-mock.ts`

### Milestone 3: Implement Update Management Tools ✅

#### Types and Client Methods
- [x] ✅ Add `UpdateInfo` type to `src/types.ts`
- [x] ✅ Add `checkUpdates()` method to `src/cloudron-client.ts`
- [x] ✅ Add `applyUpdate()` method to `src/cloudron-client.ts`

#### Pre-flight Validation
- [x] ✅ Add `validateApplyUpdate()` - recommend backup, check update available

#### Tool Definitions and Handlers
- [x] ✅ Create `src/tools/handlers/updates.ts` with handlers
- [x] ✅ Register updates handlers in `src/tools/handlers/index.ts`
- [x] ✅ Add `cloudron_check_updates` tool definition
- [x] ✅ Add `cloudron_apply_update` tool definition

#### Formatters
- [x] ✅ Add `formatUpdateInfo()` formatter

#### Tests
- [x] ✅ Add tests for `cloudron_check_updates` (happy, no update, error)
- [x] ✅ Add tests for `cloudron_apply_update` (happy, no update available, error)
- [x] ✅ Add mock update data to `tests/helpers/cloudron-mock.ts`

### Milestone 4: Documentation ✅

- [x] ✅ Update TECHNICAL.md API Coverage section
- [x] ✅ Update TECHNICAL.md MCP Tools Reference section
- [x] ✅ Update TECHNICAL.md API Methods table

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
   - Adding `UpdateUserParams`, `Group`, `UpdateInfo` types requires corresponding client methods
   - Client methods require handler implementations
   - Handlers require test coverage
   - Mock data in `cloudron-mock.ts` must match new types

2. **Tool Definitions → Server Registration**
   - New tools in `definitions.ts` are automatically registered via `TOOLS` array
   - Startup validation (added in previous plan) will catch mismatches

3. **Handler Registry → Tool Dispatch**
   - New handler files (`groups.ts`, `updates.ts`) must be imported in `handlers/index.ts`
   - Handler keys must match tool names in `definitions.ts` exactly

4. **User Handlers → Existing users.ts**
   - New user tools (`get_user`, `update_user`, `delete_user`) should be added to existing `users.ts`
   - Maintains domain cohesion

5. **Delete User Validation → User Listing**
   - `validateDeleteUser()` needs to call `listUsers()` to check if user is last admin
   - Must handle case where current user tries to delete themselves

6. **Apply Update → Backup Recommendation**
   - Should recommend creating backup before applying update
   - May want to check `listBackups()` for recent backup

### Risk Areas

1. **Delete User Safety**: Must prevent:
   - Deleting the last admin user
   - Deleting yourself (current authenticated user)
   - Deleting users with active sessions (if API supports)

2. **Apply Update Destructiveness**: Platform update is highly impactful:
   - Should strongly recommend backup first
   - Should verify update is actually available before attempting
   - Returns taskId - may take significant time

3. **Group Dependencies**: Groups may be referenced by:
   - User memberships
   - App access restrictions
   - Need to understand if delete group is needed (not in scope but consider)

4. **Role Changes**: Updating user role has security implications:
   - Promoting to admin grants full access
   - Demoting from admin may lock out if last admin

### Consistency Checklist

To maintain consistency with previous implementation:

- [ ] Use `formatAsyncTaskResponse()` for `applyUpdate()` response
- [ ] Use `textResponse()` helper for all handler responses
- [ ] Follow `parseXxxArgs()` naming convention for validators
- [ ] Follow `formatXxx()` naming convention for formatters
- [ ] Use `assertNonEmptyString()` for required string validation
- [ ] Use `assertObject()` for object validation
- [ ] Add mock data exports to `cloudron-mock.ts`
- [ ] Test files named `cloudron-{tool-name}.test.ts`
