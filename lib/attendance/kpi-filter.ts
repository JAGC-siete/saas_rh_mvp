export type KpiFilter = 'all' | 'presentes' | 'ausentes' | 'temprano' | 'tarde'

/** Tabs that mirror KPI cards (plus outside-schedule). */
export type AttendanceListTab = 'temprano' | 'tarde' | 'presentes' | 'ausentes' | 'outside'

export function kpiFilterToTab(filter: KpiFilter): AttendanceListTab | null {
  switch (filter) {
    case 'temprano':
      return 'temprano'
    case 'tarde':
      return 'tarde'
    case 'presentes':
      return 'presentes'
    case 'ausentes':
      return 'ausentes'
    default:
      return null
  }
}

export function tabToKpiFilter(tab: AttendanceListTab): KpiFilter {
  switch (tab) {
    case 'temprano':
      return 'temprano'
    case 'tarde':
      return 'tarde'
    case 'presentes':
      return 'presentes'
    case 'ausentes':
      return 'ausentes'
    default:
      return 'all'
  }
}

export function kpiFilterToSeverity(
  filter: KpiFilter
): 'all' | 'early' | 'on_time' | 'warn' | 'alert' | 'danger' | 'late' {
  switch (filter) {
    case 'temprano':
      return 'early'
    case 'tarde':
      return 'late'
    case 'presentes':
      // Full present list (early + on_time + late); Temprano/Tarde tabs narrow further.
      return 'all'
    default:
      return 'all'
  }
}

/** Business late threshold aligned with attendance RPCs. */
export function isLateArrival(row: { delta_min?: number; late_minutes?: number }): boolean {
  return (row.delta_min ?? row.late_minutes ?? 0) > 5
}

export function isEarlyArrival(row: { delta_min?: number; late_minutes?: number }): boolean {
  return (row.delta_min ?? row.late_minutes ?? 0) < -5
}
