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

  return { exportAttendance, exportPayroll, exportEmployees }
}

