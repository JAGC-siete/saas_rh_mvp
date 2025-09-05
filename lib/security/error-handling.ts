/**
 * Manejo seguro de errores para prevenir exposición de información sensible
 * Diferencia entre entornos de desarrollo y producción
 */

export interface SecureErrorResponse {
  error: string
  message: string
  code?: string
  timestamp?: string
}

export interface ErrorContext {
  userId?: string
  endpoint?: string
  action?: string
  metadata?: Record<string, any>
}

/**
 * Crea una respuesta de error segura basada en el entorno
 */
export function createSecureErrorResponse(
  error: unknown, 
  context: ErrorContext = {},
  isProduction: boolean = process.env.NODE_ENV === 'production'
): SecureErrorResponse {
  const timestamp = new Date().toISOString()
  
  // Log del error para debugging interno
  console.error('Error interno:', {
    error: error instanceof Error ? error.message : 'Error desconocido',
    stack: error instanceof Error ? error.stack : undefined,
    context,
    timestamp
  })
  
  if (isProduction) {
    // En producción: información mínima
    return {
      error: 'Error interno del servidor',
      message: 'Ha ocurrido un error inesperado. Intente nuevamente.',
      code: 'INTERNAL_ERROR',
      timestamp
    }
  } else {
    // En desarrollo: información detallada
    return {
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido',
      code: 'INTERNAL_ERROR',
      timestamp
    }
  }
}

/**
 * Crea respuesta de error para validación de entrada
 */
export function createValidationErrorResponse(
  message: string,
  field?: string
): SecureErrorResponse {
  return {
    error: 'Datos de entrada inválidos',
    message: field ? `${field}: ${message}` : message,
    code: 'VALIDATION_ERROR',
    timestamp: new Date().toISOString()
  }
}

/**
 * Crea respuesta de error para autenticación
 */
export function createAuthErrorResponse(
  message: string = 'No autorizado'
): SecureErrorResponse {
  return {
    error: 'Error de autenticación',
    message,
    code: 'AUTH_ERROR',
    timestamp: new Date().toISOString()
  }
}

/**
 * Crea respuesta de error para autorización
 */
export function createAuthorizationErrorResponse(
  message: string = 'Permisos insuficientes'
): SecureErrorResponse {
  return {
    error: 'Error de autorización',
    message,
    code: 'AUTHORIZATION_ERROR',
    timestamp: new Date().toISOString()
  }
}

/**
 * Crea respuesta de error para recursos no encontrados
 */
export function createNotFoundErrorResponse(
  resource: string = 'Recurso'
): SecureErrorResponse {
  return {
    error: 'Recurso no encontrado',
    message: `${resource} no encontrado`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  }
}

/**
 * Crea respuesta de error para límites de rate limiting
 */
export function createRateLimitErrorResponse(
  retryAfter?: number
): SecureErrorResponse {
  const response: SecureErrorResponse = {
    error: 'Demasiadas solicitudes',
    message: 'Ha excedido el límite de solicitudes. Intente nuevamente más tarde.',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  }
  
  if (retryAfter) {
    response.message += ` Intente nuevamente en ${retryAfter} segundos.`
  }
  
  return response
}

/**
 * Maneja errores de base de datos de forma segura
 */
export function handleDatabaseError(
  error: unknown,
  operation: string
): SecureErrorResponse {
  console.error(`Error de base de datos en ${operation}:`, error)
  
  // En producción, no exponer detalles de la base de datos
  if (process.env.NODE_ENV === 'production') {
    return {
      error: 'Error de base de datos',
      message: 'Error procesando solicitud. Intente nuevamente.',
      code: 'DATABASE_ERROR',
      timestamp: new Date().toISOString()
    }
  }
  
  // En desarrollo, mostrar más detalles
  return {
    error: 'Error de base de datos',
    message: error instanceof Error ? error.message : 'Error desconocido de base de datos',
    code: 'DATABASE_ERROR',
    timestamp: new Date().toISOString()
  }
}

/**
 * Maneja errores de archivos de forma segura
 */
export function handleFileError(
  error: unknown,
  operation: string
): SecureErrorResponse {
  console.error(`Error de archivo en ${operation}:`, error)
  
  return {
    error: 'Error procesando archivo',
    message: 'Error generando archivo. Intente nuevamente.',
    code: 'FILE_ERROR',
    timestamp: new Date().toISOString()
  }
}

/**
 * Valida si un error es seguro para exponer al cliente
 */
export function isSafeError(error: unknown): boolean {
  if (error instanceof Error) {
    const safeMessages = [
      'validation',
      'not found',
      'unauthorized',
      'forbidden',
      'bad request'
    ]
    
    return safeMessages.some(safe => 
      error.message.toLowerCase().includes(safe)
    )
  }
  
  return false
}

/**
 * Wrapper para manejo seguro de errores en handlers de API
 */
export function withSecureErrorHandling<T extends any[]>(
  handler: (..._args: T) => Promise<any>
) {
   
  return async (..._args: T) => {
    try {
      return await handler(..._args)
    } catch (error) {
      // Si es un error seguro, re-lanzarlo
      if (isSafeError(error)) {
        throw error
      }
      
      // Si no es seguro, crear un error genérico
      throw new Error('Error interno del servidor')
    }
  }
}

/**
 * Log de errores de seguridad para auditoría
 */
export function logSecurityError(
  error: unknown,
  context: ErrorContext,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  const logEntry = {
    type: 'SECURITY_ERROR',
    severity,
    error: error instanceof Error ? error.message : 'Error desconocido',
    context,
    timestamp: new Date().toISOString(),
    userAgent: context.metadata?.userAgent,
    ip: context.metadata?.ip
  }
  
  console.error('SECURITY ERROR:', logEntry)
  
  // Aquí podrías enviar a un servicio de logging externo
  // como Sentry, DataDog, etc.
}
