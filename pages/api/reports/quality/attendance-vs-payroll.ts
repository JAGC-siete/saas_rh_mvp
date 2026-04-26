import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { withExportRateLimit } from '../../../../lib/security/rate-limiting'
import ExcelJS from 'exceljs'
import { getBiweeklyPeriodDates } from '../../../../lib/payroll/period-dates'
import { sanitizeFilename } from '../../../../lib/security/export-security'

const STANDARD_CUTS = { biweekly_first_start: 1, biweekly_first_end: 15, biweekly_second_start: 16, biweekly_second_end: 31 }

export default withExportRateLimit()(handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role, userProfile } = await requireCompanyAccess(req, res)
    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    const allowedRoles = ['super_admin', 'company_admin', 'hr_manager', 'manager']
    const rawPerms = typeof userProfile?.permissions === 'string'
      ? (() => { try { return JSON.parse(userProfile.permissions) } catch { return {} } })()
      : (userProfile?.permissions || {})
    const hasExportPermission = rawPerms.can_export_reports === true
    if (!allowedRoles.includes(role) && !hasExportPermission) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    const { periodo, quincena, format = 'csv' } = req.body
    if (!periodo || !/^[0-9]{4}-[0-9]{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'periodo inválido (YYYY-MM)' })
    }
    const q = Number(quincena)
    if (![1, 2].includes(q)) {
      return res.status(400).json({ error: 'quincena inválida (1 o 2)' })
    }

    const [year, month] = periodo.split('-').map(Number)
    const { fechaInicio, fechaFin } = getBiweeklyPeriodDates(year, month, q as 1 | 2, STANDARD_CUTS)

    const { data: payrollRun, error: runError } = await supabase
      .from('payroll_runs')
      .select('id')
      .eq('company_id', companyId)
      .eq('year', year)
      .eq('month', month)
      .eq('quincena', q)
      .single()

    if (runError || !payrollRun) {
      return res.status(404).json({ error: 'No hay corrida de nómina para el período indicado' })
    }

    const { data: payrollLines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select(`
        employee_id,
        eff_hours,
        eff_bruto,
        eff_neto,
        employees!payroll_run_lines_employee_id_fkey(
          name,
          employee_code,
          departments!employees_department_id_fkey(name)
        )
      `)
      .eq('run_id', payrollRun.id)
      .eq('company_id', companyId)

    if (linesError) return res.status(500).json({ error: 'Error obteniendo nómina' })

    const payrollEmployeeIds = new Set((payrollLines || []).map((l: any) => l.employee_id))
    const employeeIds = Array.from(payrollEmployeeIds)

    const { data: companyEmployees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active')
    const allCompanyEmployeeIds = (companyEmployees || []).map((e: any) => e.id)

    const { data: attRecords } = await supabase
      .from('attendance_records')
      .select('employee_id, check_in, check_out, lunch_start, lunch_end')
      .gte('date', fechaInicio)
      .lte('date', fechaFin)
      .in('employee_id', allCompanyEmployeeIds.length > 0 ? allCompanyEmployeeIds : ['__none__'])

    const attHoursByEmployee = new Map<string, number>()
    for (const r of attRecords || []) {
      const key = r.employee_id
      if (!attHoursByEmployee.has(key)) attHoursByEmployee.set(key, 0)
      if (r.check_in && r.check_out) {
        let ms = new Date(r.check_out).getTime() - new Date(r.check_in).getTime()
        if (r.lunch_start && r.lunch_end) {
          ms -= new Date(r.lunch_end).getTime() - new Date(r.lunch_start).getTime()
        }
        attHoursByEmployee.set(key, attHoursByEmployee.get(key)! + ms / (1000 * 60 * 60))
      }
    }

    const payrollByEmployee = new Map<string, any>()
    for (const l of payrollLines || []) {
      payrollByEmployee.set(l.employee_id, l)
    }

    const rows: Array<{
      employee_code: string
      employee_name: string
      department: string
      hours_attendance: number
      hours_payroll: number
      diff_hours: number
      status: 'ok' | 'desfase' | 'solo_nomina' | 'solo_asistencia'
    }> = []

    const attEmployeeIds = new Set(attHoursByEmployee.keys())

    const { data: empLookup } = await supabase
      .from('employees')
      .select('id, name, employee_code, departments:department_id(name)')
      .in('id', Array.from(attEmployeeIds))

    for (const [empId, line] of payrollByEmployee) {
      const emp = line.employees
      const empName = emp?.name || empId
      const empCode = emp?.employee_code || ''
      const dept = emp?.departments?.name || 'Sin Departamento'
      const payrollHours = Number(line.eff_hours) || 0
      const ahcHours = attHoursByEmployee.get(empId) ?? 0
      const diff = Math.round((payrollHours - ahcHours) * 100) / 100
      let status: 'ok' | 'desfase' | 'solo_nomina' | 'solo_asistencia' = 'ok'
      if (Math.abs(diff) > 0.5) status = 'desfase'

      rows.push({
        employee_code: empCode,
        employee_name: empName,
        department: dept,
        hours_attendance: Math.round(ahcHours * 100) / 100,
        hours_payroll: payrollHours,
        diff_hours: diff,
        status
      })
    }

    const empById = new Map<string, any>()
    for (const e of empLookup || []) {
      empById.set(e.id, e)
    }
    for (const empId of attEmployeeIds) {
      if (!payrollEmployeeIds.has(empId)) {
        const hours = attHoursByEmployee.get(empId) ?? 0
        const emp = empById.get(empId)
        rows.push({
          employee_code: emp?.employee_code ?? '',
          employee_name: emp?.name ?? empId,
          department: (Array.isArray(emp?.departments) ? emp?.departments[0]?.name : emp?.departments?.name) ?? '',
          hours_attendance: Math.round(hours * 100) / 100,
          hours_payroll: 0,
          diff_hours: hours,
          status: 'solo_asistencia'
        })
      }
    }

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Asistencia vs Nómina')
      sheet.columns = [
        { header: 'Código', key: 'emp_code', width: 12 },
        { header: 'Empleado', key: 'emp_name', width: 25 },
        { header: 'Departamento', key: 'department', width: 15 },
        { header: 'Horas Asistencia', key: 'hours_att', width: 14 },
        { header: 'Horas Nómina', key: 'hours_pay', width: 12 },
        { header: 'Diferencia', key: 'diff', width: 12 },
        { header: 'Estado', key: 'status', width: 14 }
      ]
      for (const r of rows) {
        sheet.addRow({
          emp_code: r.employee_code,
          emp_name: r.employee_name,
          department: r.department,
          hours_att: r.hours_attendance,
          hours_pay: r.hours_payroll,
          diff: r.diff_hours,
          status: r.status === 'ok' ? 'OK' : r.status === 'desfase' ? 'Desfase' : r.status === 'solo_nomina' ? 'Solo nómina' : 'Solo asistencia'
        })
      }
      sheet.getRow(1).font = { bold: true }
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

      const buffer = await workbook.xlsx.writeBuffer()
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename=${sanitizeFilename(`control_calidad_${periodo}_q${q}.xlsx`)}`)
      return res.send(Buffer.from(buffer))
    }

    const escape = (v: string | number) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const headers = ['Código', 'Empleado', 'Departamento', 'Horas Asistencia', 'Horas Nómina', 'Diferencia', 'Estado']
    let csv = headers.map(escape).join(',') + '\n'
    for (const r of rows) {
      const statusLabel = r.status === 'ok' ? 'OK' : r.status === 'desfase' ? 'Desfase' : r.status === 'solo_nomina' ? 'Solo nómina' : 'Solo asistencia'
      csv += [r.employee_code, r.employee_name, r.department, r.hours_attendance, r.hours_payroll, r.diff_hours, statusLabel].map(escape).join(',') + '\n'
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=${sanitizeFilename(`control_calidad_${periodo}_q${q}.csv`)}`)
    return res.send(csv)
  } catch (error) {
    console.error('Error reporte control calidad:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
