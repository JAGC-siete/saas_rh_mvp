/**
 * Utilidades de validación de entrada para seguridad
 * Previene inyección de fechas maliciosas y valida formatos
 */

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
export const MAX_DATE_RANGE_DAYS = 365
export const MAX_YEARS_BACK = 2

/**
 * Valida formato y rango de una fecha individual
 */
export function validateDateInput(dateString: string): { valid: boolean; error?: string } {
  // Validar formato básico
  if (!DATE_REGEX.test(dateString)) {
    return { 
      valid: false, 
      error: 'Formato de fecha inválido. Use YYYY-MM-DD' 
    }
  }
  
  // Validar que sea una fecha válida
  const date = new Date(dateString + 'T00:00:00.000Z')
  if (isNaN(date.getTime())) {
    return { 
      valid: false, 
      error: 'Fecha inválida' 
    }
  }
  
  // Validar que la fecha no sea futura
  const now = new Date()
  if (date > now) {
    return { 
      valid: false, 
      error: 'No se permiten fechas futuras' 
    }
  }
  
  // Validar que no sea muy antigua (máximo 2 años atrás)
  const maxYearsAgo = new Date()
  maxYearsAgo.setFullYear(maxYearsAgo.getFullYear() - MAX_YEARS_BACK)
  
  if (date < maxYearsAgo) {
    return { 
      valid: false, 
      error: `No se permiten fechas anteriores a ${maxYearsAgo.getFullYear()}` 
    }
  }
  
  return { valid: true }
}

/**
 * Valida un rango de fechas completo
 */
export function validateDateRange(startDate: string, endDate: string): { valid: boolean; error?: string } {
  // Validar fecha de inicio
  const startValidation = validateDateInput(startDate)
  if (!startValidation.valid) {
    return { 
      valid: false, 
      error: `Fecha de inicio: ${startValidation.error}` 
    }
  }
  
  // Validar fecha de fin
  const endValidation = validateDateInput(endDate)
  if (!endValidation.valid) {
    return { 
      valid: false, 
      error: `Fecha de fin: ${endValidation.error}` 
    }
  }
  
  // Validar que fecha de inicio sea anterior a fecha de fin
  const start = new Date(startDate + 'T00:00:00.000Z')
  const end = new Date(endDate + 'T00:00:00.000Z')
  
  if (start > end) {
    return { 
      valid: false, 
      error: 'La fecha de inicio debe ser anterior a la fecha de fin' 
    }
  }
  
  // Validar que el rango no exceda el máximo permitido
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays > MAX_DATE_RANGE_DAYS) {
    return { 
      valid: false, 
      error: `El rango de fechas excede ${MAX_DATE_RANGE_DAYS} días (${diffDays} días solicitados)` 
    }
  }
  
  return { valid: true }
}

/**
 * Valida formato de período (YYYY-MM)
 */
export function validatePeriodFormat(period: string): { valid: boolean; error?: string } {
  const periodRegex = /^\d{4}-\d{2}$/
  
  if (!periodRegex.test(period)) {
    return { 
      valid: false, 
      error: 'Formato de período inválido. Use YYYY-MM' 
    }
  }
  
  const [year, month] = period.split('-').map(Number)
  const currentYear = new Date().getFullYear()
  
  if (year < currentYear - MAX_YEARS_BACK || year > currentYear) {
    return { 
      valid: false, 
      error: `Año fuera del rango permitido (${currentYear - MAX_YEARS_BACK} - ${currentYear})` 
    }
  }
  
  if (month < 1 || month > 12) {
    return { 
      valid: false, 
      error: 'Mes inválido (1-12)' 
    }
  }
  
  return { valid: true }
}

/**
 * Sanitiza una fecha para uso seguro en consultas
 */
export function sanitizeDate(dateString: string): string {
  // Validar formato primero
  const validation = validateDateInput(dateString)
  if (!validation.valid) {
    throw new Error(`Fecha inválida: ${validation.error}`)
  }
  
  // Retornar fecha en formato ISO seguro
  return new Date(dateString + 'T00:00:00.000Z').toISOString().split('T')[0]
}

/**
 * Obtiene límites de fecha seguros para consultas
 */
export function getSafeDateLimits(): { minDate: string; maxDate: string } {
  const now = new Date()
  const maxDate = now.toISOString().split('T')[0]
  
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - MAX_YEARS_BACK)
  const minDateStr = minDate.toISOString().split('T')[0]
  
  return { minDate: minDateStr, maxDate }
}
