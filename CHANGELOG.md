# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-12-28

### Validated with Real API
- ✅ **F01** `cloudron_list_apps` - List all apps (CONFIRMED WORKING)
- ✅ **F07** `cloudron_list_backups` - List all backups (CONFIRMED WORKING)
- ✅ **F12** `cloudron_list_users` - List all users (CONFIRMED WORKING)
- ✅ **F23a** `cloudron_validate_manifest` - Validate app manifest format (CONFIRMED WORKING)
- ✅ **F38** `cloudron_list_domains` - List all domains (NEW FEATURE, CONFIRMED WORKING)

### Known Issues (Need Fixes)
- ❌ **F05** `cloudron_configure_app` - Returns 404 "No such route" (endpoint needs research)
- ❌ **F06** `cloudron_get_logs` - JSON parse error (API returns text, not JSON)
- ❌ **F22** `cloudron_search_apps` - 404 error (endpoint verification needed)

### Deferred (Require Staging Environment)
- ⏸️ **F08** `cloudron_create_backup` - Needs staging instance for safe testing
- ⏸️ **F13** `cloudron_create_user` - Needs staging instance for safe testing

### Progress Summary
- **12/38 features passing** (31.6% complete)
- Real API testing infrastructure established
- Test-first validation workflow proven
- Community-requested features prioritized

## [0.2.0] - 2025-12-25

### Added
- ✅ **F01** `cloudron_list_apps` - List all installed applications
- ✅ **F02** `cloudron_get_app` - Get detailed app information
- ✅ **F03** `cloudron_get_status` - Get Cloudron system status
- ✅ **F04** `cloudron_control_app` - Start/stop/restart applications
- ✅ **F09** `cloudron_uninstall_app` - Uninstall applications
- ✅ **F14** `cloudron_install_app` - Install new applications
- ✅ **F16** `cloudron_task_status` - Monitor async task progress

### Documentation
- Comprehensive README with setup instructions
- API endpoint documentation
- Testing guide with real API validation examples

## [0.1.0] - 2025-12-20

### Initial Release
- MCP server scaffold with TypeScript
- Basic Cloudron API client
- Authentication support (bearer token)
- Testing infrastructure (Jest)
- GitHub repository and npm package setup
