export const DIAS_MES_COMERCIAL = 30
export const DIAS_ANO_COMERCIAL = 360
export const MIN_DAYS_14AVO_ANNUAL = 200

interface CommercialDate {
  year: number
  month: number
  day: number
}

/**
 * Parse YYYY-MM-DD as a civil calendar date in local time.
 * Avoids `new Date('YYYY-MM-DD')` UTC midnight, which shifts the day in UTC−6.
 */
export function parseDateYmd(ymd: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!match) return new Date(NaN)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date(NaN)
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return new Date(NaN)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date(NaN)
  }
  return date
}

function toCommercialDate(date: Date): CommercialDate {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: Math.min(date.getDate(), 30),
  }
}

function toCommercialDayNumber(date: Date): number {
  const d = toCommercialDate(date)
  return d.year * DIAS_ANO_COMERCIAL + (d.month - 1) * DIAS_MES_COMERCIAL + (d.day - 1)
}

export function diffDays360(start: Date, end: Date): number {
  const startNum = toCommercialDayNumber(start)
  const endNum = toCommercialDayNumber(end)
  if (endNum < startNum) return 0
  return endNum - startNum + 1
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface BenefitPeriod {
  inicio: Date
  fin: Date
  diasEnPeriodo: number
}

export function resolvePeriod13(fechaIngreso: Date, fechaCalculo: Date): BenefitPeriod {
  const year = fechaCalculo.getFullYear()
  const inicioAnoNatural = new Date(year, 0, 1)
  const inicio = fechaIngreso > inicioAnoNatural ? fechaIngreso : inicioAnoNatural
  const fin = fechaCalculo
  return {
    inicio,
    fin,
    diasEnPeriodo: diffDays360(inicio, fin),
  }
}

export function resolvePeriod14(fechaIngreso: Date, fechaCalculo: Date): BenefitPeriod {
  const year = fechaCalculo.getFullYear()
  const periodo14YearStart = fechaCalculo.getMonth() + 1 >= 7 ? year : year - 1
  const inicioDesdeJulio = new Date(periodo14YearStart, 6, 1)
  let diasEnPeriodo = 0
  let inicio = inicioDesdeJulio
  const fin = fechaCalculo

  if (fechaCalculo >= inicioDesdeJulio) {
    inicio = fechaIngreso > inicioDesdeJulio ? fechaIngreso : inicioDesdeJulio
    diasEnPeriodo = diffDays360(inicio, fin)
  }

  return { inicio, fin, diasEnPeriodo }
}

export function resolveBenefitPeriodDays(
  tipo: '13AVO' | '14AVO',
  fechaIngreso: Date,
  fechaCalculo: Date,
  diasTrabajadosPeriodo?: number
): BenefitPeriod {
  const period = tipo === '13AVO' ? resolvePeriod13(fechaIngreso, fechaCalculo) : resolvePeriod14(fechaIngreso, fechaCalculo)
  if (typeof diasTrabajadosPeriodo === 'number' && Number.isFinite(diasTrabajadosPeriodo) && diasTrabajadosPeriodo >= 0) {
    return { ...period, diasEnPeriodo: Math.floor(diasTrabajadosPeriodo) }
  }
  return period
}
