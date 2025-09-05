/**
 * Middleware de validación de entrada para endpoints de exportación
 * Centraliza la validación y sanitización de datos de entrada
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { validateDateRange } from './validation'
import { sanitizeQueryParam, sanitizeUUID } from './sanitization'

export interface ExportRequest {
  format: 'csv' | 'excel' | 'pdf'
  dateFilter: {
    startDate: string
    endDate: string
  }
  employee_id?: string
}

export interface ValidationResult {
  valid: boolean
  data?: ExportRequest
  error?: string
  sanitized?: any
}

/**
 * Valida una solicitud de exportación completa
 */
export function validateExportRequest(req: NextApiRequest): ValidationResult {
  try {
    const { format, dateFilter, employee_id } = req.body
    
    // Validar método HTTP
    if (req.method !== 'POST') {
      return { 
        valid: false, 
        error: 'Método no permitido. Use POST' 
      }
    }
    
    // Validar formato
    if (!format || !['csv', 'excel', 'pdf'].includes(format)) {
      return { 
        valid: false, 
        error: 'Formato inválido. Use csv, excel o pdf' 
      }
    }
    
    // Validar estructura de dateFilter
    if (!dateFilter || typeof dateFilter !== 'object') {
      return { 
        valid: false, 
        error: 'dateFilter es requerido y debe ser un objeto' 
      }
    }
    
    if (!dateFilter.startDate || !dateFilter.endDate) {
      return { 
        valid: false, 
        error: 'startDate y endDate son requeridos en dateFilter' 
      }
    }
    
    // Validar fechas
    const dateValidation = validateDateRange(dateFilter.startDate, dateFilter.endDate)
    if (!dateValidation.valid) {
      return { 
        valid: false, 
        error: dateValidation.error 
      }
    }
    
    // Validar employee_id si se proporciona
    let sanitizedEmployeeId: string | undefined
    if (employee_id) {
      const uuidValidation = sanitizeUUID(employee_id)
      if (!uuidValidation.valid) {
        return { 
          valid: false, 
          error: `employee_id inválido: ${uuidValidation.error}` 
        }
      }
      sanitizedEmployeeId = uuidValidation.sanitized
    }
    
    // Sanitizar fechas
    const sanitizedStartDate = sanitizeQueryParam(dateFilter.startDate)
    const sanitizedEndDate = sanitizeQueryParam(dateFilter.endDate)
    
    return {
      valid: true,
      data: {
        format: format as 'csv' | 'excel' | 'pdf',
        dateFilter: {
          startDate: sanitizedStartDate,
          endDate: sanitizedEndDate
        },
        employee_id: sanitizedEmployeeId
      },
      sanitized: {
        originalStartDate: dateFilter.startDate,
        originalEndDate: dateFilter.endDate,
        originalEmployeeId: employee_id
      }
    }
    
  } catch (error) {
    return {
      valid: false,
      error: 'Error de validación: ' + (error instanceof Error ? error.message : 'Error desconocido')
    }
  }
}

/**
 * Valida parámetros de consulta para endpoints GET
 */
export function validateQueryParams(req: NextApiRequest, allowedParams: string[]): ValidationResult {
  try {
    const query = req.query
    const sanitized: any = {}
    
    for (const param of allowedParams) {
      if (query[param]) {
        sanitized[param] = sanitizeQueryParam(query[param] as string)
      }
    }
    
    return {
      valid: true,
      sanitized
    }
    
  } catch (error) {
    return {
      valid: false,
      error: 'Error validando parámetros de consulta: ' + (error instanceof Error ? error.message : 'Error desconocido')
    }
  }
}

/**
 * Middleware wrapper para validación automática
 */
export function withValidation<T = any>(
  validator: (req: NextApiRequest) => ValidationResult,
  handler: (req: NextApiRequest, res: NextApiResponse, validatedData: T) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const validation = validator(req)
      
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          message: validation.error
        })
      }
      
      await handler(req, res, validation.data as T)
      
    } catch (error) {
      console.error('Error en middleware de validación:', error)
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: 'Error procesando solicitud'
      })
    }
  }
}

/**
 * Valida headers de autorización
 */
export function validateAuthHeaders(req: NextApiRequest): { valid: boolean; error?: string } {
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return { 
      valid: false, 
      error: 'Header de autorización requerido' 
    }
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return { 
      valid: false, 
      error: 'Formato de autorización inválido. Use Bearer token' 
    }
  }
  
  const token = authHeader.substring(7)
  if (!token || token.length < 10) {
    return { 
      valid: false, 
      error: 'Token de autorización inválido' 
    }
  }
  
  return { valid: true }
}

/**
 * Valida Content-Type para requests POST
 */
export function validateContentType(req: NextApiRequest): { valid: boolean; error?: string } {
  if (req.method === 'POST') {
    const contentType = req.headers['content-type']
    
    if (!contentType || !contentType.includes('application/json')) {
      return { 
        valid: false, 
        error: 'Content-Type debe ser application/json' 
      }
    }
  }
  
  return { valid: true }
}

/**
 * Valida límites de tamaño de request
 */
export function validateRequestSize(req: NextApiRequest): { valid: boolean; error?: string } {
  const contentLength = parseInt(req.headers['content-length'] || '0')
  const maxSize = 1024 * 1024 // 1MB
  
  if (contentLength > maxSize) {
    return { 
      valid: false, 
      error: `Request demasiado grande. Máximo ${maxSize} bytes` 
    }
  }
  
  return { valid: true }
}
