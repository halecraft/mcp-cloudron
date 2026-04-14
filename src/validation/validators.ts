/**
 * Input validation utilities
 * Reusable validators for email, password, and other common inputs
 */

/**
 * Validate email format using RFC 5322 simplified regex
 * @param email - Email to validate
 * @returns true if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * Requirements: 8+ characters, 1 uppercase letter, 1 number
 * @param password - Password to validate
 * @returns true if password meets strength requirements
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false
  if (!/[A-Z]/.test(password)) return false // At least 1 uppercase
  if (!/[0-9]/.test(password)) return false // At least 1 number
  return true
}

/**
 * Validate that a string is non-empty
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @returns true if value is non-empty string
 */
export function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

/**
 * Validate that a value is a positive number
 * @param value - Value to validate
 * @returns true if value is a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && value > 0
}

/**
 * Validate user role
 * @param role - Role to validate
 * @returns true if role is valid
 */
export function isValidRole(
  role: unknown,
): role is "owner" | "admin" | "usermanager" | "mailmanager" | "user" {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "usermanager" ||
    role === "mailmanager" ||
    role === "user"
  )
}
