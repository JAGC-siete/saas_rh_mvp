import { TRIAL_CONFIG } from '../config/trial'
import type { CountryCode } from '../country/supported'
import { isCountryCode } from '../country/supported'
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

export function defaultCallingCodeForPayrollCountry(cc: CountryCode): string {
  if (cc === 'SLV') return '+503'
  if (cc === 'GTM') return '+502'
  return '+504'
}
