/**
 * Validación robusta de inputs para la calculadora de deducciones
 */

export interface ValidationResult {
  valid: boolean
  error?: string
  sanitized?: number | string
}

/**
 * Valida y sanitiza el salario
 */
export function validateSalary(value: string | number): ValidationResult {
  if (typeof value === 'string') {
    // Remover caracteres no numéricos excepto punto decimal
    const cleaned = value.replace(/[^\d.]/g, '')
    
    if (!cleaned || cleaned.trim() === '') {
      return {
        valid: false,
        error: 'El salario es requerido'
      }
    }

    const numValue = parseFloat(cleaned)
    
    if (isNaN(numValue)) {
      return {
        valid: false,
        error: 'El salario debe ser un número válido'
      }
    }

    if (numValue <= 0) {
      return {
        valid: false,
        error: 'El salario debe ser mayor que cero'
      }
    }

    // Límite máximo razonable: L. 500,000 mensuales
    if (numValue > 500000) {
      return {
        valid: false,
        error: 'El salario no puede exceder L. 500,000'
      }
    }

    // Redondear a 2 decimales
    const sanitized = Math.round(numValue * 100) / 100

    return {
      valid: true,
      sanitized
    }
  }

  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return {
        valid: false,
        error: 'El salario debe ser un número válido'
      }
    }

    if (value <= 0) {
      return {
        valid: false,
        error: 'El salario debe ser mayor que cero'
      }
    }

    if (value > 500000) {
      return {
        valid: false,
        error: 'El salario no puede exceder L. 500,000'
      }
    }

    return {
      valid: true,
      sanitized: Math.round(value * 100) / 100
    }
  }

  return {
    valid: false,
    error: 'El salario debe ser un número'
  }
}

/**
 * Valida la modalidad de pago
 */
export function validatePaymentModality(value: string): ValidationResult {
  if (!value || typeof value !== 'string') {
    return {
      valid: false,
      error: 'La modalidad de pago es requerida'
    }
  }

  const normalized = value.toLowerCase().trim()

  if (normalized !== 'quincenal' && normalized !== 'mensual') {
    return {
      valid: false,
      error: 'La modalidad de pago debe ser "quincenal" o "mensual"'
    }
  }

  return {
    valid: true,
    sanitized: normalized as 'quincenal' | 'mensual'
  }
}

/**
 * Valida el año fiscal
 */
export function validateYear(value: number | string, currentYear?: number): ValidationResult {
  const year = typeof value === 'string' ? parseInt(value, 10) : value
  const now = currentYear || new Date().getFullYear()

  if (isNaN(year) || !isFinite(year)) {
    return {
      valid: false,
      error: 'El año debe ser un número válido'
    }
  }

  // Permitir años entre 2020 y el año actual + 2 (para futuras tablas)
  const minYear = 2020
  const maxYear = now + 2

  if (year < minYear || year > maxYear) {
    return {
      valid: false,
      error: `El año debe estar entre ${minYear} y ${maxYear}`
    }
  }

  return {
    valid: true,
    sanitized: year
  }
}

/**
 * Valida el email (opcional)
 */
export function validateEmail(value: string | undefined | null): ValidationResult {
  if (!value) {
    // Email es opcional, así que vacío es válido
    return {
      valid: true,
      sanitized: ''
    }
  }

  if (typeof value !== 'string') {
    return {
      valid: false,
      error: 'El email debe ser una cadena de texto'
    }
  }

  const trimmed = value.trim().toLowerCase()

  // Email regex más estricto
  const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

  if (!emailRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'El email proporcionado no es válido'
    }
  }

  // Longitud máxima de email según RFC 5321
  if (trimmed.length > 254) {
    return {
      valid: false,
      error: 'El email es demasiado largo'
    }
  }

  return {
    valid: true,
    sanitized: trimmed
  }
}

/**
 * Valida todos los inputs de la calculadora
 */
export function validateCalculatorInputs(inputs: {
  salary: string | number
  paymentModality: string
  year?: number | string
  email?: string
}) {
  const errors: string[] = []
  const sanitized: any = {}

  // Validar salario
  const salaryValidation = validateSalary(inputs.salary)
  if (!salaryValidation.valid) {
    errors.push(salaryValidation.error!)
  } else {
    sanitized.salary = salaryValidation.sanitized
  }

  // Validar modalidad de pago
  const modalityValidation = validatePaymentModality(inputs.paymentModality)
  if (!modalityValidation.valid) {
    errors.push(modalityValidation.error!)
  } else {
    sanitized.paymentModality = modalityValidation.sanitized
  }

  // Validar año (si se proporciona)
  if (inputs.year !== undefined) {
    const yearValidation = validateYear(inputs.year)
    if (!yearValidation.valid) {
      errors.push(yearValidation.error!)
    } else {
      sanitized.year = yearValidation.sanitized
    }
  }

  // Validar email (si se proporciona)
  if (inputs.email !== undefined) {
    const emailValidation = validateEmail(inputs.email)
    if (!emailValidation.valid) {
      errors.push(emailValidation.error!)
    } else {
      sanitized.email = emailValidation.sanitized
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized
  }
}

