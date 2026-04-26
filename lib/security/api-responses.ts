/**
 * Standardized API response helpers
 * Ensures consistent error handling and response format across all endpoints
 */

export interface SuccessResponse<T = any> {
  success: true
  data: T
  meta?: Record<string, any>
}

export interface ErrorResponse {
  success: false
  error: string
  code?: string
  details?: Record<string, any>
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, any>
): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta })
  }
}

/**
 * Create an error response
 */
export function createErrorResponse(
  error: string,
  code?: string,
  details?: Record<string, any>
): ErrorResponse {
  return {
    success: false,
    error,
    ...(code && { code }),
    ...(details && { details })
  }
}

/**
 * Create an authentication error response
 */
export function createAuthErrorResponse(reason: string): ErrorResponse {
  return createErrorResponse(reason, 'AUTH_ERROR', { reason })
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  fields: Record<string, string>
): ErrorResponse {
  return createErrorResponse('Validation failed', 'VALIDATION_ERROR', { fields })
}

/**
 * Create a not found error response
 */
export function createNotFoundErrorResponse(resource: string): ErrorResponse {
  return createErrorResponse(`${resource} not found`, 'NOT_FOUND', { resource })
}

/**
 * Create a forbidden error response
 */
export function createForbiddenErrorResponse(reason: string): ErrorResponse {
  return createErrorResponse('Access denied', 'FORBIDDEN', { reason })
}






