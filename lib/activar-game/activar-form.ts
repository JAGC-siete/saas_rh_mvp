import { TRIAL_CONFIG } from '../config/trial'
import type { CountryCode } from '../country/supported'
import { currencyForCountryCode, isCountryCode } from '../country/supported'
import { normalizeSoftPhone } from '../privacy'

export interface ActivarFormData {
  empleados: number
  empresa: string
  nombre: string
  whatsappCountryCallingCode: string
  whatsappNumber: string
  contactoEmail: string
  departamentos: number
  aceptaTrial: boolean
  countryCode: CountryCode
}

export interface ActivarValidationErrors {
  contactoEmail?: string
  empresa?: string
  departamentos?: string
  contactoWhatsApp?: string
  empleados?: string
  countryCode?: string
  submit?: string
}

export function computeActivarErrors(fd: ActivarFormData): ActivarValidationErrors {
  const e: ActivarValidationErrors = {}

  const vEmail = fd.contactoEmail.trim()
  if (!vEmail) {
    e.contactoEmail = 'Necesitamos tu email para enviarte la llave de acceso.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vEmail)) {
    e.contactoEmail = 'El formato del email no es válido. Ejemplo: nombre@empresa.com'
  }

  const vEmpresa = fd.empresa.trim()
  if (!vEmpresa) {
    e.empresa = 'Ingresa el nombre de tu empresa o negocio.'
  } else if (vEmpresa.length < 2) {
    e.empresa = 'El nombre debe tener al menos 2 caracteres.'
  } else if (vEmpresa.length > 100) {
    e.empresa = 'El nombre no puede tener más de 100 caracteres.'
  }

  if (fd.departamentos < 1) {
    e.departamentos = 'Debe haber al menos 1 departamento.'
  } else if (fd.departamentos > TRIAL_CONFIG.MAX_DEPARTMENTS) {
    e.departamentos = `El máximo es ${TRIAL_CONFIG.MAX_DEPARTMENTS} departamentos.`
  }

  if (fd.empleados < TRIAL_CONFIG.MIN_EMPLOYEES) {
    e.empleados = `Mínimo ${TRIAL_CONFIG.MIN_EMPLOYEES} empleado de prueba.`
  } else if (fd.empleados > TRIAL_CONFIG.MAX_EMPLOYEES) {
    e.empleados = `Máximo ${TRIAL_CONFIG.MAX_EMPLOYEES} empleados de prueba.`
  }

  if (!isCountryCode(fd.countryCode)) {
    e.countryCode = 'Seleccioná el país donde opera tu negocio.'
  }

  const waCombined = `${fd.whatsappCountryCallingCode || ''} ${fd.whatsappNumber || ''}`.trim()
  const waNormalized = normalizeSoftPhone(waCombined)
  if (waCombined && !waNormalized) {
    e.contactoWhatsApp = 'Número de WhatsApp inválido.'
  }

  return e
}

export function activarStep1Errors(fd: ActivarFormData): ActivarValidationErrors {
  const e: ActivarValidationErrors = {}
  if (!isCountryCode(fd.countryCode)) e.countryCode = 'Seleccioná tu país.'
  if (fd.empleados < TRIAL_CONFIG.MIN_EMPLOYEES || fd.empleados > TRIAL_CONFIG.MAX_EMPLOYEES) {
    e.empleados = 'Ajustá el número de empleados de prueba.'
  }
  return e
}

export function activarStep2Errors(fd: ActivarFormData): ActivarValidationErrors {
  const e: ActivarValidationErrors = {}

  const vEmail = fd.contactoEmail.trim()
  if (!vEmail) {
    e.contactoEmail = 'Necesitamos tu email para enviarte la llave de acceso.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vEmail)) {
    e.contactoEmail = 'El formato del email no es válido. Ejemplo: nombre@empresa.com'
  }

  const vEmpresa = fd.empresa.trim()
  if (!vEmpresa) {
    e.empresa = 'Ingresa el nombre de tu empresa o negocio.'
  } else if (vEmpresa.length < 2) {
    e.empresa = 'El nombre debe tener al menos 2 caracteres.'
  } else if (vEmpresa.length > 100) {
    e.empresa = 'El nombre no puede tener más de 100 caracteres.'
  }

  return e
}

export const COUNTRY_LABEL: Record<CountryCode, string> = {
  HND: 'Honduras',
  SLV: 'El Salvador',
  GTM: 'Guatemala',
}

/** Mismos tramos que /ventas si public-config no responde. */
export const ACTIVAR_FALLBACK_EMPLOYEE_RANGES: { min_employees: number; max_employees: number }[] = [
  { min_employees: 2, max_employees: 10 },
  { min_employees: 11, max_employees: 100 },
  { min_employees: 101, max_employees: 300 },
  { min_employees: 301, max_employees: 500 },
]

/** Departamentos de la empresa de prueba (round-robin al sembrar fichas). */
export const ACTIVAR_DEMO_DEPARTMENTS = [
  'Administración',
  'Compras',
  'Operaciones',
  'Bodega',
  'Recursos Humanos',
  'Finanzas',
  'Logística',
] as const

export function activarRangeMidpoint(min: number, max: number): number {
  const a = Number(min)
  const b = Number(max)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return TRIAL_CONFIG.MIN_EMPLOYEES
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  const mid = Math.round((lo + hi) / 2)
  return Math.min(Math.max(mid, TRIAL_CONFIG.MIN_EMPLOYEES), TRIAL_CONFIG.MAX_EMPLOYEES)
}

/** Salario mensual de ficha demo en la moneda del país (no reutilizar escala HNL en SLV/GTM). */
export function activarDemoBaseSalary(country: CountryCode, index: number): number {
  const step = index % 5
  if (country === 'SLV') return 420 + step * 35
  if (country === 'GTM') return 4200 + step * 350
  return 8000 + step * 500
}

export function trialPayrollConfigInsert(companyId: string, country: CountryCode) {
  const currency = currencyForCountryCode(country)
  return {
    company_id: companyId,
    is_active: true,
    calculation_type: 'standard',
    calculation_mode: 'daily' as const,
    payment_frequency: 'quincenal' as const,
    quincena_config: {
      first_start: 1,
      first_end: 15,
      second_start: 16,
      second_end: 30,
    },
    metadata: {
      country_code: country,
      currency,
      payment_frequency: 'biweekly',
      legal_deductions: { ihss: true, rap: country !== 'GTM', isr: true, infop: false },
    },
  }
}

export function clampActivarEmployeeRanges(
  ranges: { min_employees: number; max_employees: number }[]
): { min_employees: number; max_employees: number }[] {
  return ranges.filter(
    (r) =>
      Number.isFinite(r.min_employees) &&
      Number.isFinite(r.max_employees) &&
      r.min_employees >= TRIAL_CONFIG.MIN_EMPLOYEES &&
      r.min_employees <= TRIAL_CONFIG.MAX_EMPLOYEES &&
      r.max_employees >= r.min_employees
  )
}

export function defaultCallingCodeForPayrollCountry(cc: CountryCode): string {
  if (cc === 'SLV') return '+503'
  if (cc === 'GTM') return '+502'
  return '+504'
}
