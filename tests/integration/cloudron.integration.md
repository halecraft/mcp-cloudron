# Integration Test Coverage Analysis

Here is the breakdown of supported Cloudron API endpoints and their current integration test coverage status.

| Endpoint | Method | Tool Name | Integration Test Coverage |
| :--- | :--- | :--- | :---: |
| **Apps** | | | |
| `/api/v1/apps` | GET | `cloudron_list_apps` | ✅ |
| `/api/v1/apps/:id` | GET | `cloudron_get_app` | ✅ |
| `/api/v1/apps` | POST | `cloudron_install_app` | ✅ |
| `/api/v1/apps/:id/start` | POST | `cloudron_control_app` | ✅ |
| `/api/v1/apps/:id/stop` | POST | `cloudron_control_app` | ✅ |
| `/api/v1/apps/:id/restart` | POST | `cloudron_control_app` | ✅ |
| `/api/v1/apps/:id/configure` | PUT | `cloudron_configure_app` | ✅ |
| `/api/v1/apps/:id/uninstall` | POST | `cloudron_uninstall_app` | ✅ |
| `/api/v1/apps/:id/clone` | POST | `cloudron_clone_app` | ✅ |
| `/api/v1/apps/:id/repair` | POST | `cloudron_repair_app` | ❌ (Hard to test safely) |
| `/api/v1/apps/:id/restore` | POST | `cloudron_restore_app` | ✅ |
| `/api/v1/apps/:id/update` | POST | `cloudron_update_app` | ❌ (Requires old version) |
| `/api/v1/apps/:id/backup` | POST | `cloudron_backup_app` | ✅ |
| `/api/v1/apps/:id/logs` | GET | `cloudron_get_logs` | ✅ |
| **App Store** | | | |
| `/api/v1/appstore/apps` | GET | `cloudron_search_apps` | ✅ |
| **Backups** | | | |
| `/api/v1/backups` | GET | `cloudron_list_backups` | ✅ |
| `/api/v1/backups` | POST | `cloudron_create_backup` | ✅ |
| **Users** | | | |
| `/api/v1/users` | GET | `cloudron_list_users` | ✅ |
| `/api/v1/users/:id` | GET | `cloudron_get_user` | ✅ |
| `/api/v1/users` | POST | `cloudron_create_user` | ✅ |
| `/api/v1/users/:id` | PUT | `cloudron_update_user` | ✅ |
| `/api/v1/users/:id` | DELETE | `cloudron_delete_user` | ✅ |
| **Groups** | | | |
| `/api/v1/groups` | GET | `cloudron_list_groups` | ✅ |
| `/api/v1/groups` | POST | `cloudron_create_group` | ✅ |
| **System & Services** | | | |
| `/api/v1/cloudron/status` | GET | `cloudron_get_status` | ✅ |
| `/api/v1/services` | GET | `cloudron_list_services` | ✅ |
| `/api/v1/domains` | GET | `cloudron_list_domains` | ✅ |
| **Updates** | | | |
| `/api/v1/updates` | GET | `cloudron_check_updates` | ✅ |
| `/api/v1/updates` | POST | `cloudron_apply_update` | ❌ (Destructive/Rare) |
| **Tasks** | | | |
| `/api/v1/tasks/:id` | GET | `cloudron_task_status` | ✅ |
| `/api/v1/tasks/:id` | DELETE | `cloudron_cancel_task` | ✅ |

**Legend:**
*   ✅ **Covered**: Explicitly tested in `tests/integration/*.integration.test.ts`.
*   ⚠️ **Partial/Implicit**: Used as a helper or setup step, but not the primary subject of a test case.
*   ❌ **Missing**: No integration test coverage (often due to safety or prerequisite constraints).
