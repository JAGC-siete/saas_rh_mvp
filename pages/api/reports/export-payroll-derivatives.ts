import type { NextApiRequest, NextApiResponse } from 'next'
import ExcelJS from 'exceljs'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { sanitizeFilename } from '../../../lib/security/export-security'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'
import { calculateINFOP } from '../../../lib/payroll/employer-contributions'
import { canExportReports, EXPORT_REPORTS_FORBIDDEN } from '../../../lib/security/permissions'

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'))
  return Number.isFinite(n) ? n : 0
}

function escapeCSVValue(val: string | number): string {
  const s = String(val ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role, userProfile } = await requireCompanyAccess(req, res)
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' })

    if (!canExportReports(role, userProfile)) {
      return res.status(EXPORT_REPORTS_FORBIDDEN.status).json(EXPORT_REPORTS_FORBIDDEN.body)
    }

    const { format, run_id, concept } = req.body as { format?: string; run_id?: string; concept?: string }
    if (!run_id || typeof run_id !== 'string') return res.status(400).json({ error: 'run_id is required' })
    if (!concept || typeof concept !== 'string') return res.status(400).json({ error: 'concept is required' })
    if (!format || !['excel', 'csv'].includes(format)) return res.status(400).json({ error: 'Formato inválido (excel|csv)' })

    const conceptUpper = concept.toUpperCase()
    const isInfop = conceptUpper === 'INFOP'
    const isIhss = conceptUpper === 'IHSS'
    const isRap = conceptUpper === 'RAP'
    const isCustom = conceptUpper.startsWith('CUSTOM_')
    const customKey = isCustom ? concept.slice('CUSTOM_'.length).toLowerCase() : null

    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .select('id, year, month, quincena, tipo, status')
      .eq('id', run_id)
      .eq('company_id', companyId)
      .single()

    if (runErr || !run) return res.status(404).json({ error: 'Payroll run not found' })

    const { data: lines, error: linesErr } = await supabase
      .from('payroll_run_lines')
      .select(
        `
          employee_id,
          eff_ihss,
          eff_rap,
          eff_bruto,
          metadata,
          employees!payroll_run_lines_employee_id_fkey(
            name,
            dni,
            employee_code,
            position,
            role,
            base_salary
          )
        `
      )
      .eq('run_id', run_id)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })

    if (linesErr) return res.status(500).json({ error: 'Error fetching run lines', details: linesErr.message })

    let isInfopLiable = false
    if (isInfop) {
      const { data: company } = await supabase.from('companies').select('settings').eq('id', companyId).single()
      isInfopLiable = (company?.settings as Record<string, unknown>)?.is_infop_liable === true
    }

    const includeEmployerColumn = isIhss || isRap || isInfop
    const headers = [
      'Empleado',
      'Identidad',
      'Puesto',
      'Salario base (usado)',
      'Monto retenido (empleado)',
      ...(includeEmployerColumn ? ['Aportación patronal'] : [])
    ]

    const rows: (string | number)[][] = []
    let totalEmployee = 0
    let totalEmployer = 0
    let totalBruto = 0

    for (const line of lines || []) {
      const emp = (line.employees || {}) as any
      const meta = (line.metadata || {}) as Record<string, unknown>
      const baseSalaryUsed = toNum(meta.base_salary_used ?? emp.base_salary)
      const employeeName = String(emp.name || '')
      const dni = String(emp.dni || emp.employee_code || '')
      const position = String(emp.position || emp.role || '')

      const effBruto = toNum((line as any).eff_bruto)
      totalBruto += effBruto

      let employeeAmount = 0
      let employerAmount: number | undefined = undefined

      if (isIhss) {
        employeeAmount = toNum((line as any).eff_ihss)
        employerAmount = toNum(meta.ihss_patronal)
      } else if (isRap) {
        employeeAmount = toNum((line as any).eff_rap)
        employerAmount = toNum(meta.rap_patronal)
      } else if (isInfop) {
        employeeAmount = 0
      } else if (isCustom && customKey) {
        employeeAmount = toNum(meta[customKey])
      } else {
        return res.status(400).json({ error: 'Unsupported concept' })
      }

      totalEmployee += employeeAmount
      if (employerAmount != null) totalEmployer += employerAmount

      const baseCols: (string | number)[] = [
        employeeName,
        dni,
        position,
        Math.round(baseSalaryUsed * 100) / 100,
        Math.round(employeeAmount * 100) / 100
      ]
      if (includeEmployerColumn) {
        baseCols.push(employerAmount != null ? Math.round(employerAmount * 100) / 100 : 0)
      }
      rows.push(baseCols)
    }

    if (isInfop) {
      totalEmployer = isInfopLiable ? Math.round(calculateINFOP(totalBruto) * 100) / 100 : 0
    }

    const periodLabel = `${run.year}-${String(run.month).padStart(2, '0')}_q${run.quincena}_${run.tipo}`
    const baseName = `derivados_${conceptUpper.toLowerCase()}_${periodLabel}`

    if (format === 'csv') {
      let csv = `Derivados de nómina\nConcepto: ${conceptUpper}\nCorrida: ${periodLabel}\n\n`
      csv += headers.map(escapeCSVValue).join(',') + '\n'
      for (const r of rows) {
        csv += r.map(escapeCSVValue).join(',') + '\n'
      }
      csv += `\nTotales,,,\n`
      csv += `Total empleado,,,,${Math.round(totalEmployee * 100) / 100}${includeEmployerColumn ? ',' : ''}${includeEmployerColumn ? Math.round(totalEmployer * 100) / 100 : ''}\n`
      if (isInfop) {
        csv += `INFOP total patronal,,,,,${Math.round(totalEmployer * 100) / 100}\n`
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename=${sanitizeFilename(`${baseName}.csv`)}`)
      return res.status(200).send(csv)
    }

    // excel
    const wb = new ExcelJS.Workbook()
    const sheet = wb.addWorksheet('Derivados')
    sheet.columns = headers.map((h, i) => ({
      header: h,
      key: `col_${i}`,
      width: Math.max(14, Math.min(h.length + 2, 30))
    }))
    for (const r of rows) {
      const rowObj: Record<string, unknown> = {}
      r.forEach((v, i) => (rowObj[`col_${i}`] = v))
      sheet.addRow(rowObj)
    }
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

    const summary = wb.addWorksheet('Totales')
    summary.columns = [
      { header: 'Concepto', key: 'concept', width: 28 },
      { header: 'Valor', key: 'value', width: 18 }
    ]
    summary.addRow({ concept: 'Concepto', value: conceptUpper })
    summary.addRow({ concept: 'Corrida', value: periodLabel })
    summary.addRow({ concept: 'Total retenido (empleado)', value: Math.round(totalEmployee * 100) / 100 })
    if (includeEmployerColumn) {
      summary.addRow({ concept: 'Total aportación patronal', value: Math.round(totalEmployer * 100) / 100 })
    }
    if (isInfop) {
      summary.addRow({ concept: 'INFOP aplica', value: isInfopLiable ? 'Sí' : 'No' })
    }
    summary.getRow(1).font = { bold: true }
    summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

    const buffer = await wb.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=${sanitizeFilename(`${baseName}.xlsx`)}`)
    return res.send(Buffer.from(buffer))
  } catch (e: any) {
    return res.status(e?.message === 'UNAUTHORIZED' ? 401 : 500).json({ error: e?.message || 'Internal server error' })
  }
}

export default withExportRateLimit(['POST'])(handler)

