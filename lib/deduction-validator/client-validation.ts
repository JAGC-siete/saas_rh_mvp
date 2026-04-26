/**
 * Validación del lado del cliente para la calculadora de deducciones
 * Reutiliza la lógica de validación del servidor pero adaptada para el cliente
 */

export interface ValidationError {
  field: string
  message: string
}

/**
 * Valida salario en el cliente
 */
export function validateSalaryClient(value: string): ValidationError | null {
  if (!value || value.trim() === '') {
    return {
      field: 'salary',
      message: 'El salario es requerido'
    }
  }

  const cleaned = value.replace(/[^\d.]/g, '')
  const numValue = parseFloat(cleaned)

  if (isNaN(numValue)) {
    return {
      field: 'salary',
      message: 'El salario debe ser un número válido'
    }
  }

  if (numValue <= 0) {
    return {
      field: 'salary',
      message: 'El salario debe ser mayor que cero'
    }
  }

  if (numValue > 500000) {
    return {
      field: 'salary',
      message: 'El salario no puede exceder L. 500,000'
    }
  }

  return null
}

/**
 * Valida modalidad de pago en el cliente
 */
export function validatePaymentModalityClient(value: string): ValidationError | null {
  if (!value) {
    return {
      field: 'paymentModality',
      message: 'La modalidad de pago es requerida'
    }
  }

  const normalized = value.toLowerCase().trim()
  if (normalized !== 'quincenal' && normalized !== 'mensual' && normalized !== 'semanal') {
    return {
      field: 'paymentModality',
      message: 'La modalidad de pago debe ser "quincenal", "mensual" o "semanal"'
    }
  }

  return null
}

/**
 * Valida año en el cliente
 */
export function validateYearClient(value: number, currentYear: number): ValidationError | null {
  if (isNaN(value) || !isFinite(value)) {
    return {
      field: 'year',
      message: 'El año debe ser un número válido'
    }
  }

  const minYear = 2020
  const maxYear = currentYear + 2

  if (value < minYear || value > maxYear) {
    return {
      field: 'year',
      message: `El año debe estar entre ${minYear} y ${maxYear}`
    }
  }

  return null
}

/**
 * Valida email en el cliente (opcional)
 */
export function validateEmailClient(value: string | undefined | null): ValidationError | null {
  if (!value) {
    // Email es opcional
    return null
  }

  const trimmed = value.trim().toLowerCase()
  const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

  if (!emailRegex.test(trimmed)) {
    return {
      field: 'email',
      message: 'El email proporcionado no es válido'
    }
  }

  if (trimmed.length > 254) {
    return {
      field: 'email',
      message: 'El email es demasiado largo'
    }
  }

  return null
}

/**
 * Valida todos los inputs del formulario en el cliente
 */
export function validateFormInputs(inputs: {
  salary: string
  paymentModality: string
  year?: number
  email?: string
}): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const currentYear = new Date().getFullYear()

  // Validar salario
  const salaryError = validateSalaryClient(inputs.salary)
  if (salaryError) errors.push(salaryError)

  // Validar modalidad de pago
  const modalityError = validatePaymentModalityClient(inputs.paymentModality)
  if (modalityError) errors.push(modalityError)

  // Validar año si se proporciona
  if (inputs.year !== undefined) {
    const yearError = validateYearClient(inputs.year, currentYear)
    if (yearError) errors.push(yearError)
  }

  // Validar email si se proporciona
  if (inputs.email !== undefined) {
    const emailError = validateEmailClient(inputs.email)
    if (emailError) errors.push(emailError)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Genera lista de años disponibles dinámicamente
 */
export function getAvailableYears(currentYear?: number): number[] {
  const year = currentYear || new Date().getFullYear()
  const minYear = 2020
  const maxYear = year + 2 // Permitir hasta 2 años en el futuro
  const years: number[] = []

  for (let y = minYear; y <= maxYear; y++) {
    years.push(y)
  }

  return years.reverse() // Más reciente primero
}

