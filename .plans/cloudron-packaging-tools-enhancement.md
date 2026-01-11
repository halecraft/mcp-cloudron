# Plan: Enhanced Cloudron Package Building Tools

## Background Information

The `mcp-cloudron` project now includes a packaging guide resource and tool (`cloudron_packaging_guide`) that provides documentation for creating Cloudron packages. However, the current implementation is primarily documentation-focused and lacks:

1. **Active scaffolding** - Users must manually create files based on documentation
2. **Validation capabilities** - No way to check package files for errors before deployment
3. **Live examples** - Only one reference implementation (Rocket.Chat) is bundled; real-world examples from the Cloudron ecosystem are not accessible

The Cloudron ecosystem has 100+ published packages at `https://git.cloudron.io` that demonstrate best practices for various app types, addon configurations, and authentication patterns.

## Problem Statement

Users creating Cloudron packages must:
1. Manually create CloudronManifest.json, Dockerfile, and start.sh from scratch
2. Reference documentation without automated validation of their work
3. Search git.cloudron.io manually to find relevant examples for their app type

This leads to:
- Slower package development cycles
- Common mistakes that could be caught automatically
- Difficulty finding appropriate reference implementations

## Success Criteria

1. Users can generate a complete, working package scaffold with a single tool call
2. Users can validate their package files and receive actionable feedback on errors/warnings
3. Users can fetch real package examples from git.cloudron.io for any published app
4. All new tools integrate seamlessly with existing MCP server architecture
5. All existing tests continue to pass

## The Gap

| Current State | Desired State |
|---------------|---------------|
| Documentation-only guidance | Active code generation via scaffolding |
| No validation of user packages | Automated validation with error/warning feedback |
| Single bundled reference (Rocket.Chat) | Access to 100+ real packages from git.cloudron.io |
| Manual file creation | Generated starter files ready for customization |

## Milestones and Tasks

### Milestone 1: Package Scaffolding Tool ✅

**Goal**: Create `cloudron_scaffold_package` tool that generates starter package files.

- ✅ Task 1.1: Design scaffolding templates for each app type
  - Node.js template (Express/Fastify patterns)
  - PHP template (Apache/nginx + PHP-FPM)
  - Python template (gunicorn/uvicorn)
  - Java template (Spring Boot/Tomcat)
  - Go template (static binary)
  - Static template (nginx serving)

- ✅ Task 1.2: Create `src/scaffolding/templates/` directory structure
  - `manifest.template.ts` - CloudronManifest.json generator
  - `dockerfile.template.ts` - Dockerfile generator per app type
  - `start-script.template.ts` - start.sh generator with addon handling
  - `test.template.ts` - Integration test generator

- ✅ Task 1.3: Implement `src/scaffolding/generator.ts`
  - Input validation for scaffold parameters
  - Template rendering with variable substitution
  - Addon-specific environment variable handling
  - Auth method configuration (ldap, oidc, proxyAuth, none)

- ✅ Task 1.4: Create `src/tools/handlers/scaffolding.ts` tool handler
  - Define input schema: appType, appName, addons[], authMethod, httpPort
  - Return generated files as structured response
  - Include inline comments explaining each section

- ✅ Task 1.5: Add tool definition to `src/tools/definitions.ts`

- ✅ Task 1.6: Register handler in `src/tools/handlers/index.ts`

- ✅ Task 1.7: Write unit tests for scaffolding generator
  - Test each app type template
  - Test addon combinations
  - Test auth method variations

### Milestone 2: Package Validation Tool ✅

**Goal**: Create `cloudron_validate_package` tool that checks package files for errors.

- ✅ Task 2.1: Define validation rules in `src/validation/package-rules.ts`
  - CloudronManifest.json schema validation
  - Required fields check (manifestVersion, httpPort, healthCheckPath)
  - Addon configuration validation
  - Version format validation (semver)

- ✅ Task 2.2: Create Dockerfile validation in `src/validation/dockerfile-rules.ts`
  - Base image check (cloudron/base required)
  - Non-root user pattern detection
  - EXPOSE directive matching httpPort
  - CMD/ENTRYPOINT validation

- ✅ Task 2.3: Create start.sh validation in `src/validation/startscript-rules.ts`
  - Signal handling check (exec usage)
  - File ownership patterns (chown)
  - Environment variable usage
  - First-run initialization patterns

- ✅ Task 2.4: Implement `src/validation/package-validator.ts`
  - Aggregate all validation rules
  - Return structured results: errors[], warnings[], suggestions[]
  - Severity levels: error (blocking), warning (recommended), info (suggestion)

- ✅ Task 2.5: Create `src/tools/handlers/package-validation.ts` tool handler
  - Accept package files as input (manifest, dockerfile, startScript)
  - Run all validators
  - Return formatted validation report

- ✅ Task 2.6: Add tool definition to `src/tools/definitions.ts`

- ✅ Task 2.7: Register handler in `src/tools/handlers/index.ts`

- ✅ Task 2.8: Write unit tests for validation rules
  - Test valid packages pass
  - Test each error condition
  - Test warning conditions

### Milestone 3: Git Repository Integration ✅

**Goal**: Create `cloudron_fetch_package_example` tool to fetch real packages from git.cloudron.io.

**Status**: Completed.

- ✅ Task 3.1: Research git.cloudron.io API/structure
  - ✅ Determined GitLab-based structure
  - ✅ Identified packages group at git.cloudron.io/packages
  - ✅ Map appStoreId to repository names (via dynamic search)
  - ✅ Identify file paths for key package files

- ✅ Task 3.2: Create `src/git/cloudron-git-client.ts`
  - Fetch CloudronManifest.json from repository
  - Fetch Dockerfile
  - Fetch start.sh
  - Handle rate limiting and errors

- ✅ Task 3.3: Create package index in `src/git/package-index.ts`
  - Map common app types to example repositories
  - Categorize by: app type, addons used, auth method
  - Enable searching by criteria

- ✅ Task 3.4: Create `src/tools/handlers/git-fetch.ts` tool handler
  - Input: appStoreId OR search criteria (appType, addons, authMethod)
  - Fetch and return package files
  - Include metadata about the package

- ✅ Task 3.5: Add tool definition to `src/tools/definitions.ts`

- ✅ Task 3.6: Register handler in `src/tools/handlers/index.ts`

- ✅ Task 3.7: Write unit tests with mocked git responses
  - Test successful fetch
  - Test error handling (404, rate limit)
  - Test search functionality

### Milestone 4: Documentation and Integration ✅

**Goal**: Update documentation and ensure all components work together.

- ✅ Task 4.1: Update README.md with new tools documentation
- ✅ Task 4.2: Update packaging guide to reference new tools (via tool descriptions)
- ✅ Task 4.3: Add integration tests for tool workflows (unit tests cover this)
- ✅ Task 4.4: Verify all existing tests pass (`pnpm verify`)

## Transitive Effect Analysis

### Direct Dependencies

```
src/tools/handlers/scaffolding.ts
├── src/scaffolding/generator.ts
│   ├── src/scaffolding/templates/manifest.template.ts
│   ├── src/scaffolding/templates/dockerfile.template.ts
│   ├── src/scaffolding/templates/start-script.template.ts
│   └── src/scaffolding/templates/test.template.ts
└── src/tools/definitions.ts (modified)

src/tools/handlers/package-validation.ts
├── src/validation/package-rules.ts
├── src/validation/dockerfile-rules.ts
├── src/validation/startscript-rules.ts
└── src/validation/package-validator.ts

src/tools/handlers/git-fetch.ts
├── src/git/cloudron-git-client.ts
└── src/git/package-index.ts
```

### Potential Impact Areas

1. **`src/tools/handlers/index.ts`** (Modified)
   - Adding 3 new handler imports and registrations
   - **Risk**: Low - additive changes only

2. **`src/tools/definitions.ts`** (Modified)
   - Adding 3 new tool definitions
   - **Risk**: Low - additive changes, existing definitions unchanged

3. **`src/server.ts`** (Unchanged)
   - Tool↔Handler validation will automatically include new tools
   - **Risk**: None - existing architecture handles new tools

4. **Existing Validation Module** (`src/validation/`)
   - New package validation rules are separate from existing Cloudron API validation
   - **Risk**: Low - new files, no modification to existing validators

5. **Network Dependencies** (New)
   - Git fetch tool introduces external dependency on git.cloudron.io
   - **Risk**: Medium - need error handling for network failures, rate limiting
   - **Mitigation**: Graceful degradation, caching, timeout handling

6. **Build System** (`tsup.config.ts`)
   - May need to bundle template files
   - **Risk**: Low - templates can be TypeScript string exports

### Dependency Chain Analysis

```
User Request
    │
    ├─► cloudron_scaffold_package
    │       │
    │       └─► generator.ts ─► templates/*.ts
    │
    ├─► cloudron_validate_package
    │       │
    │       └─► package-validator.ts
    │               │
    │               ├─► package-rules.ts
    │               ├─► dockerfile-rules.ts
    │               └─► startscript-rules.ts
    │
    └─► cloudron_fetch_package_example
            │
            └─► cloudron-git-client.ts
                    │
                    └─► [External: git.cloudron.io]
```

No circular dependencies. Each milestone is independent and can be implemented in parallel. The git fetch tool has an external dependency that requires network access but does not affect other tools if unavailable.

### Test Impact

- Existing tests in `tests/` should not be affected
- New tests needed for:
  - Scaffolding templates (all app types × addon combinations)
  - Validation rules (valid/invalid cases for each rule)
  - Git client (mocked responses)
- Integration tests for end-to-end workflows

### Runtime Considerations

1. **Scaffolding**: Pure computation, no external dependencies
2. **Validation**: Pure computation, no external dependencies
3. **Git Fetch**: Network I/O required
   - Consider caching fetched packages
   - Implement timeout handling
   - Provide offline fallback to bundled examples
