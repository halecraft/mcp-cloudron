/**
 * Users API
 * User management operations
 */

import { CloudronError } from "../errors.js"
import type {
  UpdateUserParams,
  User,
  UsersResponse,
  ValidationResult,
} from "../types.js"
import {
  isValidEmail,
  isValidPassword,
  isValidRole,
} from "../validation/index.js"
import type { HttpClient } from "./http-client.js"

/**
 * Interface for user validation (dependency injection)
 */
export interface UserValidator {
  validateOperation(
    operation: "delete_user",
    resourceId: string,
  ): Promise<ValidationResult>
}

/**
 * Users API for Cloudron user management
 */
export class UsersApi {
  constructor(
    private readonly http: HttpClient,
    private readonly validator?: UserValidator,
  ) {}

  /**
   * List all users on Cloudron instance
   * GET /api/v1/users
   * @returns Array of users sorted by role then email
   */
  async listUsers(): Promise<User[]> {
    const response = await this.http.get<UsersResponse>("/api/v1/users")

    // Sort users by role then email
    const users = response.users || []
    return users.sort((a, b) => {
      // Sort by role first (admin > user > guest)
      const roleOrder: Record<string, number> = { admin: 0, user: 1, guest: 2 }
      const roleA = roleOrder[a.role] ?? 3
      const roleB = roleOrder[b.role] ?? 3
      const roleCompare = roleA - roleB
      if (roleCompare !== 0) return roleCompare

      // Then by email alphabetically
      return a.email.localeCompare(b.email)
    })
  }

  /**
   * Get a specific user by ID
   * GET /api/v1/users/:userId
   * @param userId - The user ID to retrieve
   * @returns User object
   */
  async getUser(userId: string): Promise<User> {
    if (!userId) {
      throw new CloudronError("userId is required")
    }
    return await this.http.get<User>(
      `/api/v1/users/${encodeURIComponent(userId)}`,
    )
  }

  /**
   * Create a new user with role assignment (atomic operation)
   * POST /api/v1/users
   * @param email - User email address
   * @param password - User password (must meet strength requirements)
   * @param role - User role: 'admin', 'user', or 'guest'
   * @returns Created user object
   */
  async createUser(
    email: string,
    password: string,
    role: "admin" | "user" | "guest",
  ): Promise<User> {
    // Validate email format
    if (!email || !isValidEmail(email)) {
      throw new CloudronError("Invalid email format")
    }

    // Validate password strength (8+ chars, 1 uppercase, 1 number)
    if (!isValidPassword(password)) {
      throw new CloudronError(
        "Password must be at least 8 characters long and contain at least 1 uppercase letter and 1 number",
      )
    }

    // Validate role enum
    if (!isValidRole(role)) {
      throw new CloudronError(
        `Invalid role: ${role}. Valid options: admin, user, guest`,
      )
    }

    return await this.http.post<User>("/api/v1/users", {
      email,
      password,
      role,
    })
  }

  /**
   * Update a user's profile (email, displayName)
   * POST /api/v1/users/:userId/profile
   * @param userId - The user ID to update
   * @param params - Profile parameters (email, displayName)
   */
  async updateUserProfile(
    userId: string,
    params: { email?: string; displayName?: string },
  ): Promise<void> {
    if (!userId) {
      throw new CloudronError("userId is required")
    }

    // Validate params object has at least one field
    if (!params || Object.keys(params).length === 0) {
      throw new CloudronError(
        "params object cannot be empty. Provide at least one of: email, displayName",
      )
    }

    // Validate email format if provided
    if (params.email !== undefined && !isValidEmail(params.email)) {
      throw new CloudronError("Invalid email format")
    }

    // POST /api/v1/users/:userId/profile returns 204 No Content
    await this.http.post<void>(
      `/api/v1/users/${encodeURIComponent(userId)}/profile`,
      params,
    )
  }

  /**
   * Update a user's role
   * PUT /api/v1/users/:userId/role
   * @param userId - The user ID to update
   * @param role - New role (owner, admin, usermanager, mailmanager, user)
   */
  async updateUserRole(
    userId: string,
    role: "owner" | "admin" | "usermanager" | "mailmanager" | "user",
  ): Promise<void> {
    if (!userId) {
      throw new CloudronError("userId is required")
    }

    const validRoles = ["owner", "admin", "usermanager", "mailmanager", "user"]
    if (!validRoles.includes(role)) {
      throw new CloudronError(
        `Invalid role: ${role}. Valid options: ${validRoles.join(", ")}`,
      )
    }

    // PUT /api/v1/users/:userId/role returns 204 No Content
    await this.http.put<void>(
      `/api/v1/users/${encodeURIComponent(userId)}/role`,
      { role },
    )
  }

  /**
   * Update a user's properties (convenience method)
   * @param userId - The user ID to update
   * @param params - Update parameters (email, displayName, role)
   * @returns Updated user object
   */
  async updateUser(userId: string, params: UpdateUserParams): Promise<User> {
    if (!userId) {
      throw new CloudronError("userId is required")
    }

    // Validate params object has at least one field
    if (!params || Object.keys(params).length === 0) {
      throw new CloudronError(
        "params object cannot be empty. Provide at least one of: email, displayName, role",
      )
    }

    // Validate email format if provided
    if (params.email !== undefined && !isValidEmail(params.email)) {
      throw new CloudronError("Invalid email format")
    }

    // Validate role if provided - use the full role set from OpenAPI
    const validRoles = ["owner", "admin", "usermanager", "mailmanager", "user"]
    if (params.role !== undefined && !validRoles.includes(params.role)) {
      throw new CloudronError(
        `Invalid role: ${params.role}. Valid options: ${validRoles.join(", ")}`,
      )
    }

    // Handle profile updates (email, displayName)
    const profileParams: { email?: string; displayName?: string } = {}
    if (params.email !== undefined) profileParams.email = params.email
    if (params.displayName !== undefined)
      profileParams.displayName = params.displayName

    if (Object.keys(profileParams).length > 0) {
      await this.updateUserProfile(userId, profileParams)
    }

    // Handle role update separately
    if (params.role !== undefined) {
      await this.updateUserRole(userId, params.role)
    }

    // Return updated user
    return await this.getUser(userId)
  }

  /**
   * Delete a user (DESTRUCTIVE OPERATION)
   * DELETE /api/v1/users/:userId
   * Performs pre-flight validation via validateDeleteUser before proceeding
   * @param userId - The user ID to delete
   */
  async deleteUser(userId: string): Promise<void> {
    if (!userId) {
      throw new CloudronError("userId is required")
    }

    // Pre-flight validation if validator is provided
    if (this.validator) {
      const validation = await this.validator.validateOperation(
        "delete_user",
        userId,
      )

      // If validation fails, throw error with validation details
      if (!validation.valid) {
        const errorMessage = `Pre-flight validation failed for delete_user on '${userId}':\n${validation.errors.join("\n")}`
        throw new CloudronError(errorMessage)
      }
    }

    // Proceed with delete if validation passes
    await this.http.delete<void>(`/api/v1/users/${encodeURIComponent(userId)}`)
  }
}
