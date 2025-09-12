// Ajv validator para schemas JSON
// Valida request/response contra OpenAPI contract

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { readFileSync } from 'fs'
import { join } from 'path'

// Configurar Ajv con formatos RFC
const ajv = new Ajv({
  allErrors: true,
  strict: true,
  verbose: true,
  discriminator: true,
  allowUnionTypes: true
})

addFormats(ajv, ['date-time', 'uuid', 'uri'])

// Cargar schemas JSON
const schemasDir = join(process.cwd(), 'schemas', 'json')

const loadSchema = (filename: string) => {
  try {
    const schemaPath = join(schemasDir, filename)
    const schemaContent = readFileSync(schemaPath, 'utf-8')
    return JSON.parse(schemaContent)
  } catch (error) {
    console.error(`Error loading schema ${filename}:`, error)
    throw new Error(`Schema ${filename} not found`)
  }
}

// Compilar schemas
const schemas = {
  previewInput: ajv.compile(loadSchema('preview-input.json')),
  previewOutput: ajv.compile(loadSchema('preview-output.json')),
  authorizeInput: ajv.compile(loadSchema('authorize-input.json')),
  authorizeOutput: ajv.compile(loadSchema('authorize-output.json')),
  problemDetails: ajv.compile(loadSchema('problem-details.json'))
}

// Función para validar request
export function validateRequest<T>(data: unknown, schemaName: keyof typeof schemas): T {
  const validator = schemas[schemaName]
  
  if (!validator(data)) {
    const errors = validator.errors?.map(err => ({
      instancePath: err.instancePath,
      schemaPath: err.schemaPath,
      keyword: err.keyword,
      message: err.message,
      data: err.data
    }))
    
    throw new ValidationError(`Validation failed for ${schemaName}`, errors || [])
  }
  
  return data as T
}

// Función para validar response
export function validateResponse<T>(data: unknown, schemaName: keyof typeof schemas): T {
  return validateRequest<T>(data, schemaName)
}

// Error personalizado para validación
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{
      instancePath: string
      schemaPath: string
      keyword: string
      message?: string
      data?: unknown
    }>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
  
  // Convertir a Problem Details (RFC 7807)
  toProblemDetails(instance: string): {
    type: string
    title: string
    status: number
    detail: string
    instance: string
    code: string
    errors: typeof this.errors
  } {
    return {
      type: 'https://docs.humanosisu.net/errors/validation-failed',
      title: 'Validation Failed',
      status: 400,
      detail: this.message,
      instance,
      code: 'VALIDATION_FAILED',
      errors: this.errors
    }
  }
}

// Función helper para crear Problem Details
export function createProblemDetails(
  type: string,
  title: string,
  status: number,
  detail: string,
  instance: string,
  code?: string
) {
  return {
    type,
    title,
    status,
    detail,
    instance,
    ...(code && { code })
  }
}

// Catálogo de errores estándar
export const ERROR_TYPES = {
  VALIDATION_FAILED: 'https://docs.humanosisu.net/errors/validation-failed',
  INVALID_STATE_TRANSITION: 'https://docs.humanosisu.net/errors/invalid-transition',
  UNAUTHORIZED: 'https://docs.humanosisu.net/errors/unauthorized',
  FORBIDDEN: 'https://docs.humanosisu.net/errors/forbidden',
  NOT_FOUND: 'https://docs.humanosisu.net/errors/not-found',
  CONFLICT: 'https://docs.humanosisu.net/errors/conflict',
  PRECONDITION_FAILED: 'https://docs.humanosisu.net/errors/precondition-failed',
  INTERNAL_SERVER_ERROR: 'https://docs.humanosisu.net/errors/internal-server-error'
} as const

const ajvSchemas = schemas
export default ajvSchemas
