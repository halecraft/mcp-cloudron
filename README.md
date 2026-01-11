# mcp-cloudron

[![npm version](https://badge.fury.io/js/%40halecraft%2Fmcp-cloudron.svg)](https://www.npmjs.com/package/@halecraft/mcp-cloudron)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

MCP server for [Cloudron](https://cloudron.io) instance management. Manage apps, backups, users, and more through the Model Context Protocol.

## Features

- **App Management** - List, install, uninstall, start, stop, restart, clone, repair, update, and backup applications
- **Backup Operations** - List and create instance backups
- **User Management** - List, create, update, and delete users with role assignment
- **Group Management** - List and create groups for access control
- **System Monitoring** - Check instance status, storage, services, and platform updates
- **Pre-flight Safety** - Validation checks before destructive operations
- **Async Task Tracking** - Monitor and cancel long-running operations
- **Packaging Guide** - Interactive documentation for creating Cloudron packages

## Installation

```bash
npm install @halecraft/mcp-cloudron
```

Or run directly with npx:

```bash
npx @halecraft/mcp-cloudron
```

## Configuration

### Environment Variables

| Variable             | Required | Description                                                 |
| -------------------- | -------- | ----------------------------------------------------------- |
| `CLOUDRON_BASE_URL`  | Yes      | Your Cloudron instance URL (e.g., `https://my.cloudron.io`) |
| `CLOUDRON_API_TOKEN` | Yes      | API token from Cloudron Admin Panel                         |

### Getting an API Token

1. Log in to your Cloudron Admin Panel
2. Go to **Settings → API Tokens**
3. Click **Create API Token**
4. Give it a name (e.g., "MCP Server")
5. Select **Read and Write** permissions
6. Copy the generated token

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cloudron": {
      "command": "npx",
      "args": ["-y", "@halecraft/mcp-cloudron"],
      "env": {
        "CLOUDRON_BASE_URL": "https://your-cloudron-instance.com",
        "CLOUDRON_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Available Tools

### App Management

| Tool | Description |
|------|-------------|
| `cloudron_list_apps` | List all installed applications with status and health |
| `cloudron_get_app` | Get detailed information about a specific application |
| `cloudron_control_app` | Start, stop, or restart an application |
| `cloudron_configure_app` | Update environment variables, memory limits, access control |
| `cloudron_install_app` | Install an application from the App Store |
| `cloudron_uninstall_app` | Uninstall an application (with pre-flight validation) |
| `cloudron_clone_app` | Clone an application to a new location |
| `cloudron_repair_app` | Repair a broken application |
| `cloudron_update_app` | Update an application to a newer version |
| `cloudron_restore_app` | Restore an application from a backup |
| `cloudron_backup_app` | Create a backup of a specific application |

### App Store

| Tool | Description |
|------|-------------|
| `cloudron_search_apps` | Search the Cloudron App Store |
| `cloudron_validate_manifest` | Validate an app before installation |

### Backups

| Tool | Description |
|------|-------------|
| `cloudron_list_backups` | List all available backups |
| `cloudron_create_backup` | Create a new instance backup |

### Users

| Tool | Description |
|------|-------------|
| `cloudron_list_users` | List all users |
| `cloudron_get_user` | Get details for a specific user |
| `cloudron_create_user` | Create a new user with role assignment |
| `cloudron_update_user` | Update user properties (email, role, password) |
| `cloudron_delete_user` | Delete a user (with pre-flight validation) |

### Groups

| Tool | Description |
|------|-------------|
| `cloudron_list_groups` | List all groups |
| `cloudron_create_group` | Create a new group |

### System

| Tool | Description |
|------|-------------|
| `cloudron_get_status` | Get Cloudron instance status and version |
| `cloudron_check_storage` | Check available disk space |
| `cloudron_list_services` | List platform services (MySQL, PostgreSQL, etc.) |
| `cloudron_list_domains` | List configured domains |
| `cloudron_get_logs` | Retrieve application or service logs |

### Tasks

| Tool | Description |
|------|-------------|
| `cloudron_task_status` | Check status of an async operation |
| `cloudron_cancel_task` | Cancel a running operation |
| `cloudron_validate_operation` | Pre-flight validation for destructive operations |

### Updates

| Tool | Description |
|------|-------------|
| `cloudron_check_updates` | Check for Cloudron platform updates |
| `cloudron_apply_update` | Apply a platform update |

### Package Development

| Tool | Description |
|------|-------------|
| `cloudron_packaging_guide` | Get interactive guidance for creating Cloudron packages |
| `cloudron_scaffold_package` | Generate a complete package scaffold with all required files |
| `cloudron_validate_package` | Validate package files for errors and best practices |

#### Packaging Guide Topics

- `overview` - Quick start checklist and workflow
- `manifest` - CloudronManifest.json field reference with examples
- `dockerfile` - Dockerfile best practices and base image usage
- `addons` - Available platform services (databases, auth, email, caching)
- `testing` - Integration test structure and patterns
- `publishing` - App Store submission process

#### Scaffold Package Options

Generate ready-to-use package files customized for your application:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `appType` | Yes | Application type: `nodejs`, `php`, `python`, `java`, `go`, `static` |
| `appName` | Yes | Name of your application |
| `appId` | No | Reverse domain ID (e.g., `com.example.myapp`) |
| `version` | No | Initial version (default: `1.0.0`) |
| `httpPort` | No | HTTP port (default: `8000`) |
| `healthCheckPath` | No | Health check path (default: `/`) |
| `addons` | No | Required addons: `localstorage`, `mysql`, `postgresql`, `mongodb`, `redis`, `ldap`, `oidc`, `sendmail`, `recvmail`, `scheduler` |
| `authMethod` | No | Authentication: `ldap`, `oidc`, `proxyAuth`, `none` |
| `memoryLimit` | No | Memory limit in bytes |

#### Validate Package

Check your package files for errors and best practices:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `manifest` | No | CloudronManifest.json content |
| `dockerfile` | No | Dockerfile content |
| `startScript` | No | start.sh content |

At least one file must be provided. Returns detailed validation report with errors, warnings, and suggestions.

## Available Resources

| Resource URI | Description |
|--------------|-------------|
| `cloudron://packaging-guide` | Complete Cloudron packaging documentation with reference implementation |

## Example Usage

Once configured, you can ask Claude to manage your Cloudron instance:

**Instance Management:**
- "List all my Cloudron apps"
- "What's the status of my Cloudron instance?"
- "Install Nextcloud on cloud.mydomain.com"
- "Create a backup of my instance"
- "Show me the logs for my WordPress app"
- "Create a new admin user with email admin@example.com"

**Package Development:**
- "Help me create a Cloudron package for my Node.js app"
- "Generate a scaffold for a Python app with PostgreSQL and Redis"
- "Scaffold a PHP app with OIDC authentication"
- "Validate my CloudronManifest.json file"
- "Check my Dockerfile for Cloudron best practices"
- "Show me how to configure addons in CloudronManifest.json"
- "What's the best practice for Dockerfile in Cloudron packages?"

## Development

### Setup

```bash
git clone https://github.com/halecraft/mcp-cloudron.git
cd mcp-cloudron
pnpm install
```

### Build

```bash
pnpm build
```

### Run Locally

```bash
export CLOUDRON_BASE_URL="https://your-instance.com"
export CLOUDRON_API_TOKEN="your-token"
pnpm start
```

### Test

```bash
pnpm test              # Unit tests
pnpm test:integration  # Integration tests (requires real Cloudron)
pnpm verify            # All checks (format, tests, types)
```

## API Reference

This server wraps the [Cloudron REST API](https://docs.cloudron.io/api/). See [TECHNICAL.md](TECHNICAL.md) for detailed architecture documentation and API coverage analysis.

## Known Limitations

- `cloudron_configure_app` - May return 404 on some Cloudron versions
- `cloudron_get_logs` - Returns raw text format
- Pagination not exposed for list operations

## Community

- 💬 [Cloudron Forum](https://forum.cloudron.io) - Discussion and support
- 🐛 [Issue Tracker](https://github.com/halecraft/mcp-cloudron/issues) - Report bugs
- 💡 [Feature Requests](https://github.com/halecraft/mcp-cloudron/issues/new?labels=enhancement) - Suggest improvements

## Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io) - MCP documentation
- [Cloudron](https://cloudron.io) - Self-hosted app platform
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## License

MIT - See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please open an issue or submit a pull request.
