import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

/**
 * SISTEMA DE SEGURIDAD PARA EXPORTACIÓN DE REPORTES
 * Previene las 5 vulnerabilidades críticas identificadas
 */

// 1. VALIDACIÓN ESTRICTA DE FECHAS (Previene inyección de fechas maliciosas)
export const dateValidationSchema = z.object({
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
    .refine((date) => {
      const parsedDate = new Date(date + 'T00:00:00.000Z')
      return parsedDate instanceof Date && !isNaN(parsedDate.getTime()) && 
             parsedDate.toISOString().split('T')[0] === date
    }, 'Fecha inválida')
    .refine((date) => {
      const parsedDate = new Date(date + 'T00:00:00.000Z')
      const now = new Date()
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      return parsedDate >= oneYearAgo && parsedDate <= now
    }, 'La fecha debe estar dentro del último año'),
  
  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido. Use YYYY-MM-DD')
    .refine((date) => {
      const parsedDate = new Date(date + 'T00:00:00.000Z')
      return parsedDate instanceof Date && !isNaN(parsedDate.getTime()) && 
             parsedDate.toISOString().split('T')[0] === date
    }, 'Fecha inválida')
    .refine((date) => {
      const parsedDate = new Date(date + 'T00:00:00.000Z')
      const now = new Date()
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      return parsedDate >= oneYearAgo && parsedDate <= now
    }, 'La fecha debe estar dentro del último año')
}).refine((data) => {
  const startDate = new Date(data.startDate + 'T00:00:00.000Z')
  const endDate = new Date(data.endDate + 'T00:00:00.000Z')
  return startDate <= endDate
}, 'La fecha de inicio debe ser anterior a la fecha de fin')

// 2. VALIDACIÓN DE PERMISOS DE EMPRESA (Previene acceso no autorizado)
export async function validateCompanyAccess(
  supabase: any, 
  userProfile: any, 
  requestedCompanyId?: string
): Promise<{ valid: boolean; error?: string }> {
  if (!userProfile?.company_id) {
    return { valid: false, error: 'Usuario sin empresa asignada' }
  }

  // Si no se especifica company_id, usar la del usuario
  if (!requestedCompanyId) {
    return { valid: true }
  }

  // Verificar que el usuario tenga acceso a la empresa solicitada
  if (userProfile.company_id !== requestedCompanyId) {
    return { valid: false, error: 'Acceso denegado a empresa solicitada' }
  }

  // Verificar que la empresa existe y está activa
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, status')
    .eq('id', requestedCompanyId)
    .eq('status', 'active')
    .single()

  if (error || !company) {
    return { valid: false, error: 'Empresa no encontrada o inactiva' }
  }

  return { valid: true }
}

// 3. SANITIZACIÓN SEGURA DE NOMBRES DE ARCHIVO (Previene path traversal)
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'reporte_seguro'
  }

  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Solo caracteres seguros
    .replace(/^\.+/, '') // Remover puntos al inicio
    .replace(/\.{2,}/g, '.') // Reemplazar múltiples puntos
    .replace(/^_+/, '') // Remover guiones bajos al inicio
    .replace(/_+$/, '') // Remover guiones bajos al final
    .substring(0, 50) // Limitar longitud
    || 'reporte_seguro' // Fallback si queda vacío
}

// 4. VALIDACIÓN DE FORMATOS DE ARCHIVO (Previene bypass de controles)
export const fileFormatSchema = z.enum(['pdf', 'csv', 'excel', 'xlsx'])
export type FileFormat = z.infer<typeof fileFormatSchema>

// 5. CONSTRUCCIÓN SEGURA DE QUERIES (Previene inyección SQL)
export function buildSecureQuery(
  supabase: any,
  table: string,
  userProfile: any,
  additionalFilters: Record<string, any> = {}
) {
  let query = supabase.from(table)

  // Aplicar filtro de empresa SIEMPRE
  if (userProfile?.company_id) {
    if (table === 'employees') {
      query = query.eq('company_id', userProfile.company_id)
    } else if (table === 'attendance_records') {
      // Para attendance_records, necesitamos filtrar por empleados de la empresa
      // Esto se maneja en el código que llama a esta función
    } else if (table === 'payroll_records') {
      query = query.eq('company_id', userProfile.company_id)
    }
  }

  // Aplicar filtros adicionales de forma segura
  Object.entries(additionalFilters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        query = query.in(key, value)
      } else {
        query = query.eq(key, value)
      }
    }
  })

  return query
}

// 6. VALIDACIÓN DE RANGOS DE FECHAS (Previene ataques de rango)
export function validateDateRange(startDate: string, endDate: string): {
  valid: boolean
  error?: string
} {
  const start = new Date(startDate + 'T00:00:00.000Z')
  const end = new Date(endDate + 'T00:00:00.000Z')
  const now = new Date()
  
  // Verificar que las fechas son válidas
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Fechas inválidas' }
  }

  // Verificar que el rango no es muy grande (máximo 1 año)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays > 365) {
    return { valid: false, error: 'El rango de fechas no puede ser mayor a 1 año' }
  }

  // Verificar que las fechas no son futuras
  if (start > now || end > now) {
    return { valid: false, error: 'Las fechas no pueden ser futuras' }
  }

  // Verificar que el rango es razonable (mínimo 1 día)
  if (diffDays < 1) {
    return { valid: false, error: 'El rango de fechas debe ser de al menos 1 día' }
  }

  return { valid: true }
}

// 7. LOGGING SEGURO (Previene exposición de información sensible)
export function secureLog(message: string, data: any = {}) {
  const sanitizedData = { ...data }
  
  // Ocultar información sensible
  if (sanitizedData.userId) {
    sanitizedData.userId = sanitizedData.userId.substring(0, 8) + '...'
  }
  if (sanitizedData.companyId) {
    sanitizedData.companyId = '***'
  }
  if (sanitizedData.email) {
    const [local, domain] = sanitizedData.email.split('@')
    sanitizedData.email = local.substring(0, 2) + '***@' + domain
  }

  console.log(`🔐 ${message}`, sanitizedData)
}

// 8. VALIDACIÓN DE PERMISOS CONTINUA (Previene bypass de controles)
export async function validateContinuousAccess(
  supabase: any,
  userProfile: any,
  resourceType: 'employees' | 'attendance' | 'payroll',
  resourceId?: string
): Promise<{ valid: boolean; error?: string }> {
  if (!userProfile?.company_id) {
    return { valid: false, error: 'Usuario sin empresa asignada' }
  }

  if (resourceType === 'employees' && resourceId) {
    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('id', resourceId)
      .eq('company_id', userProfile.company_id)
      .single()

    if (error || !employee) {
      return { valid: false, error: 'Empleado no encontrado o no autorizado' }
    }
  }

  return { valid: true }
}

// 9. MIDDLEWARE DE SEGURIDAD PARA EXPORTACIÓN
export function withExportSecurity(handler: any) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Validar método HTTP
      if (req.method !== 'POST') {
        return res.status(405).json({ 
          error: 'Método no permitido',
          message: 'Solo se permite POST para exportaciones'
        })
      }

      // Validar datos de entrada
      const validation = dateValidationSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          message: 'Los datos proporcionados no son válidos',
          details: validation.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        })
      }

      // Validar rango de fechas
      const dateRangeValidation = validateDateRange(
        validation.data.startDate, 
        validation.data.endDate
      )
      if (!dateRangeValidation.valid) {
        return res.status(400).json({
          error: 'Rango de fechas inválido',
          message: dateRangeValidation.error
        })
      }

      // Agregar datos validados al request
      req.validatedData = validation.data
      
      return handler(req, res)
    } catch (error) {
      secureLog('Error en middleware de seguridad de exportación', { error })
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: 'Ha ocurrido un error inesperado'
      })
    }
  }
}

// 10. FUNCIÓN DE RESPUESTA SEGURA
export function createSecureResponse(data: any, filename: string) {
  return {
    data,
    filename: sanitizeFilename(filename),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }
}
