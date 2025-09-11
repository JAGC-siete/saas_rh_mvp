import { NextApiRequest, NextApiResponse } from 'next'

// Extender el tipo NextApiRequest para incluir validatedData
declare module 'next' {
  interface NextApiRequest {
    validatedData?: any
  }
}

/**
 * MIDDLEWARE DE VALIDACIÓN DE ENTRADA SEGURA
 * Usa validación por esquemas + prepared statements (NO regex frágiles)
 */

// Validadores específicos basados en esquemas
export const validators = {
  // Validar formato de fecha YYYY-MM-DD
  date: (date: string): boolean => {
    if (!date || typeof date !== 'string') return false
    
    // Verificar formato básico
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) return false
    
    // Verificar que sea una fecha válida
    const parsedDate = new Date(date + 'T00:00:00.000Z')
    return parsedDate instanceof Date && !isNaN(parsedDate.getTime()) && 
           parsedDate.toISOString().split('T')[0] === date
  },

  // Validar UUID
  uuid: (uuid: string): boolean => {
    if (!uuid || typeof uuid !== 'string') return false
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  },

  // Validar formato de archivo
  fileFormat: (format: string): boolean => {
    if (!format || typeof format !== 'string') return false
    const allowedFormats = ['excel', 'pdf', 'csv', 'xlsx']
    return allowedFormats.includes(format.toLowerCase())
  },

  // Validar string seguro (sin caracteres especiales)
  safeString: (str: string, maxLength: number = 255): boolean => {
    if (!str || typeof str !== 'string') return false
    if (str.length > maxLength) return false
    
    // Solo permitir letras, números, guiones y guiones bajos
    const safeRegex = /^[a-zA-Z0-9_-]+$/
    return safeRegex.test(str)
  },

  // Validar nombre de archivo seguro
  safeFilename: (filename: string): boolean => {
    if (!filename || typeof filename !== 'string') return false
    if (filename.length > 100) return false
    
    // No permitir caracteres especiales peligrosos
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/
    return !dangerousChars.test(filename)
  }
}

// Sanitizar entrada básica (solo para display, NO para SQL)
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/[<>]/g, '') // Remover < >
    .replace(/['"]/g, '') // Remover comillas
    .replace(/[;]/g, '') // Remover punto y coma
    .replace(/[--]/g, '') // Remover comentarios SQL
    .replace(/[\/\*]/g, '') // Remover comentarios SQL
    .replace(/\.\./g, '') // Remover path traversal
    .trim()
}

// Esquema de validación para exportación de asistencia
export const attendanceExportSchema = {
  startDate: {
    required: true,
    validator: validators.date,
    sanitize: true
  },
  endDate: {
    required: true,
    validator: validators.date,
    sanitize: true
  },
  formato: {
    required: true,
    validator: validators.fileFormat,
    sanitize: true
  },
  employee_id: {
    required: false,
    validator: validators.uuid,
    sanitize: true
  },
  company_id: {
    required: false,
    validator: validators.uuid,
    sanitize: true
  }
}

// Validar request de exportación
export const validateAttendanceExportRequest = (req: NextApiRequest): {
  valid: boolean
  data?: any
  errors?: string[]
} => {
  const errors: string[] = []
  const data: any = {}

  // Verificar método HTTP
  if (req.method !== 'POST') {
    errors.push('Método HTTP no permitido. Use POST.')
    return { valid: false, errors }
  }

  // Obtener datos del body
  const body = req.body || {}

  // Validar cada campo según el esquema
  for (const [field, config] of Object.entries(attendanceExportSchema)) {
    const value = body[field]
    const fieldConfig = config as any

    // Verificar si es requerido
    if (fieldConfig.required && (!value || value === '')) {
      errors.push(`Campo requerido: ${field}`)
      continue
    }

    // Si no es requerido y no tiene valor, continuar
    if (!fieldConfig.required && (!value || value === '')) {
      continue
    }

    // Validar formato
    if (fieldConfig.validator && !fieldConfig.validator(value)) {
      errors.push(`Formato inválido en ${field}`)
      continue
    }

    // Sanitizar si es necesario
    if (fieldConfig.sanitize) {
      data[field] = sanitizeInput(value)
    } else {
      data[field] = value
    }
  }

  // Validar rango de fechas
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate + 'T00:00:00.000Z')
    const endDate = new Date(data.endDate + 'T00:00:00.000Z')
    
    if (startDate > endDate) {
      errors.push('La fecha de inicio debe ser anterior a la fecha de fin')
    }

    // Validar que no sea un rango muy grande (máximo 1 año)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays > 365) {
      errors.push('El rango de fechas no puede ser mayor a 1 año')
    }
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors: errors.length > 0 ? errors : undefined
  }
}

// Middleware de validación
export const withInputValidation = (handler: any) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const validation = validateAttendanceExportRequest(req)
    
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        message: 'Los datos proporcionados no son válidos',
        details: validation.errors,
        timestamp: new Date().toISOString()
      })
    }

    // Agregar datos validados al request
    req.validatedData = validation.data
    
    return handler(req, res)
  }
}

// Función para generar respuesta de error segura
export const createSecureErrorResponse = (error: any, context: string) => {
  console.error(`Error en ${context}:`, error)
  
  return {
    error: 'Error interno del servidor',
    message: 'Ha ocurrido un error inesperado',
    timestamp: new Date().toISOString()
  }
}