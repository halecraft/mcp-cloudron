# Plan: MCP Command for Cloudron Package Creation Guide

## Background Information

The `mcp-cloudron` project is an MCP (Model Context Protocol) server that provides tools for managing Cloudron instances. Currently, it offers tools for app management, backups, users, groups, and system operations.

Cloudron is a platform for self-hosting web applications. Creating a Cloudron package requires understanding several components:
- **CloudronManifest.json**: Metadata and configuration for the app
- **Dockerfile**: Build instructions using `cloudron/base` image
- **start.sh**: Startup script handling environment variables and migrations
- **Addons**: Platform services (databases, auth, email, caching)
- **Testing**: Integration tests for install/backup/restore/update cycles

The project now has comprehensive resources available:
- **Documentation** (`resources/content/`): 6 markdown files covering packaging tutorial, manifest reference, addons, cheat sheet, CLI, and publishing
- **Reference Implementation** (`vendor/rocketchat-app/`): A production-quality Cloudron package demonstrating best practices

## Problem Statement

Users of the MCP server who want to create Cloudron packages have no way to access packaging guidance through the MCP interface. The documentation and reference implementation exist but are not exposed as MCP resources or tools.

## Success Criteria

1. Users can access comprehensive Cloudron packaging guidance via MCP
2. The guidance includes both documentation and practical examples from the reference implementation
3. The solution integrates naturally with the existing MCP server architecture
4. The implementation follows the project's TypeScript patterns and coding standards

## The Gap

| Current State | Desired State |
|---------------|---------------|
| Documentation exists as static files | Documentation exposed as MCP resource |
| Reference implementation exists but not accessible | Examples extracted and included in guidance |
| No packaging-related MCP tools | Interactive guidance tool available |
| Users must read docs externally | Users get contextual help via MCP |

## Milestones and Tasks

### Milestone 1: Create MCP Resource for Packaging Guide ✅

**Goal**: Expose a static MCP resource that combines all documentation into a comprehensive guide.

- ✅ Task 1.1: Create `src/resources/` directory structure
- ✅ Task 1.2: Create `src/resources/packaging-guide.ts` with content loader
  - Load all 6 documentation files from `resources/content/`
  - Extract key examples from `vendor/rocketchat-app/`
  - Combine into structured markdown guide
- ✅ Task 1.3: Create `src/resources/index.ts` to export resource handlers
- ✅ Task 1.4: Register resource in `src/server.ts`
  - Add `ListResourcesRequestSchema` handler
  - Add `ReadResourceRequestSchema` handler
- ✅ Task 1.5: Write unit tests for resource loading and content generation

### Milestone 2: Create Interactive Packaging Guide Tool ✅

**Goal**: Provide a tool that gives contextual, topic-specific guidance.

- ✅ Task 2.1: Create `src/tools/handlers/packaging.ts` with tool handler
- ✅ Task 2.2: Define tool schema in `src/tools/definitions.ts`
  - Input: `topic` (overview|manifest|dockerfile|addons|testing|publishing)
  - Input: `appType` (nodejs|php|python|java|go|static) - optional
- ✅ Task 2.3: Implement topic-specific content extraction
  - Overview: Quick start checklist and workflow
  - Manifest: Field reference with examples
  - Dockerfile: Base image usage and best practices
  - Addons: Available addons with configuration examples
  - Testing: Test structure and patterns
  - Publishing: App Store submission process
- ✅ Task 2.4: Register tool in `src/tools/handlers/index.ts`
- ✅ Task 2.5: Write unit tests for tool handler (16 tests in `tests/cloudron-packaging-guide.test.ts`)

### Milestone 3: Documentation and Integration ✅

**Goal**: Ensure the new features are documented and integrated properly.

- ✅ Task 3.1: Update README.md with new resource and tool documentation
- ✅ Task 3.2: Add unit tests for resource and tool (16 tests passing)
- ✅ Task 3.3: Verify all existing tests still pass (`pnpm verify` - 313 tests passing)
- ⏭️ Task 3.4: Update TECHNICAL.md if needed (skipped - not required for this feature)

## Transitive Effect Analysis

### Direct Dependencies

```
src/server.ts
├── src/resources/index.ts (new)
│   └── src/resources/packaging-guide.ts (new)
│       ├── resources/content/*.md (read-only)
│       └── vendor/rocketchat-app/* (read-only)
└── src/tools/registry.ts
    └── src/tools/handlers/packaging.ts (new)
        └── src/tools/definitions.ts (modified)
```

### Potential Impact Areas

1. **`src/server.ts`** (Modified)
   - Adding resource handlers requires importing from `@modelcontextprotocol/sdk/types.js`
   - Must ensure existing tool handlers are not affected
   - **Risk**: Low - additive changes only

2. **`src/tools/definitions.ts`** (Modified)
   - Adding new tool definition
   - **Risk**: Low - additive change, existing definitions unchanged

3. **`src/tools/registry.ts`** (Modified)
   - Registering new tool handler
   - **Risk**: Low - additive change to handler map

4. **Build System** (`tsup.config.ts`)
   - May need to ensure `resources/content/` files are accessible at runtime
   - **Risk**: Medium - may need to copy static files or use different loading strategy

5. **Package Distribution** (`package.json`)
   - Need to include `resources/content/` and `vendor/` in published package
   - **Risk**: Medium - must update `files` array or `.npmignore`

### Dependency Chain Analysis

```
User Request → MCP Server → Resource Handler → File System
                         → Tool Handler → Content Extractor → File System
```

No circular dependencies introduced. The new code only reads from static files and does not modify any existing functionality.

### Test Impact

- Existing tests in `tests/` should not be affected (they test Cloudron API tools)
- New tests needed for:
  - Resource listing and reading
  - Tool handler with various topic/appType combinations
  - Content extraction from documentation files

### Runtime Considerations

1. **File Loading**: Documentation files must be accessible at runtime
   - Option A: Bundle as strings at build time
   - Option B: Read from filesystem at runtime (requires correct path resolution)
   - **Recommendation**: Option B with `__dirname` resolution for flexibility

2. **Memory**: Loading all documentation into memory is acceptable (< 100KB total)

3. **Performance**: Content can be cached after first load since it's static
