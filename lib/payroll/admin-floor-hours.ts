/**
 * Admin con piso horario: tarifa horaria (mensual÷240) con piso = tope ordinario/día.
 *
 * - Día con asistencia y sin salida, o horas ≤ tope → paga el tope (piso); HE = 0.
 * - Día con entrada+salida y horas > tope → ordinarias = tope, HE = exceso.
 */

export type AdminFloorDayInput = {
  check_in?: string | null
  check_out?: string | null
  /** Horas netas del día (AHC total_hours preferente). */
  total_hours?: number | null
}

export type AdminFloorHoursBreakdown = {
  ordinary: number
  overtime: number
  /** Horas que entran al bruto si HE elegible: ordinary + overtime (= payable). */
  payable: number
}

/** Tope ordinario: override empresa, si no legal/8. */
export function resolveOrdinaryHoursCap(
  override: number | null | undefined,
  legalDailyHours?: number | null
): number {
  const o = Number(override)
  if (Number.isFinite(o) && o >= 1 && o <= 16) return o
  const legal = Number(legalDailyHours)
  if (Number.isFinite(legal) && legal >= 1 && legal <= 16) return legal
  return 8
}

export function computeAdminFloorDayHours(
  day: AdminFloorDayInput,
  ordinaryCap: number
): AdminFloorHoursBreakdown {
  if (!day.check_in) {
    return { ordinary: 0, overtime: 0, payable: 0 }
  }
  const cap = ordinaryCap > 0 ? ordinaryCap : 8

  if (!day.check_out) {
    return { ordinary: cap, overtime: 0, payable: cap }
  }

  const actual = Math.max(0, Number(day.total_hours) || 0)
  if (actual > cap) {
    const overtime = Math.round((actual - cap) * 100) / 100
    return {
      ordinary: cap,
      overtime,
      payable: Math.round(actual * 100) / 100,
    }
  }

  // Ambas marcas pero ≤ tope → piso al tope (nunca paga menos)
  return { ordinary: cap, overtime: 0, payable: cap }
}

export function sumAdminFloorPeriodHours(
  days: AdminFloorDayInput[],
  ordinaryCap: number
): AdminFloorHoursBreakdown {
  const sum = days.reduce(
    (acc, d) => {
      const x = computeAdminFloorDayHours(d, ordinaryCap)
      acc.ordinary += x.ordinary
      acc.overtime += x.overtime
      acc.payable += x.payable
      return acc
    },
    { ordinary: 0, overtime: 0, payable: 0 }
  )
  return {
    ordinary: Math.round(sum.ordinary * 100) / 100,
    overtime: Math.round(sum.overtime * 100) / 100,
    payable: Math.round(sum.payable * 100) / 100,
  }
}
