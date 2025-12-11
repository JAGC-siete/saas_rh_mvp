/**
 * Safe Logging Utilities
 * Sanitiza información sensible antes de loguear
 */

/**
 * Sanitiza datos sensibles para logging
 */
export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sanitized = { ...data }

  // Sanitizar userId (mostrar solo primeros 8 caracteres)
  if (sanitized.userId) {
    sanitized.userId = sanitized.userId.substring(0, 8) + '...'
  }

  // Sanitizar companyId (ocultar completamente)
  if (sanitized.companyId) {
    sanitized.companyId = '***'
  }

  // Sanitizar existingCompanyId
  if (sanitized.existingCompanyId) {
    sanitized.existingCompanyId = '***'
  }

  // Sanitizar employeeId (mostrar solo primeros 8 caracteres)
  if (sanitized.employeeId) {
    sanitized.employeeId = sanitized.employeeId.substring(0, 8) + '...'
  }

  // Sanitizar email (mostrar solo primeros 2 caracteres del local)
  if (sanitized.email) {
    const [local, domain] = String(sanitized.email).split('@')
    if (local && domain) {
      sanitized.email = local.substring(0, 2) + '***@' + domain
    } else {
      sanitized.email = '***'
    }
  }

  // Sanitizar DNI (mostrar solo últimos 4 dígitos)
  if (sanitized.dni) {
    const dniStr = String(sanitized.dni)
    sanitized.dni = '***' + dniStr.slice(-4)
  }

  // Sanitizar phone
  if (sanitized.phone) {
    const phoneStr = String(sanitized.phone)
    sanitized.phone = '***' + phoneStr.slice(-4)
  }

  // Sanitizar bank_account
  if (sanitized.bank_account) {
    const accountStr = String(sanitized.bank_account)
    sanitized.bank_account = '***' + accountStr.slice(-4)
  }

  // Sanitizar tokens y secrets
  const sensitiveKeys = ['token', 'secret', 'key', 'password', 'auth', 'authorization', 'api_key']
  sensitiveKeys.forEach(key => {
    if (sanitized[key]) {
      sanitized[key] = '***REDACTED***'
    }
  })

  // Sanitizar objetos anidados recursivamente
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] && typeof sanitized[key] === 'object' && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeLogData(sanitized[key])
    }
  })

  return sanitized
}

/**
 * Log seguro que sanitiza datos sensibles automáticamente
 */
export function secureLog(message: string, data: any = {}) {
  const sanitizedData = sanitizeLogData(data)
  
  // En producción, usar logger estructurado si está disponible
  if (process.env.NODE_ENV === 'production') {
    console.log(`[SECURE] ${message}`, sanitizedData)
  } else {
    console.log(`🔐 ${message}`, sanitizedData)
  }
}

/**
 * Log de error seguro
 */
export function secureErrorLog(message: string, error: any, context: any = {}) {
  const sanitizedContext = sanitizeLogData(context)
  
  // Sanitizar el error también
  let sanitizedError: any = {}
  if (error instanceof Error) {
    sanitizedError = {
      name: error.name,
      message: error.message,
      // En producción, no mostrar stack trace completo
      stack: process.env.NODE_ENV === 'production' 
        ? error.stack?.split('\n').slice(0, 2).join('\n') + '...'
        : error.stack
    }
  } else {
    sanitizedError = sanitizeLogData(error)
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(`[SECURE ERROR] ${message}`, {
      error: sanitizedError,
      context: sanitizedContext
    })
  } else {
    console.error(`❌ ${message}`, {
      error: sanitizedError,
      context: sanitizedContext
    })
  }
}

