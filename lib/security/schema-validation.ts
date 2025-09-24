import { z } from 'zod'

/**
 * SCHEMA VALIDATION REAL CONTRA SQLi
 * Usa Zod para validación estricta por esquemas (allowlist approach)
 */

// Schema para fechas (formato estricto YYYY-MM-DD)
export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
  .refine((date) => {
    const parsedDate = new Date(date + 'T00:00:00.000Z')
    return parsedDate instanceof Date && !isNaN(parsedDate.getTime()) && 
           parsedDate.toISOString().split('T')[0] === date
  }, 'Fecha inválida')

// Schema para UUIDs
export const uuidSchema = z.string()
  .uuid('Formato UUID inválido')

// Schema para formatos de archivo (allowlist)
export const fileFormatSchema = z.enum(['excel', 'pdf', 'csv', 'xlsx'])

// Schema para strings seguros (solo caracteres permitidos)
export const safeStringSchema = z.string()
  .min(1, 'Campo requerido')
  .max(255, 'Máximo 255 caracteres')
  .regex(/^[\p{L}\p{N} .,'-]+$/u, 'Solo se permiten letras, números, espacios, puntos, comas, guiones y apostrofes')

// Schema para nombres de archivo seguros
export const safeFilenameSchema = z.string()
  .min(1, 'Nombre de archivo requerido')
  .max(100, 'Máximo 100 caracteres')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Solo se permiten letras, números, puntos, guiones y guiones bajos')
  .refine((filename) => {
    // No permitir nombres reservados de Windows
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    return !reservedNames.includes(filename.toUpperCase())
  }, 'Nombre de archivo reservado no permitido')

// Schema principal para exportación de asistencia
export const attendanceExportSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  formato: fileFormatSchema,
  employee_id: uuidSchema.optional(),
  company_id: uuidSchema.optional(),
  role: safeStringSchema.optional()
}).refine((data) => {
  // Validar rango de fechas
  const startDate = new Date(data.startDate + 'T00:00:00.000Z')
  const endDate = new Date(data.endDate + 'T00:00:00.000Z')
  
  if (startDate > endDate) {
    return false
  }

  // Validar que no sea un rango muy grande (máximo 1 año)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays <= 365
}, {
  message: 'Rango de fechas inválido: la fecha de inicio debe ser anterior a la fecha de fin y no puede ser mayor a 1 año',
  path: ['startDate', 'endDate']
})

// Schema para reportes de tendencias
export const attendanceTrendsSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  employee_id: uuidSchema.optional()
}).refine((data) => {
  const startDate = new Date(data.startDate + 'T00:00:00.000Z')
  const endDate = new Date(data.endDate + 'T00:00:00.000Z')
  
  if (startDate > endDate) {
    return false
  }

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays <= 365
}, {
  message: 'Rango de fechas inválido',
  path: ['startDate', 'endDate']
})

// Función de validación segura
export function validateAttendanceExport(input: unknown) {
  try {
    const result = attendanceExportSchema.parse(input)
    return { success: true, data: result, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Datos de entrada inválidos',
          details: error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }
      }
    }
    return {
      success: false,
      data: null,
      error: {
        message: 'Error interno de validación',
        details: []
      }
    }
  }
}

// Función de validación para tendencias
export function validateAttendanceTrends(input: unknown) {
  try {
    const result = attendanceTrendsSchema.parse(input)
    return { success: true, data: result, error: null }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        error: {
          message: 'Datos de entrada inválidos',
          details: error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }
      }
    }
    return {
      success: false,
      data: null,
      error: {
        message: 'Error interno de validación',
        details: []
      }
    }
  }
}

// Type exports para TypeScript
export type AttendanceExportInput = z.infer<typeof attendanceExportSchema>
export type AttendanceTrendsInput = z.infer<typeof attendanceTrendsSchema>
