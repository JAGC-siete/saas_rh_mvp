import type { QuotationRequest } from '../ventas/types'
import {
  isMonthlyModalityAvailable,
  mergeVentasBusinessRules,
  ventasMonthlyUnavailableMessage,
  VENTAS_MAX_AUTO_QUOTE_TERMINALS,
  type VentasAnnualTerminalMode,
  type VentasBusinessRules,
} from '../ventas/business-rules'
import type { CountryCode } from '../country/supported'
import { isCountryCode } from '../country/supported'

export type VentasFormLimits = {
  monthly_min_employees?: number
  max_auto_quote_terminals?: number
  annual_terminals_included_min_employees?: number
  hardware_sale_unit_price?: number
}

/** Rango de precios expuesto al formulario (sincronizado con Superadmin). */
export type VentasPublicTier = {
  min_employees: number
  max_employees: number
  annual_terminal_mode?: VentasAnnualTerminalMode
  included_terminals_max?: number | null
}

export type VentasValidationErrors = {
  contact_email?: string
  company_name?: string
  employees_count?: string
  terminals_count?: string
  country_code?: string
  billing_modality?: string
  submit?: string
}

function limitsToRules(limits?: VentasFormLimits | null): Partial<VentasBusinessRules> {
  return {
    monthly_min_employees: limits?.monthly_min_employees,
    max_auto_quote_terminals: limits?.max_auto_quote_terminals,
    annual_terminals_included_min_employees: limits?.annual_terminals_included_min_employees,
    hardware_sale_unit_price: limits?.hardware_sale_unit_price,
  }
}

function maxTerminals(limits?: VentasFormLimits | null): number {
  return mergeVentasBusinessRules(limitsToRules(limits)).max_auto_quote_terminals
}

export function formatEmployeeRangeLabel(min: number, max: number): string {
  if (min === max) return `${min} empleado${min === 1 ? '' : 's'}`
  return `${min} a ${max} empleados`
}

export function findPublicTierForEmployees(
  employeesCount: number,
  tiers?: VentasPublicTier[] | null
): VentasPublicTier | null {
  const n = Number(employeesCount)
  if (!Number.isFinite(n) || !tiers?.length) return null
  return tiers.find((t) => n >= t.min_employees && n <= t.max_employees) || null
}

export function sortPublicTiers(tiers: VentasPublicTier[]): VentasPublicTier[] {
  return [...tiers].sort((a, b) => a.min_employees - b.min_employees)
}

function employeesCountError(
  emp: number,
  tiers?: VentasPublicTier[] | null
): string | undefined {
  if (!Number.isFinite(emp) || emp < 1) return 'Seleccione un rango de empleados.'
  if (tiers && tiers.length > 0) {
    if (!findPublicTierForEmployees(emp, tiers)) {
      return 'Seleccione un rango de empleados de la lista.'
    }
    return undefined
  }
  if (emp > 10000) return 'Seleccione un rango de empleados válido.'
  return undefined
}

export function computeVentasErrors(
  fd: QuotationRequest,
  limits?: VentasFormLimits | null,
  tiers?: VentasPublicTier[] | null
): VentasValidationErrors {
  const e: VentasValidationErrors = {}
  const email = (fd.contact_email || '').trim()
  if (!email) e.contact_email = 'Indique un correo; ahí le enviamos la propuesta.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.contact_email = 'Correo no válido.'

  const company = (fd.company_name || '').trim()
  if (!company) e.company_name = 'Nombre de empresa obligatorio.'
  else if (company.length < 2) e.company_name = 'Nombre demasiado corto.'
  else if (company.length > 100) e.company_name = 'Máximo 100 caracteres.'

  const emp = Number(fd.employees_count)
  const empErr = employeesCountError(emp, tiers)
  if (empErr) e.employees_count = empErr

  const rules = limitsToRules(limits)
  const modality = fd.billing_modality === 'monthly' ? 'monthly' : 'annual'
  if (modality === 'monthly' && Number.isFinite(emp) && !isMonthlyModalityAvailable(emp, rules)) {
    e.billing_modality = ventasMonthlyUnavailableMessage(rules)
  }

  const cc = fd.country_code
  if (!cc || !isCountryCode(cc)) {
    e.country_code = 'Seleccione el país donde opera la empresa.'
  }

  const t = Number(fd.terminals_count)
  const maxT = maxTerminals(limits)
  if (!Number.isFinite(t) || t < 1) e.terminals_count = 'Indique cuántos terminales necesita.'
  else if (t > maxT) {
    e.terminals_count = `Indique entre 1 y ${maxT} terminales.`
  }

  return e
}

export function ventasScopeErrors(
  fd: QuotationRequest,
  limits?: VentasFormLimits | null,
  tiers?: VentasPublicTier[] | null
): VentasValidationErrors {
  const e: VentasValidationErrors = {}
  const cc = fd.country_code
  if (!cc || !isCountryCode(cc)) e.country_code = 'Seleccione el país.'

  const emp = Number(fd.employees_count)
  const empErr = employeesCountError(emp, tiers)
  if (empErr) e.employees_count = empErr

  const rules = limitsToRules(limits)
  const modality = fd.billing_modality === 'monthly' ? 'monthly' : 'annual'
  if (modality === 'monthly' && Number.isFinite(emp) && !isMonthlyModalityAvailable(emp, rules)) {
    e.billing_modality = ventasMonthlyUnavailableMessage(rules)
  }

  const t = Number(fd.terminals_count)
  const maxT = maxTerminals(limits)
  if (!Number.isFinite(t) || t < 1 || t > maxT) {
    e.terminals_count = 'Indique terminales válidas.'
  }

  return e
}

export function ventasCompanyErrors(fd: QuotationRequest): VentasValidationErrors {
  const e: VentasValidationErrors = {}
  const company = (fd.company_name || '').trim()
  if (!company) e.company_name = 'Nombre de empresa obligatorio.'
  else if (company.length < 2) e.company_name = 'Nombre demasiado corto.'
  else if (company.length > 100) e.company_name = 'Máximo 100 caracteres.'
  return e
}

export function ventasDeliveryErrors(fd: QuotationRequest): VentasValidationErrors {
  const e: VentasValidationErrors = {}
  const email = (fd.contact_email || '').trim()
  if (!email) e.contact_email = 'Indique un correo; ahí le enviamos la propuesta.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.contact_email = 'Correo no válido.'
  return e
}

export const VENTAS_COUNTRY_LABEL: Record<CountryCode, string> = {
  HND: 'Honduras',
  SLV: 'El Salvador',
  GTM: 'Guatemala',
}

export const VENTAS_SECTOR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Seleccionar…' },
  { value: 'ferreterias', label: 'Ferreterías' },
  { value: 'restaurante', label: 'Restaurantes' },
  { value: 'comida_rapida', label: 'Comida rápida' },
  { value: 'cafeteria_panaderia', label: 'Cafetería / Panadería' },
  { value: 'bar', label: 'Bar' },
  { value: 'hotel', label: 'Hoteles' },
  { value: 'agencias_viaje', label: 'Agencias de viaje' },
  { value: 'comercio_mayor', label: 'Comercio al por mayor' },
  { value: 'retail', label: 'Retail' },
  { value: 'supermercado', label: 'Supermercado' },
  { value: 'hospitales', label: 'Hospitales' },
  { value: 'salud', label: 'Salud' },
  { value: 'educacion', label: 'Educación' },
  { value: 'logistica', label: 'Logística' },
  { value: 'manufactura', label: 'Manufactura' },
  { value: 'call_center', label: 'Call center' },
  { value: 'servicios', label: 'Servicios profesionales' },
  { value: 'otro', label: 'Otro' },
]

/** @deprecated use limits from public-config; kept for callers that import the constant */
export { VENTAS_MAX_AUTO_QUOTE_TERMINALS }
