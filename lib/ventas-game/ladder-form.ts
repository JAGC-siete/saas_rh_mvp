import type { QuotationRequest } from '../ventas/types'
import { isCountryCode } from '../country/supported'
import { mergeVentasBusinessRules, type VentasBusinessRules } from '../ventas/business-rules'
import { isLadderPlanKey, ventasLadderCustomQuoteMessage } from '../ventas/ladder'
import { ventasCompanyErrors, ventasDeliveryErrors, type VentasValidationErrors } from './ventas-form'

export type LadderValidationErrors = VentasValidationErrors & { plan_key?: string }

export type LadderFormLimits = Pick<
  VentasBusinessRules,
  'max_auto_quote_employees' | 'max_auto_quote_terminals'
>

function limitsOf(limits?: Partial<VentasBusinessRules> | null): LadderFormLimits {
  const r = mergeVentasBusinessRules(limits)
  return {
    max_auto_quote_employees: r.max_auto_quote_employees,
    max_auto_quote_terminals: r.max_auto_quote_terminals,
  }
}

/** Más empleados que el tope: se ofrece cotización a medida en lugar del formulario. */
export function ladderFormNeedsCustomQuote(
  fd: Pick<QuotationRequest, 'employees_count'>,
  limits?: Partial<VentasBusinessRules> | null
): boolean {
  const n = Number(fd.employees_count)
  return Number.isFinite(n) && n > limitsOf(limits).max_auto_quote_employees
}

export function ladderScopeErrors(
  fd: QuotationRequest,
  limits?: Partial<VentasBusinessRules> | null
): LadderValidationErrors {
  const e: LadderValidationErrors = {}
  const { max_auto_quote_employees, max_auto_quote_terminals } = limitsOf(limits)

  if (!fd.country_code || !isCountryCode(fd.country_code)) e.country_code = 'Elige el país.'
  if (!isLadderPlanKey(fd.plan_key)) e.plan_key = 'Elige un plan.'
  if (fd.billing_modality !== 'monthly' && fd.billing_modality !== 'annual') {
    e.billing_modality = 'Elige si pagas mes a mes o el año.'
  }

  const emp = Number(fd.employees_count)
  if (!Number.isInteger(emp) || emp < 1) {
    e.employees_count = 'Indica cuántos colaboradores tiene tu empresa.'
  } else if (emp > max_auto_quote_employees) {
    e.employees_count = ventasLadderCustomQuoteMessage(limits)
  }

  const t = Number(fd.terminals_count)
  if (!Number.isInteger(t) || t < 0 || t > max_auto_quote_terminals) {
    e.terminals_count = `Elige entre 0 y ${max_auto_quote_terminals} relojes.`
  }
  return e
}

export function ladderAllErrors(
  fd: QuotationRequest,
  limits?: Partial<VentasBusinessRules> | null
): LadderValidationErrors {
  return { ...ladderScopeErrors(fd, limits), ...ventasCompanyErrors(fd), ...ventasDeliveryErrors(fd) }
}

/** Opción del selector de relojes, p. ej. "2 relojes (1 incluido + 1 adicional)". */
export function ladderTerminalOptionLabel(params: {
  n: number
  modality: 'annual' | 'monthly'
  includedAnnual: number
  unitPriceLabel?: string
}): string {
  const { n, modality, includedAnnual, unitPriceLabel } = params
  if (n === 0) return 'Sin reloj'
  const base = n === 1 ? '1 reloj' : `${n} relojes`
  if (modality === 'annual' && includedAnnual > 0) {
    if (n <= includedAnnual) return `${base} (incluido)`
    const extra = n - includedAnnual
    return `${base} (${includedAnnual} incluido + ${extra} ${extra === 1 ? 'adicional' : 'adicionales'})`
  }
  return unitPriceLabel ? `${base} (${unitPriceLabel} c/u)` : base
}
