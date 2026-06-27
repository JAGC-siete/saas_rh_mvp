import type { QuotationRequest } from '../ventas/types'
import { VENTAS_MAX_AUTO_QUOTE_TERMINALS } from '../ventas/modality-includes'
import type { CountryCode } from '../country/supported'
import { isCountryCode } from '../country/supported'

export type VentasValidationErrors = {
  contact_email?: string
  company_name?: string
  employees_count?: string
  terminals_count?: string
  country_code?: string
  submit?: string
}

export function computeVentasErrors(fd: QuotationRequest): VentasValidationErrors {
  const e: VentasValidationErrors = {}
  const email = (fd.contact_email || '').trim()
  if (!email) e.contact_email = 'Indique un correo; ahí le enviamos la propuesta.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.contact_email = 'Correo no válido.'

  const company = (fd.company_name || '').trim()
  if (!company) e.company_name = 'Nombre de empresa obligatorio.'
  else if (company.length < 2) e.company_name = 'Nombre demasiado corto.'
  else if (company.length > 100) e.company_name = 'Máximo 100 caracteres.'

  const emp = Number(fd.employees_count)
  if (!Number.isFinite(emp) || emp < 1 || emp > 200) e.employees_count = 'Indique entre 1 y 200 empleados.'

  const cc = fd.country_code
  if (!cc || !isCountryCode(cc)) {
    e.country_code = 'Seleccione el país donde opera la empresa.'
  }

  const t = Number(fd.terminals_count)
  if (!Number.isFinite(t) || t < 1) e.terminals_count = 'Indique cuántos terminales necesita.'
  else if (t > VENTAS_MAX_AUTO_QUOTE_TERMINALS) {
    e.terminals_count = `Indique entre 1 y ${VENTAS_MAX_AUTO_QUOTE_TERMINALS} terminales.`
  }

  return e
}

export function ventasScopeErrors(fd: QuotationRequest): VentasValidationErrors {
  const e: VentasValidationErrors = {}
  const cc = fd.country_code
  if (!cc || !isCountryCode(cc)) e.country_code = 'Seleccione el país.'

  const emp = Number(fd.employees_count)
  if (!Number.isFinite(emp) || emp < 1 || emp > 200) e.employees_count = 'Indique entre 1 y 200 empleados.'

  const t = Number(fd.terminals_count)
  if (!Number.isFinite(t) || t < 1 || t > VENTAS_MAX_AUTO_QUOTE_TERMINALS) {
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
  const full = computeVentasErrors(fd)
  return {
    contact_email: full.contact_email,
  }
}

export const VENTAS_COUNTRY_LABEL: Record<CountryCode, string> = {
  HND: 'Honduras',
  SLV: 'El Salvador',
  GTM: 'Guatemala',
}

export const VENTAS_SECTOR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Seleccionar…' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'comida_rapida', label: 'Comida rápida' },
  { value: 'cafeteria_panaderia', label: 'Cafetería / Panadería' },
  { value: 'bar', label: 'Bar' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'retail', label: 'Retail' },
  { value: 'supermercado', label: 'Supermercado' },
  { value: 'logistica', label: 'Logística' },
  { value: 'manufactura', label: 'Manufactura' },
  { value: 'salud', label: 'Salud' },
  { value: 'educacion', label: 'Educación' },
  { value: 'call_center', label: 'Call center' },
  { value: 'servicios', label: 'Servicios profesionales' },
  { value: 'otro', label: 'Otro' },
]
