import type { ReportType } from './report-config-schema'

export interface ReportExportCapabilities {
  excel: boolean
  pdf: boolean
  csv: boolean
}

/** Qué exporta el backend hoy: `/api/reports/export` solo attendance | payroll | employees. */
export function getReportExportCapabilities(reportType: ReportType): ReportExportCapabilities {
  switch (reportType) {
    case 'attendance':
    case 'payroll':
    case 'employees':
      return { excel: true, pdf: true, csv: false }
    case 'work_certificate':
      return { excel: false, pdf: true, csv: true }
    case 'severance':
      return { excel: false, pdf: false, csv: true }
    default:
      return { excel: false, pdf: false, csv: false }
  }
}

export function reportNeedsDateRange(reportType: ReportType): boolean {
  return reportType === 'attendance' || reportType === 'payroll'
}

export function reportSubtitle(reportType: ReportType): string {
  switch (reportType) {
    case 'attendance':
      return 'Registros de asistencia por rango de fechas, con filtros por empleado y departamento.'
    case 'payroll':
      return 'Líneas de nómina (corridas) que cruzan el rango seleccionado; exportación PDF usa la quincena derivada del inicio del rango.'
    case 'employees':
      return 'Directorio de empleados según estado y departamento; no depende del rango de fechas.'
    case 'work_certificate':
      return 'Vista previa de datos para constancia laboral (empleados activos). Descarga PDF o CSV por empleado.'
    case 'severance':
      return 'Cálculo de liquidación según fecha de terminación. Exporta el resultado como CSV desde la vista previa.'
    default:
      return ''
  }
}
