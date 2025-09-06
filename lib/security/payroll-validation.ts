import { z } from 'zod'

/**
 * VALIDACIÓN SEGURA PARA EXPORTACIÓN DE PAYROLL
 * Previene inyección SQL y acceso no autorizado
 */

// Schema para validar período (formato YYYY-MM)
export const payrollPeriodSchema = z.string()
  .regex(/^\d{4}-\d{2}$/, 'Formato de período inválido. Use YYYY-MM')
  .refine((period) => {
    const [year, month] = period.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return date.getFullYear() === year && date.getMonth() === month - 1
  }, 'Período inválido')

// Schema para formatos de archivo (allowlist)
export const payrollFormatSchema = z.enum(['excel', 'pdf', 'csv'])

// Schema principal para exportación de payroll
export const payrollExportSchema = z.object({
  periodo: payrollPeriodSchema,
  formato: payrollFormatSchema.default('excel'),
  company_id: z.string().uuid().optional()
})

// Función de validación segura
export function validatePayrollExport(input: unknown) {
  try {
    const result = payrollExportSchema.parse(input)
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

// Función para sanitizar nombres de archivo
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '') // Remover puntos al inicio
    .replace(/\.{2,}/g, '.') // Reemplazar múltiples puntos con uno solo
    .substring(0, 100) // Limitar longitud
}

// Función para validar acceso a empresa
export function validateCompanyAccess(userCompanyId: string, requestedCompanyId?: string): boolean {
  // Si no se especifica company_id, usar la del usuario
  if (!requestedCompanyId) {
    return true
  }
  
  // Verificar que el usuario tenga acceso a la empresa solicitada
  return userCompanyId === requestedCompanyId
}

// Type exports para TypeScript
export type PayrollExportInput = z.infer<typeof payrollExportSchema>
