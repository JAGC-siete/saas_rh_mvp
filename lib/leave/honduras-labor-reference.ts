/**
 * Referencia al Código del Trabajo de Honduras (Decreto Legislativo 189/1959 y reformas).
 * Uso: cálculos y límites en producto; no sustituye asesoría legal ni convenios / reglamentos internos.
 *
 * Vacaciones anuales remuneradas (Arts. 345–359): días laborables consecutivos según años
 * de servicio continuo completados (convención producto: años completos entre hire_date y fecha de corte).
 *
 * @see https://www.tsc.gob.hn/web/leyes/codigo_de_trabajo.pdf
 */

/** Años de servicio continuo completos (no fracción hasta el aniversario). */
export function completedFullYearsOfService(hireDateYmd: string | null | undefined, asOf: Date): number {
  if (!hireDateYmd || !/^\d{4}-\d{2}-\d{2}/.test(hireDateYmd)) return 0
  const hire = new Date(hireDateYmd.slice(0, 10) + 'T12:00:00')
  if (Number.isNaN(hire.getTime())) return 0
  let years = asOf.getFullYear() - hire.getFullYear()
  const md = asOf.getMonth() * 32 + asOf.getDate()
  const hd = hire.getMonth() * 32 + hire.getDate()
  if (md < hd) years -= 1
  return Math.max(0, years)
}

/**
 * Días laborables consecutivos de vacaciones según antigüedad (tabla resumida del Código).
 * 0 años completos → 0 (aún no cumple el primer aniversario).
 */
export function vacationWorkingDaysByTenureYears(completedFullYears: number): number {
  if (completedFullYears >= 4) return 20
  if (completedFullYears >= 3) return 15
  if (completedFullYears >= 2) return 12
  if (completedFullYears >= 1) return 10
  return 0
}

/** Art. 95 inc. 5 — licencias con goce de salario en causas enumeradas (límites legales). */
export function statutoryPaidPermissionCaps(): {
  maxPerCalendarMonth: number
  maxPerCalendarYear: number
} {
  return { maxPerCalendarMonth: 2, maxPerCalendarYear: 15 }
}

export function statutoryVacationDaysForEmployee(
  hireDateYmd: string | null | undefined,
  asOf: Date
): number {
  return vacationWorkingDaysByTenureYears(completedFullYearsOfService(hireDateYmd, asOf))
}

/** Comprueba cupo Art. 95 CT HN (2 días/mes calendario, 15/año) para solicitudes acumuladas + propuesta. */
export function art95WouldExceed(input: {
  usedYear: number
  usedMonth: number
  proposedDays: number
}): { ok: true } | { ok: false; message: string } {
  const caps = statutoryPaidPermissionCaps()
  if (input.usedYear + input.proposedDays > caps.maxPerCalendarYear + 1e-9) {
    return {
      ok: false,
      message: `Excede el máximo anual de ${caps.maxPerCalendarYear} días con goce (Art. 95 CT).`,
    }
  }
  if (input.usedMonth + input.proposedDays > caps.maxPerCalendarMonth + 1e-9) {
    return {
      ok: false,
      message: `Excede el máximo de ${caps.maxPerCalendarMonth} días con goce en el mes calendario (Art. 95 CT).`,
    }
  }
  return { ok: true }
}
