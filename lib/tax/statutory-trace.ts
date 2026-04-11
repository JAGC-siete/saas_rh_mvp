import type { CountryCode } from '../country/supported'

export type StatutoryDataSource =
  | 'payroll_statutory_params'
  | 'tax_brackets'
  | 'fallback_default'
  /** País sin fila activa en payroll_statutory_params para ese año */
  | 'none'

export type PayrollStatutoryTrace = {
  countryCode: CountryCode
  /** Año del período de nómina solicitado (compatibilidad con trazas previas). */
  year: number
  /** Año fiscal/legal pedido (redundante con `year` en flujos nuevos). */
  requestedYear: number
  /** Año de la fila/parametrización usada; ausente si no hay datos (p. ej. SLV sin fila). */
  resolvedYear?: number
  /** true si se usó otra fila distinta al año pedido (p. ej. HND tax_brackets fallback). */
  usedFallback: boolean
  dataSource: StatutoryDataSource
  /** p. ej. tax_brackets, backfill, placeholder */
  sourceLabel?: string
  notes?: string
}
