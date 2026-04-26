// Hook para exportar reportes siguiendo el patrón de usePayrollReports
// Proporciona funciones limpias para exportar a Excel y PDF

export function useReportsExport() {
  async function downloadBlob(url: string, filename: string, options: RequestInit = {}) {
    const response = await fetch(url, { credentials: 'include', ...options })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${response.status}`)
    }
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    window.URL.revokeObjectURL(downloadUrl)
    document.body.removeChild(link)
  }

  async function exportAttendance(
    format: 'excel' | 'pdf' | 'csv',
    startDate: string,
    endDate: string
  ) {
    const extension = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'
    const filename = `asistencia_${startDate}_${endDate}.${extension}`
    
    await downloadBlob('/api/reports/export', filename, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : format === 'pdf'
          ? 'application/pdf'
          : 'text/csv'
      },
      body: JSON.stringify({
        format,
        reportType: 'attendance',
        dateFilter: { startDate, endDate }
      })
    })
  }

  async function exportPayroll(
    format: 'excel' | 'pdf' | 'csv',
    startDate: string,
    endDate: string
  ) {
    const extension = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'
    const filename = `nomina_${startDate}_${endDate}.${extension}`
    
    await downloadBlob('/api/reports/export', filename, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : format === 'pdf'
          ? 'application/pdf'
          : 'text/csv'
      },
      body: JSON.stringify({
        format,
        reportType: 'payroll',
        dateFilter: { startDate, endDate }
      })
    })
  }

  async function exportEmployees(format: 'excel' | 'pdf' | 'csv') {
    const extension = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `empleados_${dateStr}.${extension}`
    
    await downloadBlob('/api/reports/export', filename, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : format === 'pdf'
          ? 'application/pdf'
          : 'text/csv'
      },
      body: JSON.stringify({
        format,
        reportType: 'employees',
        dateFilter: { startDate: '', endDate: '' } // No se usa pero el endpoint lo requiere
      })
    })
  }

  async function exportWorkCertificate(
    employeeId: string,
    format: 'pdf' | 'csv',
    options?: { purpose?: string; certificateType?: string; includeDeductions?: boolean }
  ) {
    const ext = format === 'pdf' ? 'pdf' : 'csv'
    const filename = `constancia_laboral_${employeeId.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.${ext}`
    const accept = format === 'pdf' ? 'application/pdf' : 'text/csv'

    await downloadBlob('/api/reports/export-work-certificate', filename, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: accept
      },
      body: JSON.stringify({
        employeeId,
        format,
        purpose: options?.purpose ?? 'Constancia de trabajo',
        certificateType: options?.certificateType ?? 'general',
        includeDeductions: options?.includeDeductions ?? true
      })
    })
  }

  return { exportAttendance, exportPayroll, exportEmployees, exportWorkCertificate }
}

