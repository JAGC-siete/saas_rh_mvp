/**
 * Cálculo de fechas de período para nómina.
 * Soporta rangos personalizados que cruzan fin de mes (ej: 29-12, 28-27).
 */

const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/**
 * Formatea un rango de fechas para mostrar en voucher/reporte.
 * Ej: "15 de Oct al 21 de Oct"
 */
export function formatPeriodRangeForDisplay(periodStart: string, periodEnd: string): string {
  const parse = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return { year: y, month: m, day: d }
  }
  const start = parse(periodStart)
  const end = parse(periodEnd)
  const mesStart = MESES_ES[(start.month || 1) - 1] || ''
  const mesEnd = MESES_ES[(end.month || 1) - 1] || ''
  const dayStart = start.day ?? 1
  const dayEnd = end.day ?? 1
  if (start.month === end.month && start.year === end.year) {
    return `${dayStart} de ${mesStart} al ${dayEnd} de ${mesEnd}`
  }
  return `${dayStart} de ${mesStart} al ${dayEnd} de ${mesEnd}`
}

export interface BiweeklyCutDates {
  biweekly_first_start: number
  biweekly_first_end: number
  biweekly_second_start: number
  biweekly_second_end: number
}

export interface MonthlyCutDates {
  monthly_start: number
  monthly_end: number
}

export interface PeriodDatesResult {
  fechaInicio: string
  fechaFin: string
  diasPeriodo: number
}

export interface CurrentPeriodInfo {
  periodKey: string
  year: number
  month: number
  quincena?: 1 | 2
  semana?: 1 | 2 | 3 | 4
  fechaInicio: string
  fechaFin: string
  diasPeriodo: number
  label: string
}

export interface PayrollPeriodConfig {
  payment_frequency: 'mensual' | 'quincenal' | 'semanal'
  monthly_start?: number
  monthly_end?: number
  monthly_type?: 'standard' | 'custom'
  biweekly_first_start?: number
  biweekly_first_end?: number
  biweekly_second_start?: number
  biweekly_second_end?: number
  biweekly_type?: 'standard' | 'custom'
  weekly_type?: 'standard' | 'custom'
}

/** Semana del mes: 1 (1-7), 2 (8-14), 3 (15-21), 4 (22-fin) */
export function getWeeklyPeriodDates(
  year: number,
  month: number,
  semana: 1 | 2 | 3 | 4
): PeriodDatesResult {
  const periodo = `${year}-${String(month).padStart(2, '0')}`
  const ultimoDia = new Date(year, month, 0).getDate()
  const startDay = (semana - 1) * 7 + 1
  const endDay = semana === 4 ? ultimoDia : Math.min(semana * 7, ultimoDia)
  const actualStart = Math.min(startDay, ultimoDia)
  const diasPeriodo = endDay - actualStart + 1
  return {
    fechaInicio: `${periodo}-${String(actualStart).padStart(2, '0')}`,
    fechaFin: `${periodo}-${String(endDay).padStart(2, '0')}`,
    diasPeriodo
  }
}

/**
 * Calcula las fechas del período para nómina quincenal.
 * Maneja rangos que cruzan fin de mes (first_start > first_end).
 *
 * Convención para Q1 que cruza (ej: 29-12):
 * - Periodo "Febrero", Q1 = 29 ene al 12 feb (el período termina en el mes seleccionado)
 */
export function getBiweeklyPeriodDates(
  year: number,
  month: number,
  quincena: 1 | 2,
  cutDates: BiweeklyCutDates
): PeriodDatesResult {
  const periodo = `${year}-${String(month).padStart(2, '0')}`
  const ultimoDia = new Date(year, month, 0).getDate()

  const fs = cutDates.biweekly_first_start
  const fe = cutDates.biweekly_first_end
  const ss = cutDates.biweekly_second_start
  const se = cutDates.biweekly_second_end

  if (quincena === 1) {
    // Primera quincena: ¿cruza fin de mes?
    if (fs > fe) {
      // Cruza: inicio en mes anterior, fin en mes actual (ej: 29 ene - 12 feb)
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      const ultimoDiaPrev = new Date(prevYear, prevMonth, 0).getDate()
      const startDay = Math.min(fs, ultimoDiaPrev)
      const endDay = Math.min(fe, ultimoDia)
      const fechaInicio = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
      const fechaFin = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
      const diasPeriodo = (ultimoDiaPrev - startDay + 1) + endDay
      return { fechaInicio, fechaFin, diasPeriodo }
    } else {
      // Mismo mes (ej: 1-15)
      const startDay = Math.min(fs, ultimoDia)
      const endDay = Math.min(fe, ultimoDia)
      const fechaInicio = `${periodo}-${String(startDay).padStart(2, '0')}`
      const fechaFin = `${periodo}-${String(endDay).padStart(2, '0')}`
      const diasPeriodo = endDay - startDay + 1
      return { fechaInicio, fechaFin, diasPeriodo }
    }
  } else {
    // Segunda quincena
    if (ss > se) {
      // Cruza (poco común en Q2)
      const prevMonth = month === 1 ? 12 : month - 1
      const prevYear = month === 1 ? year - 1 : year
      const ultimoDiaPrev = new Date(prevYear, prevMonth, 0).getDate()
      const startDay = Math.min(ss, ultimoDiaPrev)
      const endDay = Math.min(se, ultimoDia)
      const fechaInicio = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
      const fechaFin = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
      const diasPeriodo = (ultimoDiaPrev - startDay + 1) + endDay
      return { fechaInicio, fechaFin, diasPeriodo }
    } else {
      const startDay = Math.min(ss, ultimoDia)
      const endDay = Math.min(se, ultimoDia)
      const fechaInicio = `${periodo}-${String(startDay).padStart(2, '0')}`
      const fechaFin = `${periodo}-${String(endDay).padStart(2, '0')}`
      const diasPeriodo = endDay - startDay + 1
      return { fechaInicio, fechaFin, diasPeriodo }
    }
  }
}

/**
 * Calcula las fechas del período para nómina mensual.
 * Soporta offset (start_day > end_day): ej. 28-27 = 28 de mes N al 27 de mes N+1.
 * Maneja febrero (28/29 días) sin desbordamiento.
 */
export function getMonthlyPeriodDates(
  year: number,
  month: number,
  startDay: number,
  endDay: number
): PeriodDatesResult {
  const ultimoDia = new Date(year, month, 0).getDate()

  if (startDay <= endDay) {
    // Mismo mes (ej: 1-30)
    const start = Math.min(startDay, ultimoDia)
    const end = Math.min(endDay, ultimoDia)
    const periodo = `${year}-${String(month).padStart(2, '0')}`
    return {
      fechaInicio: `${periodo}-${String(start).padStart(2, '0')}`,
      fechaFin: `${periodo}-${String(end).padStart(2, '0')}`,
      diasPeriodo: end - start + 1
    }
  } else {
    // Offset: cruza de mes (ej: 28-27)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const ultimoDiaPrev = new Date(prevYear, prevMonth, 0).getDate()
    const start = Math.min(startDay, ultimoDiaPrev)
    const end = Math.min(endDay, ultimoDia)
    const fechaInicio = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(start).padStart(2, '0')}`
    const fechaFin = `${year}-${String(month).padStart(2, '0')}-${String(end).padStart(2, '0')}`
    const diasPeriodo = (ultimoDiaPrev - start + 1) + end
    return { fechaInicio, fechaFin, diasPeriodo }
  }
}

/**
 * Obtiene el período actual según la configuración y fecha de referencia.
 */
export function getCurrentPeriod(
  config: PayrollPeriodConfig,
  referenceDate: Date = new Date()
): CurrentPeriodInfo {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() + 1
  const day = referenceDate.getDate()

  if (config.payment_frequency === 'mensual') {
    const monthlyType = config.monthly_type || 'standard'
    const startDay = config.monthly_start ?? 1
    const endDay = config.monthly_end ?? 30

    let targetYear = year
    let targetMonth = month

    if (monthlyType === 'custom' && startDay > endDay) {
      // Offset: 28-27. El período del mes M termina el endDay de M.
      const ultimoDia = new Date(year, month, 0).getDate()
      if (day <= endDay) {
        targetMonth = month
      } else if (day >= startDay) {
        targetMonth = month === 12 ? 1 : month + 1
        targetYear = month === 12 ? year + 1 : year
      } else {
        targetMonth = month
      }
    }

    const result = monthlyType === 'custom' && startDay && endDay
      ? getMonthlyPeriodDates(targetYear, targetMonth, startDay, endDay)
      : getMonthlyPeriodDates(targetYear, targetMonth, 1, new Date(targetYear, targetMonth, 0).getDate())

    return {
      periodKey: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
      year: targetYear,
      month: targetMonth,
      fechaInicio: result.fechaInicio,
      fechaFin: result.fechaFin,
      diasPeriodo: result.diasPeriodo,
      label: `Mensual ${result.fechaInicio} - ${result.fechaFin}`
    }
  }

  if (config.payment_frequency === 'semanal') {
    const semana: 1 | 2 | 3 | 4 = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4
    const result = getWeeklyPeriodDates(year, month, semana)
    return {
      periodKey: `${year}-${String(month).padStart(2, '0')}-S${semana}`,
      year,
      month,
      semana,
      fechaInicio: result.fechaInicio,
      fechaFin: result.fechaFin,
      diasPeriodo: result.diasPeriodo,
      label: `Semana ${semana}: ${result.fechaInicio} - ${result.fechaFin}`
    }
  }

  // Quincenal
  const qc = config as BiweeklyCutDates
  const fs = qc.biweekly_first_start ?? 1
  const fe = qc.biweekly_first_end ?? 15
  const ss = qc.biweekly_second_start ?? 16
  const se = qc.biweekly_second_end ?? 30
  const ultimoDia = new Date(year, month, 0).getDate()

  let quincena: 1 | 2
  if (fs > fe) {
    // Primera quincena cruza fin de mes (ej: 29-12): día 1-12 → Q1, 13+ → Q2
    quincena = day <= fe ? 1 : 2
  } else if (ss > se) {
    // Segunda quincena cruza fin de mes
    quincena = day >= ss || day <= se ? 2 : 1
  } else {
    // Estándar: usar fe (fin primera quincena) en lugar de hardcoded 15
    quincena = day <= fe ? 1 : 2
  }

  const result = getBiweeklyPeriodDates(year, month, quincena, {
    biweekly_first_start: fs,
    biweekly_first_end: fe,
    biweekly_second_start: ss,
    biweekly_second_end: se
  })

  return {
    periodKey: `${year}-${String(month).padStart(2, '0')}-Q${quincena}`,
    year,
    month,
    quincena,
    fechaInicio: result.fechaInicio,
    fechaFin: result.fechaFin,
    diasPeriodo: result.diasPeriodo,
    label: `Q${quincena} ${result.fechaInicio} - ${result.fechaFin}`
  }
}

/**
 * Genera los próximos N periodos para vista previa.
 */
export function getUpcomingPeriods(
  config: PayrollPeriodConfig,
  count: number = 3
): CurrentPeriodInfo[] {
  const periods: CurrentPeriodInfo[] = []
  const now = new Date()

  if (config.payment_frequency === 'mensual') {
    const monthlyType = config.monthly_type || 'standard'
    const startDay = config.monthly_start ?? 1
    const endDay = config.monthly_end ?? 30

    const current = getCurrentPeriod(config, now)
    let y = current.year
    let m = current.month
    for (let i = 0; i < count; i++) {
      const result = monthlyType === 'custom' && startDay && endDay
        ? getMonthlyPeriodDates(y, m, startDay, endDay)
        : getMonthlyPeriodDates(y, m, 1, new Date(y, m, 0).getDate())

      periods.push({
        periodKey: `${y}-${String(m).padStart(2, '0')}`,
        year: y,
        month: m,
        fechaInicio: result.fechaInicio,
        fechaFin: result.fechaFin,
        diasPeriodo: result.diasPeriodo,
        label: `${result.fechaInicio} al ${result.fechaFin}`
      })
      m = m === 12 ? 1 : m + 1
      y = m === 1 ? y + 1 : y
    }
  } else if (config.payment_frequency === 'semanal') {
    const current = getCurrentPeriod(config, now)
    let y = current.year
    let m = current.month
    let s: 1 | 2 | 3 | 4 = (current.semana ?? 1) as 1 | 2 | 3 | 4
    for (let i = 0; i < count; i++) {
      const result = getWeeklyPeriodDates(y, m, s)
      periods.push({
        periodKey: `${y}-${String(m).padStart(2, '0')}-S${s}`,
        year: y,
        month: m,
        semana: s,
        fechaInicio: result.fechaInicio,
        fechaFin: result.fechaFin,
        diasPeriodo: result.diasPeriodo,
        label: `S${s}: ${result.fechaInicio} al ${result.fechaFin}`
      })
      if (s === 4) {
        m = m === 12 ? 1 : m + 1
        y = m === 1 ? y + 1 : y
        s = 1
      } else {
        s = (s + 1) as 1 | 2 | 3 | 4
      }
    }
  } else {
    const cutDates = {
      biweekly_first_start: config.biweekly_first_start ?? 1,
      biweekly_first_end: config.biweekly_first_end ?? 15,
      biweekly_second_start: config.biweekly_second_start ?? 16,
      biweekly_second_end: config.biweekly_second_end ?? 30
    }
    const current = getCurrentPeriod(config, now)
    let y = current.year
    let m = current.month
    let q: 1 | 2 = (current.quincena ?? 1) as 1 | 2
    for (let i = 0; i < count; i++) {
      const result = getBiweeklyPeriodDates(y, m, q, cutDates)
      periods.push({
        periodKey: `${y}-${String(m).padStart(2, '0')}-Q${q}`,
        year: y,
        month: m,
        quincena: q,
        fechaInicio: result.fechaInicio,
        fechaFin: result.fechaFin,
        diasPeriodo: result.diasPeriodo,
        label: `Q${q}: ${result.fechaInicio} al ${result.fechaFin}`
      })
      if (q === 2) {
        m = m === 12 ? 1 : m + 1
        y = m === 1 ? y + 1 : y
        q = 1
      } else {
        q = 2
      }
    }
  }

  return periods
}

/** YYYY-MM-DD for a calendar day in an IANA timezone. */
export function getDateStringInTimezone(date: Date, timezone: string): string {
  return date.toLocaleDateString('en-CA', { timeZone: timezone })
}

/** Yesterday's date (YYYY-MM-DD) in the given timezone. */
export function getYesterdayInTimezone(timezone: string, referenceDate: Date = new Date()): string {
  const today = getDateStringInTimezone(referenceDate, timezone)
  const [y, m, d] = today.split('-').map(Number)
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  noon.setUTCDate(noon.getUTCDate() - 1)
  return noon.toISOString().slice(0, 10)
}

/** True when dateStr is the last day of the pay period that contains it. */
export function isPeriodEndDate(config: PayrollPeriodConfig, dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  const ref = new Date(y, m - 1, d, 12, 0, 0)
  const period = getCurrentPeriod(config, ref)
  return period.fechaFin === dateStr
}
