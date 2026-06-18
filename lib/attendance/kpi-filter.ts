export type KpiFilter = 'all' | 'presentes' | 'ausentes' | 'temprano' | 'tarde'

export function kpiFilterToTab(filter: KpiFilter): 'absent' | 'arrivals' | 'outside' | null {
  switch (filter) {
    case 'ausentes':
      return 'absent'
    case 'presentes':
    case 'temprano':
    case 'tarde':
      return 'arrivals'
    default:
      return null
  }
}

export function kpiFilterToSeverity(filter: KpiFilter): 'all' | 'early' | 'on_time' | 'warn' | 'alert' | 'danger' | 'late' {
  switch (filter) {
    case 'temprano':
      return 'early'
    case 'presentes':
      return 'on_time'
    case 'tarde':
      return 'late'
    default:
      return 'all'
  }
}
