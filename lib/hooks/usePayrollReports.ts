export function usePayrollReports() {
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

  async function downloadConsolidatedReport(periodo: string, quincena: number) {
    await downloadBlob('/api/payroll/report', `planilla_paragon_${periodo}_q${quincena}.pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/pdf' },
      body: JSON.stringify({ periodo, quincena })
    })
  }

  async function downloadEmployeeReceipt(employeeId: string, periodo: string, quincena: number) {
    await downloadBlob('/api/payroll/receipt', `recibo_${employeeId}_${periodo}_q${quincena}.pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/pdf' },
      body: JSON.stringify({ periodo, quincena, employeeId })
    })
  }

  async function exportExcel(periodo: string) {
    await downloadBlob('/api/payroll/export', `nomina_paragon_${periodo}.xlsx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      body: JSON.stringify({ periodo, formato: 'excel' })
    })
  }

  return { downloadConsolidatedReport, downloadEmployeeReceipt, exportExcel }
}

