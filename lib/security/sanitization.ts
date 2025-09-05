/**
 * Utilidades de sanitización para prevenir ataques de path traversal
 * y otros vectores de ataque a través de nombres de archivo
 */

export const MAX_FILENAME_LENGTH = 100
export const DANGEROUS_PATTERNS = [
  /\.\./,           // Path traversal
  /[<>:"|?*]/,      // Caracteres no permitidos en Windows
  /^\./,            // Archivos ocultos
  /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Nombres reservados de Windows
  /^\.$/,           // Directorio actual
  /^\.\.$/,         // Directorio padre
  /[\x00-\x1f]/,    // Caracteres de control
  /[^\x20-\x7E]/    // Caracteres no ASCII imprimibles
]

/**
 * Sanitiza un nombre de archivo eliminando caracteres peligrosos
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file'
  }
  
  let sanitized = filename.trim()
  
  // Eliminar patrones peligrosos
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '_')
  }
  
  // Reemplazar espacios múltiples con un solo guión bajo
  sanitized = sanitized.replace(/\s+/g, '_')
  
  // Reemplazar caracteres especiales restantes con guión bajo
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  // Eliminar guiones bajos múltiples consecutivos
  sanitized = sanitized.replace(/_+/g, '_')
  
  // Eliminar guiones bajos al inicio y final
  sanitized = sanitized.replace(/^_+|_+$/g, '')
  
  // Si queda vacío, usar nombre por defecto
  if (!sanitized) {
    sanitized = 'file'
  }
  
  // Limitar longitud
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    sanitized = sanitized.substring(0, MAX_FILENAME_LENGTH)
  }
  
  return sanitized
}

/**
 * Genera un nombre de archivo seguro para exportaciones
 */
export function generateSafeFilename(
  prefix: string, 
  startDate: string, 
  endDate: string, 
  extension: string
): string {
  const sanitizedPrefix = sanitizeFilename(prefix)
  const sanitizedStartDate = sanitizeFilename(startDate)
  const sanitizedEndDate = sanitizeFilename(endDate)
  const sanitizedExtension = sanitizeFilename(extension)
  
  // Validar extensión
  if (!sanitizedExtension || !['csv', 'xlsx', 'pdf'].includes(sanitizedExtension)) {
    throw new Error('Extensión de archivo no permitida')
  }
  
  const filename = `${sanitizedPrefix}_${sanitizedStartDate}_${sanitizedEndDate}.${sanitizedExtension}`
  
  // Verificar longitud final
  if (filename.length > MAX_FILENAME_LENGTH) {
    const truncatedPrefix = sanitizedPrefix.substring(0, 
      MAX_FILENAME_LENGTH - sanitizedStartDate.length - sanitizedEndDate.length - sanitizedExtension.length - 3
    )
    return `${truncatedPrefix}_${sanitizedStartDate}_${sanitizedEndDate}.${sanitizedExtension}`
  }
  
  return filename
}

/**
 * Valida que un nombre de archivo sea seguro
 */
export function validateFilename(filename: string): { valid: boolean; error?: string } {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'Nombre de archivo requerido' }
  }
  
  if (filename.length > MAX_FILENAME_LENGTH) {
    return { valid: false, error: `Nombre de archivo excede ${MAX_FILENAME_LENGTH} caracteres` }
  }
  
  // Verificar patrones peligrosos
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(filename)) {
      return { valid: false, error: 'Nombre de archivo contiene caracteres no permitidos' }
    }
  }
  
  return { valid: true }
}

/**
 * Sanitiza parámetros de consulta para prevenir inyección
 */
export function sanitizeQueryParam(param: any): string {
  if (typeof param !== 'string') {
    return ''
  }
  
  // Eliminar caracteres de control y espacios
  return param
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Caracteres de control
    .replace(/\s+/g, ' ')                  // Normalizar espacios
    .trim()
    .substring(0, 1000)                    // Limitar longitud
}

/**
 * Sanitiza texto para uso en logs (previene log injection)
 */
export function sanitizeForLogging(text: any): string {
  if (typeof text !== 'string') {
    return String(text)
  }
  
  return text
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Eliminar caracteres de control
    .replace(/\n|\r/g, ' ')                // Reemplazar saltos de línea
    .substring(0, 500)                     // Limitar longitud
}

/**
 * Valida y sanitiza un ID de UUID
 */
export function sanitizeUUID(uuid: string): { valid: boolean; sanitized?: string; error?: string } {
  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, error: 'UUID requerido' }
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const sanitized = uuid.trim().toLowerCase()
  
  if (!uuidRegex.test(sanitized)) {
    return { valid: false, error: 'Formato de UUID inválido' }
  }
  
  return { valid: true, sanitized }
}
