// Validation schemas for API requests
// Note: Install zod with: npm install zod

// Basic validation functions (without zod dependency)
export const ValidationError = class extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validatePeriodo(periodo: string): string {
  if (!periodo || typeof periodo !== 'string') {
    throw new ValidationError('Periodo es requerido')
  }
  
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    throw new ValidationError('Periodo debe tener formato YYYY-MM')
  }
  
  return periodo
}

export function validateQuincena(quincena: number): number {
  if (typeof quincena !== 'number' || ![1, 2].includes(quincena)) {
    throw new ValidationError('Quincena debe ser 1 o 2')
  }
  
  return quincena
}

export function validateLast5(last5: string): string {
  if (!last5 || typeof last5 !== 'string') {
    throw new ValidationError('Last5 es requerido')
  }
  
  if (!/^\d{5}$/.test(last5)) {
    throw new ValidationError('Last5 debe tener exactamente 5 dígitos')
  }
  
  return last5
}

export function validateEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email es requerido')
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError('Email debe tener formato válido')
  }
  
  return email
}

// Payroll validation
export function validatePayrollData(data: any) {
  const validated = {
    periodo: validatePeriodo(data.periodo),
    quincena: validateQuincena(data.quincena),
    incluirDeducciones: Boolean(data.incluirDeducciones)
  }
  
  return validated
}

// Attendance validation
export function validateAttendanceData(data: any) {
  const validated = {
    last5: validateLast5(data.last5),
    justification: data.justification ? String(data.justification) : undefined
  }
  
  return validated
}

// Auth validation
export function validateAuthData(data: any) {
  const validated = {
    email: validateEmail(data.email),
    password: data.password ? String(data.password) : undefined
  }
  
  if (!validated.password || validated.password.length < 6) {
    throw new ValidationError('Contraseña debe tener al menos 6 caracteres')
  }
  
  return validated
}