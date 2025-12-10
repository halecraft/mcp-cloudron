# mcp-cloudron

[![npm version](https://badge.fury.io/js/%40serenichron%2Fmcp-cloudron.svg)](https://www.npmjs.com/package/@serenichron/mcp-cloudron)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Compatible-blue.svg)](https://modelcontextprotocol.io)

MCP server for [Cloudron](https://cloudron.io) instance management. List apps, get status, and manage your self-hosted applications through the Model Context Protocol.

## Features

- **List Applications**: Get all installed apps with status, health, and memory usage
- **Get App Details**: Retrieve detailed information about specific applications
- **Instance Status**: Check Cloudron version, provider, and configuration

## Installation

```bash
npm install @serenichron/mcp-cloudron
```

Or run directly with npx:

```bash
npx @serenichron/mcp-cloudron
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDRON_BASE_URL` | Yes | Your Cloudron instance URL (e.g., `https://my.cloudron.io`) |
| `CLOUDRON_API_TOKEN` | Yes | API token from Cloudron Admin Panel |

### Getting an API Token

1. Log in to your Cloudron Admin Panel
2. Go to **Settings → API Tokens**
3. Click **Create API Token**
4. Give it a name (e.g., "MCP Server")
5. Copy the generated token

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cloudron": {
      "command": "npx",
      "args": ["@serenichron/mcp-cloudron"],
      "env": {
        "CLOUDRON_BASE_URL": "https://your-cloudron-instance.com",
        "CLOUDRON_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Usage with Docker MCP Gateway

Add to your Docker MCP config (`~/.docker/mcp/config.yaml`):

```yaml
mcpServers:
  cloudron:
    command: npx
    args: ["@serenichron/mcp-cloudron"]
    env:
      CLOUDRON_BASE_URL: "https://your-cloudron-instance.com"
      CLOUDRON_API_TOKEN: "your-api-token"
```

## Available Tools

### cloudron_list_apps

List all installed applications on the Cloudron instance.

**Parameters**: None

**Returns**: List of apps with name, domain, ID, state, health, and memory usage.

**Example output**:
```
Found 3 apps:

WordPress (blog.example.com)
  ID: abc123-def456
  State: installed
  Health: healthy
  Memory: 512 MB

GitLab (git.example.com)
  ID: xyz789-uvw012
  State: installed
  Health: healthy
  Memory: 4096 MB
```

### cloudron_get_app

Get detailed information about a specific application.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `appId` | string | Yes | The unique identifier of the application |

**Returns**: App details including name, domain, state, health, and memory.

### cloudron_get_status

Get the current status and configuration of the Cloudron instance.

**Parameters**: None

**Returns**: Instance information including name, version, admin URL, provider, and demo mode status.

**Example output**:
```
Cloudron Status:
  Name: My Cloudron
  Version: 9.0.13
  Admin URL: my.cloudron.io
  Provider: digitalocean
  Demo Mode: false
```

## Development

### Setup

```bash
git clone https://github.com/serenichron/mcp-cloudron.git
cd mcp-cloudron
npm install
```

### Build

```bash
npm run build
```

### Run locally

```bash
export CLOUDRON_BASE_URL="https://your-instance.com"
export CLOUDRON_API_TOKEN="your-token"
npm start
```

### Test

```bash
npm test
```

## API Reference

The server uses the [Cloudron REST API](https://docs.cloudron.io/api/). Currently implemented endpoints:

- `GET /api/v1/apps` - List all applications
- `GET /api/v1/apps/:id` - Get application by ID
- `GET /api/v1/cloudron/status` - Get instance status

## Changelog

### v0.2.0 (2025-12-26)

**New Features**:
- 15 new MCP tools across app management, backups, users, infrastructure
- Pre-flight validation for destructive operations (F37)
- Storage checks before data creation (F36)
- Async task tracking and cancellation (F34, F35)

**Critical Bug Fixes**:
- F23b: Corrected endpoint path and added required domain parameter
- F04: Fixed HTTP method (DELETE → POST) for uninstall operation
- Both bugs discovered via real API testing (mock tests validated nothing)

**Testing**:
- Real Cloudron API integration testing
- Validated against live instance
- All 16 tools tested with actual API calls

## Roadmap

Future versions may include:

- [ ] Domain configuration
- [ ] App installation from App Store

## Community

- 💬 [Cloudron Forum](https://forum.cloudron.io) - Discussion and support
- 🐛 [Issue Tracker](https://github.com/serenichron/mcp-cloudron/issues) - Report bugs
- 💡 [Feature Requests](https://github.com/serenichron/mcp-cloudron/issues/new?labels=enhancement) - Suggest improvements

### Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io) - MCP documentation
- [Cloudron](https://cloudron.io) - Self-hosted app platform

## License

MIT - See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Related

- [Cloudron Documentation](https://docs.cloudron.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

# Origin

This repo was forked from https://github.com/serenichron/mcp-cloudron, and cleaned up:

❯ git filter-repo --force --path node_modules --invert-paths
❯ git filter-repo --force --path dist --invert-paths
❯ git filter-repo --force --path TESTING.md --invert-paths
❯ git filter-repo --force --path PHASE_2_3_SUMMARY.md --invert-paths
❯ git filter-repo --force --path .serena --invert-paths
❯ git filter-repo --force --path FORUM_POST.md --invert-paths
❯ git filter-repo --force --path coverage/ --invert-paths
❯ git filter-repo --force --path REAL_TEST_RESULTS_F23B.md --invert-paths
❯ git filter-repo --force --path TESTING_NOTES.md --invert-paths

Fix deprecated packages.