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
   * Update a user's properties
   * PUT /api/v1/users/:userId
   * @param userId - The user ID to update
   * @param params - Update parameters (email, displayName, role, password)
   * @returns Updated user object
   */
  async updateUser(userId: string, params: UpdateUserParams): Promise<User> {
    if (!userId) {
      throw new CloudronError("userId is required")
    }

    // Validate params object has at least one field
    if (!params || Object.keys(params).length === 0) {
      throw new CloudronError(
        "params object cannot be empty. Provide at least one of: email, displayName, role, password",
      )
    }

    // Validate email format if provided
    if (params.email !== undefined && !isValidEmail(params.email)) {
      throw new CloudronError("Invalid email format")
    }

    // Validate role if provided
    if (params.role !== undefined && !isValidRole(params.role)) {
      throw new CloudronError(
        `Invalid role: ${params.role}. Valid options: admin, user, guest`,
      )
    }

    // Validate password strength if provided
    if (params.password !== undefined && !isValidPassword(params.password)) {
      throw new CloudronError(
        "Password must be at least 8 characters long and contain at least 1 uppercase letter and 1 number",
      )
    }

    return await this.http.put<User>(
      `/api/v1/users/${encodeURIComponent(userId)}`,
      params,
    )
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
