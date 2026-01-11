/**
 * MCP Tool Definitions for Cloudron
 *
 * This file contains the schema definitions for all available tools.
 * Each tool has a name, description, and input schema.
 */

export const TOOLS = [
  {
    name: "cloudron_list_apps",
    description:
      "List all installed applications on the Cloudron instance. Returns app details including name, domain, status, and health.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "cloudron_get_app",
    description:
      "Get detailed information about a specific application by its ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        appId: {
          type: "string",
          description: "The unique identifier of the application",
        },
      },
      required: ["appId"],
    },
  },
  {
    name: "cloudron_get_status",
    description:
      "Get the current status and configuration of the Cloudron instance.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "cloudron_task_status",
    description:
      "Get the status of an async operation (backup, install, restore, etc.) by task ID. Returns state (pending/running/success/error/cancelled), progress (0-100%), and message.",
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "The unique identifier of the task to check",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "cloudron_cancel_task",
    description:
      'Cancel a running async operation (kill switch). Returns updated task status with state "cancelled". Already completed tasks cannot be cancelled. Cancelled tasks cleanup resources (e.g., partial backups deleted).',
    inputSchema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "The unique identifier of the task to cancel",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "cloudron_check_storage",
    description:
      "Check available disk space before operations that create data (backup, install). Returns available/total/used disk space in MB, plus warning and critical threshold alerts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        requiredMB: {
          type: "number",
          description:
            "Optional: Required disk space in MB. If provided, checks if available >= requiredMB",
        },
      },
      required: [],
    },
  },
  {
    name: "cloudron_validate_operation",
    description:
      "Pre-flight validation for destructive operations (uninstall app, delete user, restore backup). Returns validation result with blocking errors, warnings, and recommendations.",
    inputSchema: {
      type: "object" as const,
      properties: {
        operation: {
          type: "string",
          enum: ["uninstall_app", "delete_user", "restore_backup"],
          description: "Type of destructive operation to validate",
        },
        resourceId: {
          type: "string",
          description:
            "ID of the resource being operated on (appId, userId, or backupId)",
        },
      },
      required: ["operation", "resourceId"],
    },
  },
  {
    name: "cloudron_control_app",
    description:
      "Control app lifecycle (start, stop, restart). Returns 202 Accepted with task ID for async operation tracking via cloudron_task_status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        appId: {
          type: "string",
          description: "The unique identifier of the application to control",
        },
        action: {
          type: "string",
          enum: ["start", "stop", "restart"],
          description: "Action to perform on the app",
        },
      },
      required: ["appId", "action"],
    },
  },
  {
    name: "cloudron_configure_app",
    description:
      "Update application configuration including environment variables, memory limits, and access control settings. Returns 200 OK with updated app config and restart requirement flag.",
    inputSchema: {
      type: "object" as const,
      properties: {
        appId: {
          type: "string",
          description: "The unique identifier of the application to configure",
        },
        config: {
          type: "object",
          description:
            "Configuration object with env vars, memoryLimit, and/or accessRestriction",
          properties: {
            env: {
              type: "object",
              description:
                "Environment variables as key-value pairs (optional)",
              additionalProperties: { type: "string" },
            },
            memoryLimit: {
              type: "number",
              description: "Memory limit in MB (optional)",
            },
            accessRestriction: {
              type: ["string", "null"],
              description: "Access control settings (optional)",
            },
          },
        },
      },
      required: ["appId", "config"],
    },
  },
  {
    name: "cloudron_list_backups",
    description:
      "List all backups available on the Cloudron instance. Returns backup details including ID, timestamp, size, app count, and status. Backups are sorted by timestamp (newest first).",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "cloudron_create_backup",
    description:
      "Create a new backup of the Cloudron instance. Performs F36 pre-flight storage check (requires 5GB minimum). Returns task ID for tracking backup progress via cloudron_task_status (F34).",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "cloudron_list_users",
    description:
      "List all users on the Cloudron instance. Returns user details including ID, email, username, role, and creation date. Users are sorted by role (admin, user, guest) then email.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "cloudron_search_apps",
    description:
      "Search the Cloudron App Store for available applications. Returns app details including name, description, version, icon URL, and install count. Results are sorted by relevance score. Empty query returns all available apps.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query to filter apps (optional - empty returns all apps)",
        },
      },
      required: [],
    },
  },
  {
    name: "cloudron_validate_manifest",
    description:
      "Validate app manifest before installation (pre-flight safety check). Checks storage sufficiency via F36, dependency availability, and manifest schema validity. Returns validation report with errors and warnings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        appId: {
          type: "string",
          description: "The App Store ID to validate",
        },
      },
      required: ["appId"],
    },
  },
  {
    name: "cloudron_create_user",
    description:
      "Create a new user on the Cloudron instance with role assignment (atomic operation). Password must be at least 8 characters long and contain at least 1 uppercase letter and 1 number. Returns 201 Created with user object.",
    inputSchema: {
      type: "object" as const,
      properties: {
        email: {
          type: "string",
          description: "User email address (must be valid format)",
        },
        password: {
          type: "string",
          description: "User password (8+ characters, 1 uppercase, 1 number)",
        },
        role: {
          type: "string",
          enum: ["admin", "user", "guest"],
          description:
            "User role: admin (full access), user (standard access), or guest (limited access)",
        },
      },
      required: ["email", "password", "role"],
    },
  },
  {
    name: "cloudron_list_domains",
    description:
      "List all configured domains on the Cloudron instance. Returns domain details including name, provider, verification status, and TLS configuration.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "cloudron_get_logs",
    description:
      'Get logs for an app or service. Logs are formatted with timestamps and severity levels for readability. Type parameter determines endpoint: "app" calls GET /api/v1/apps/:id/logs, "service" calls GET /api/v1/services/:id/logs.',
    inputSchema: {
      type: "object" as const,
      properties: {
        resourceId: {
          type: "string",
          description: "App ID or service ID to retrieve logs for",
        },
        type: {
          type: "string",
          enum: ["app", "service"],
          description:
            'Type of resource: "app" for application logs, "service" for system service logs',
        },
        lines: {
          type: "number",
          description:
            "Optional: Number of log lines to retrieve (default 100, max 1000)",
        },
      },
      required: ["resourceId", "type"],
    },
  },
  {
    name: "cloudron_uninstall_app",
    description:
      "Uninstall an application with pre-flight safety validation. DESTRUCTIVE OPERATION. First validates via cloudron_validate_operation (checks app exists, no dependencies, backup recommended), then calls DELETE /api/v1/apps/:id. Returns 202 Accepted with task ID for async operation tracking.",
    inputSchema: {
      type: "object" as const,
      properties: {
        appId: {
          type: "string",
          description: "The unique identifier of the application to uninstall",
        },
      },
      required: ["appId"],
    },
  },
  {
    name: "cloudron_install_app",
    description:
      "Install application from Cloudron App Store with pre-flight validation. Calls F23a (cloudron_validate_manifest) to verify app exists and F36 (cloudron_check_storage) to ensure sufficient disk space. Returns task ID for async operation tracking via cloudron_task_status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        manifestId: {
          type: "string",
          description: "App manifest ID from App Store",
        },
        location: {
          type: "string",
          description: "Subdomain for app installation",
        },
        domain: {
          type: "string",
          description: "Domain where app will be installed (REQUIRED)",
        },
        portBindings: {
          type: "object",
          description: "Optional port bindings",
        },
        accessRestriction: {
          type: ["string", "null"],
          description:
            "Access control setting (can be null for no restriction)",
        },
        env: {
          type: "object",
          description: "Environment variables",
        },
      },
      required: ["manifestId", "location", "domain", "accessRestriction"],
    },
  },
  // ==================== New App Management Tools ====================
  {
    name: "cloudron_clone_app",
    description:
      "Clone an existing application to a new location. Creates a duplicate of the app with its data and configuration. Performs pre-flight validation to check source app exists and target location is available. Returns task ID for async operation tracking via cloudron_task_status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        appId: {
          type: "string",
          description: "The unique identifier of the application to clone",
        },
        location: {
          type: "string",
          description: "Subdomain for the cloned app (REQUIRED)",
        },
        domain: {
          type: "string",
          description:
            "Domain for the cloned app (optional, defaults to same domain as source)",
        },
        portBindings: {
          type: "object",
          description: "Optional port bindings for the clone",
        },
        backupId: {
          type: "string",
          description:
            "Optional backup ID to clone from a specific backup state",
        },
      },
      required: ["appId", "location"],
    },
  },
  {
    name: "cloudron_repair_app",
    description:
      "Repair a broken application. Attempts automatic repair of apps in error state. Use when an app is unhealthy or has installation issues. Returns task ID for async operation tracking via cloudron_task_status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        appId: {
          type: "string",
          description: "The unique identifier of the application to repair",
        },
      },
      required: ["appId"],
    },
  },
  {
    name: "cloudron_restore_app",
    description:
      "Restore an application from a backup. DESTRUCTIVE OPERATION - current app data will be replaced. Performs pre-flight validation to check backup exists and storage is sufficient. Returns task ID for async operation tracking via cloudron_task_status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        appId: {
          type: "string",
          description: "The unique identifier of the application to restore",
        },
        backupId: {
          type: "string",
          description: "The backup ID to restore from (REQUIRED)",
        },
      },
      required: ["appId", "backupId"],
    },
  },
  {
    name: "cloudron_update_app",
    description:
      "Update an application to a newer version. Performs pre-flight validation to check app exists and is in installed state. Returns task ID for async operation tracking via cloudron_task_status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        appId: {
          type: "string",
          description: "The unique identifier of the application to update",
        },
        version: {
          type: "string",
          description:
            "Optional specific version to update to (defaults to latest)",
        },
        force: {
          type: "boolean",
          description: "Force update even if already on same version",
        },
      },
      required: ["appId"],
    },
  },
  {
    name: "cloudron_backup_app",
    description:
      "Create a backup of a specific application. Performs pre-flight storage check (requires 5GB minimum). Returns task ID for async operation tracking via cloudron_task_status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        appId: {
          type: "string",
          description: "The unique identifier of the application to backup",
        },
      },
      required: ["appId"],
    },
  },
  // ==================== Services Tools ====================
  {
    name: "cloudron_list_services",
    description:
      "List all platform services (read-only diagnostics). Returns status of Cloudron infrastructure services like databases (MySQL, PostgreSQL, MongoDB), mail, and other platform components. This is diagnostic information - services are managed automatically by Cloudron.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  // ==================== User Management Tools ====================
  {
    name: "cloudron_get_user",
    description:
      "Get detailed information about a specific user by their ID. Returns user details including email, username, role, and creation date.",
    inputSchema: {
      type: "object" as const,
      properties: {
        userId: {
          type: "string",
          description: "The unique identifier of the user",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "cloudron_update_user",
    description:
      "Update a user's properties including email, display name, role, or password. At least one property must be provided. Role changes have security implications - promoting to admin grants full access, demoting from admin may lock out if last admin.",
    inputSchema: {
      type: "object" as const,
      properties: {
        userId: {
          type: "string",
          description: "The unique identifier of the user to update",
        },
        email: {
          type: "string",
          description: "New email address for the user (optional)",
        },
        displayName: {
          type: "string",
          description: "New display name for the user (optional)",
        },
        role: {
          type: "string",
          enum: ["admin", "user", "guest"],
          description: "New role for the user (optional)",
        },
        password: {
          type: "string",
          description:
            "New password for the user (optional, must meet strength requirements: 8+ chars, 1 uppercase, 1 number)",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "cloudron_delete_user",
    description:
      "Delete a user from the Cloudron instance. DESTRUCTIVE OPERATION. Performs pre-flight validation to check user exists and is not the last admin. Returns 204 No Content on success.",
    inputSchema: {
      type: "object" as const,
      properties: {
        userId: {
          type: "string",
          description: "The unique identifier of the user to delete",
        },
      },
      required: ["userId"],
    },
  },
  // ==================== Group Management Tools ====================
  {
    name: "cloudron_list_groups",
    description:
      "List all groups on the Cloudron instance. Returns group details including ID, name, and creation date. Groups are sorted alphabetically by name.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "cloudron_create_group",
    description:
      "Create a new group on the Cloudron instance. Groups can be used for access control and user organization.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "The name of the group to create (required)",
        },
      },
      required: ["name"],
    },
  },
  // ==================== Update Management Tools ====================
  {
    name: "cloudron_check_updates",
    description:
      "Check if Cloudron platform updates are available. Returns update information including availability, version, and changelog if an update exists.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "cloudron_apply_update",
    description:
      "Apply available Cloudron platform update. DESTRUCTIVE OPERATION - services will restart during update. Performs pre-flight validation to check update is available and recommends backup. Returns task ID for async operation tracking via cloudron_task_status.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  // ==================== Packaging Guide Tool ====================
  {
    name: "cloudron_packaging_guide",
    description:
      "Get interactive, topic-specific guidance for creating Cloudron packages. Provides documentation, best practices, and reference implementation examples for packaging web applications for Cloudron.",
    inputSchema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          enum: [
            "overview",
            "manifest",
            "dockerfile",
            "addons",
            "testing",
            "publishing",
          ],
          description:
            "The packaging topic to get guidance on. 'overview' provides quick start and workflow, 'manifest' covers CloudronManifest.json fields, 'dockerfile' covers Dockerfile best practices, 'addons' covers available platform services, 'testing' covers integration test patterns, 'publishing' covers App Store submission.",
        },
        appType: {
          type: "string",
          enum: ["nodejs", "php", "python", "java", "go", "static"],
          description:
            "Optional: The type of application being packaged. Provides language/framework-specific guidance when topic is 'dockerfile'.",
        },
      },
      required: ["topic"],
    },
  },
]
