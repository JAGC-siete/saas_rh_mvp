import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { getCompanyData } from '../../../lib/helpers/company-filter'
import { generateConsolidatedAttendancePDF, type AttendanceItem, type AttendanceSummary } from '../../../lib/attendance/report'
import ExcelJS from 'exceljs'
import { withInputValidation, createSecureErrorResponse } from '../../../lib/security/input-validation'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'
import { 
  withExportSecurity, 
  validateCompanyAccess, 
  buildSecureQuery, 
  validateContinuousAccess,
  secureLog,
  sanitizeFilename
} from '../../../lib/security/export-security'
import { formatTimeDisplay, formatDateOnlyForHonduras } from '../../../lib/timezone'
import { assertEmployeePortalEnabled } from '../../../lib/employee-portal/company-settings'
import { resolveReportConfig } from '../../../lib/reports/column-resolver'
import type { ResolvedReportConfig } from '../../../lib/reports/column-resolver'
import { renderAttendanceRows } from '../../../lib/reports/report-engine'
import { getStandardColumns } from '../../../lib/reports/standard-columns'
import { normalizeCountryCode } from '../../../lib/country/supported'
import { reportFormatForCountry } from '../../../lib/country/payroll-labels'

// Aplicar rate limiting, validación de entrada y seguridad de exportación
const handlerWithSecurity = withExportRateLimit()(
  withInputValidation(
    withExportSecurity(exportAttendanceHandler)
  )
)

export default handlerWithSecurity

async function exportAttendanceHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId, role, userProfile } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    let { startDate, endDate, formato, employee_id } = req.body
    const columnIdsInput = Array.isArray(req.body?.column_ids)
      ? req.body.column_ids.filter((x: unknown) => typeof x === 'string')
      : []
    const timeFormat =
      req.body?.time_format === '12h' || req.body?.time_format === '24h' ? (req.body.time_format as '12h' | '24h') : undefined
    const departmentId = typeof req.body?.department_id === 'string' ? req.body.department_id : undefined
    const employeeIdsInput = Array.isArray(req.body?.employee_ids)
      ? req.body.employee_ids.filter((x: unknown) => typeof x === 'string')
      : []

    if (role === 'employee') {
      if (!userProfile?.employee_id) {
        return res.status(403).json({
          error: 'Acceso denegado',
          message: 'Perfil de empleado no vinculado',
        })
      }
      if (!(await assertEmployeePortalEnabled(supabase, companyId, res))) {
        return
      }
      if (employee_id && employee_id !== userProfile.employee_id) {
        return res.status(403).json({
          error: 'Acceso denegado',
          message: 'Solo puede exportar su propia asistencia',
        })
      }
      employee_id = userProfile.employee_id
    }

    // Obtener empleados de la empresa usando getCompanyData
    const { data: employees, error: empError } = await getCompanyData(
      supabase,
      'employees',
      companyId,
      'id, name, employee_code',
      { status: 'active', ...(departmentId ? { department_id: departmentId } : {}) }
    )
    
    if (empError) {
      console.error('Error obteniendo empleados', { error: empError.message })
      return res.status(500).json({ error: 'Error obteniendo empleados' })
    }
    
    let employeeIds = (employees || []).map((e: any) => e.id)
    if (employeeIdsInput.length > 0) {
      const allow = new Set(employeeIdsInput)
      employeeIds = employeeIds.filter((id: string) => allow.has(id))
    }

    // Construir consulta de asistencia con filtros de seguridad
    let attendanceQuery = supabase
      .from('attendance_records')
      .select(`
        *,
        employees!attendance_records_employee_id_fkey(
          name,
          employee_code,
          department,
          role,
          company_id
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)

    // Aplicar filtro de empresa
    if (employeeIds.length > 0) {
      attendanceQuery = attendanceQuery.in('employee_id', employeeIds)
    } else {
      // Forzar vacío si no hay empleados para esa empresa
      attendanceQuery = attendanceQuery.eq('employee_id', '__none__')
    }

    // Filtrar por empleado específico si se proporciona
    if (employee_id) {
      // Verificar que el empleado pertenece a la empresa
      if (!employeeIds.includes(employee_id)) {
        return res.status(403).json({
          error: 'Acceso denegado',
          message: 'Empleado no pertenece a tu empresa'
        })
      }
      attendanceQuery = attendanceQuery.eq('employee_id', employee_id)
    }

    const { data: records, error } = await attendanceQuery
    if (error) {
      console.error('Error obteniendo registros de asistencia:', error)
      return res.status(500).json({ error: 'Error obteniendo registros de asistencia' })
    }

    const resolvedConfig = await resolveReportConfig(companyId, 'attendance', supabase)
    const standardCols = getStandardColumns('attendance')
    const colById = new Map(standardCols.map((c) => [c.id, c]))
    const selectedColumnIds = columnIdsInput.filter((id: string) => colById.has(id))
    const selectedColumns: ResolvedReportConfig['columns'] =
      selectedColumnIds.length > 0
        ? selectedColumnIds.map((id: string) => {
            const c = colById.get(id)!
            return { id: c.id, label: c.label, sourceField: c.sourceField, source: 'standard' as const }
          })
        : resolvedConfig.columns
    const { data: companyRow } = await supabase
      .from('companies')
      .select('name, country_code')
      .eq('id', companyId)
      .maybeSingle()
    const companyDisplayName = companyRow?.name
    const reportFmt = reportFormatForCountry(normalizeCountryCode(companyRow?.country_code))

    // 5. PROCESAR EXPORTACIÓN SEGURA
    if (formato === 'csv') {
      const csvHeaders = selectedColumns.map((c) => c.label)
      const csvRows = renderAttendanceRows(records || [], employees || [], selectedColumns, reportFmt, { timeFormat })
      const escapeCSV = (val: string | number) => {
        const s = String(val ?? '')
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`
        }
        return s
      }
      let csv = `Reporte de Asistencia\nPeríodo: ${startDate} - ${endDate}\n\n`
      csv += csvHeaders.map(escapeCSV).join(',') + '\n'
      for (const row of csvRows) {
        csv += row.map(escapeCSV).join(',') + '\n'
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      
      // NOMBRE DE ARCHIVO SEGURO (PREVIENE PATH TRAVERSAL)
      const safeFilename = sanitizeFilename(`attendance_${startDate}_${endDate}.csv`)
      res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
      
      return res.status(200).send(csv)
    }

    if (formato === 'excel') {
      return exportToExcel(
        records || [],
        employees || [],
        startDate,
        endDate,
        res,
        { ...resolvedConfig, columns: selectedColumns },
        reportFmt,
        timeFormat
      )
    }

    if (formato === 'pdf') {
      return exportToPDF(
        records || [],
        employees || [],
        startDate,
        endDate,
        res,
        { ...resolvedConfig, columns: selectedColumns },
        companyDisplayName,
        reportFmt,
        timeFormat
      )
    }

    // Formato no soportado
    return res.status(400).json({
      error: 'Formato no soportado',
      message: 'Use csv, excel o pdf'
    })

  } catch (error: any) {
    console.error('Error en exportación de asistencia:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({
      error: error.message || 'Internal server error'
    })
  }
}

function hoursWorkedForRecord(record: any): number {
  const checkIn = record.check_in ? new Date(record.check_in) : null
  const checkOut = record.check_out ? new Date(record.check_out) : null
  const lunchStart = record.lunch_start ? new Date(record.lunch_start) : null
  const lunchEnd = record.lunch_end ? new Date(record.lunch_end) : null
  if (!checkIn || !checkOut) return 0
  let totalMs = checkOut.getTime() - checkIn.getTime()
  if (lunchStart && lunchEnd) {
    totalMs -= lunchEnd.getTime() - lunchStart.getTime()
  }
  return totalMs / (1000 * 60 * 60)
}

async function exportToExcel(
  attendanceRecords: any[],
  employeesForReport: any[],
  startDate: string,
  endDate: string,
  res: NextApiResponse,
  resolvedConfig: ResolvedReportConfig,
  reportFmt: import('../../../lib/country/payroll-labels').ReportFormatContext,
  timeFormat?: '24h' | '12h'
) {
  try {
    const columns = resolvedConfig.columns.length
      ? resolvedConfig.columns
      : [
          { id: 'emp_code', label: 'Código', sourceField: 'employee_code', source: 'standard' as const },
          { id: 'emp_name', label: 'Empleado', sourceField: 'employee_name', source: 'standard' as const },
          { id: 'date', label: 'Fecha', sourceField: 'date', source: 'standard' as const },
          { id: 'status', label: 'Estado', sourceField: 'status', source: 'standard' as const },
          { id: 'check_in', label: 'Entrada', sourceField: 'check_in', source: 'standard' as const },
          { id: 'check_out', label: 'Salida', sourceField: 'check_out', source: 'standard' as const },
          { id: 'late_minutes', label: 'Min Tardanza', sourceField: 'late_minutes', source: 'standard' as const },
          { id: 'justification', label: 'Justificación', sourceField: 'justification', source: 'standard' as const }
        ]

    const rowMatrix = renderAttendanceRows(attendanceRecords, employeesForReport, columns, reportFmt, { timeFormat })

    const totalRecords = attendanceRecords.length
    let totalHours = 0
    let totalLateMinutes = 0
    let totalOvertime = 0
    let presentRecords = 0
    let lateRecords = 0
    let absentRecords = 0
    for (const r of attendanceRecords) {
      const h = hoursWorkedForRecord(r)
      totalHours += h
      totalLateMinutes += r.late_minutes ?? 0
      totalOvertime += Math.max(0, h - 8)
      if (r.status === 'present') presentRecords++
      else if (r.status === 'late') lateRecords++
      else if (r.status === 'absent') absentRecords++
    }

    const resumenData = [
      { Concepto: 'Total Registros', Valor: totalRecords },
      { Concepto: 'Total Horas Trabajadas', Valor: totalHours.toFixed(2) },
      { Concepto: 'Total Minutos de Tardanza', Valor: totalLateMinutes },
      { Concepto: 'Total Horas Extra', Valor: totalOvertime.toFixed(2) },
      { Concepto: 'Registros Presentes', Valor: presentRecords },
      { Concepto: 'Registros con Tardanza', Valor: lateRecords },
      { Concepto: 'Registros Ausentes', Valor: absentRecords },
      {
        Concepto: 'Tasa de Asistencia',
        Valor: totalRecords > 0 ? `${(((presentRecords + lateRecords) / totalRecords) * 100).toFixed(1)}%` : '0%'
      },
      {
        Concepto: 'Tasa de Puntualidad',
        Valor: totalRecords > 0 ? `${((presentRecords / totalRecords) * 100).toFixed(1)}%` : '0%'
      },
      {
        Concepto: 'Promedio Horas por Día',
        Valor: totalRecords > 0 ? (totalHours / totalRecords).toFixed(2) : '0'
      }
    ]

    // Crear workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Asistencia')
    
    worksheet.columns = columns.map((c, i) => ({
      header: c.label,
      key: `col_${i}`,
      width: Math.max(12, Math.min(c.label.length + 2, 30))
    }))

    for (const row of rowMatrix) {
      const rowObj: Record<string, unknown> = {}
      row.forEach((val, i) => {
        rowObj[`col_${i}`] = val
      })
      worksheet.addRow(rowObj)
    }

    // Estilo para el encabezado
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Crear hoja de resumen
    const summarySheet = workbook.addWorksheet('Resumen')
    summarySheet.columns = [
      { header: 'Concepto', key: 'Concepto', width: 25 },
      { header: 'Valor', key: 'Valor', width: 15 }
    ]

    resumenData.forEach((row) => {
      summarySheet.addRow(row)
    })

    summarySheet.getRow(1).font = { bold: true }
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    
    // NOMBRE DE ARCHIVO SEGURO (PREVIENE PATH TRAVERSAL)
    const safeFilename = sanitizeFilename(`asistencia_paragon_${startDate}_${endDate}.xlsx`)
    res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
    res.send(buffer)

  } catch (error) {
    return res.status(500).json(createSecureErrorResponse(error, 'generar Excel de asistencia'))
  }
}

async function exportToPDF(
  attendanceRecords: any[],
  employeesForReport: any[],
  startDate: string,
  endDate: string,
  res: NextApiResponse,
  resolvedConfig: ResolvedReportConfig,
  companyDisplayName?: string | null,
  reportFmt?: import('../../../lib/country/payroll-labels').ReportFormatContext,
  timeFormat?: '24h' | '12h'
) {
  try {
    // Preparar datos para PDF
    const attendanceData: AttendanceItem[] = attendanceRecords.map(record => {
      const checkIn = record.check_in ? new Date(record.check_in) : null
      const checkOut = record.check_out ? new Date(record.check_out) : null
      const lunchStart = record.lunch_start ? new Date(record.lunch_start) : null
      const lunchEnd = record.lunch_end ? new Date(record.lunch_end) : null

      let hoursWorked = 0
      if (checkIn && checkOut) {
        let totalMs = checkOut.getTime() - checkIn.getTime()
        if (lunchStart && lunchEnd) {
          totalMs -= lunchEnd.getTime() - lunchStart.getTime()
        }
        hoursWorked = totalMs / (1000 * 60 * 60)
      }

      // Usar late_minutes de attendance_records (calculado con work_schedule en webhook/register)
      const lateMinutes = record.late_minutes ?? 0

      // Calcular horas extra
      const overtimeHours = Math.max(0, hoursWorked - 8)

      return {
        id: record.id,
        employee_code: record.employees?.employee_code || '',
        name: record.employees?.name || '',
        department: record.employees?.department || 'Sin Departamento',
        position: record.employees?.role || 'Sin Posición',
        date: record.date,
        check_in: record.check_in,
        check_out: record.check_out,
        hours_worked: hoursWorked,
        status: record.status === 'present' ? 'present' : record.status === 'late' ? 'late' : 'absent',
        late_minutes: lateMinutes,
        overtime_hours: overtimeHours,
        notes: record.justification || ''
      }
    })

    // Calcular resumen
    const totalEmployees = new Set(attendanceData.map(item => item.employee_code)).size
    const totalDays = attendanceData.length
    const totalHoursWorked = attendanceData.reduce((sum, item) => sum + item.hours_worked, 0)
    const totalLateMinutes = attendanceData.reduce((sum, item) => sum + item.late_minutes, 0)
    const totalOvertimeHours = attendanceData.reduce((sum, item) => sum + item.overtime_hours, 0)
    const presentCount = attendanceData.filter(item => item.status === 'present').length
    const lateCount = attendanceData.filter(item => item.status === 'late').length

    const summary: AttendanceSummary = {
      total_employees: totalEmployees,
      total_days: totalDays,
      total_hours_worked: totalHoursWorked,
      total_late_minutes: totalLateMinutes,
      total_overtime_hours: totalOvertimeHours,
      attendance_rate: totalDays > 0 ? ((presentCount + lateCount) / totalDays) * 100 : 0,
      punctuality_rate: totalDays > 0 ? (presentCount / totalDays) * 100 : 0,
      average_hours_per_day: totalDays > 0 ? totalHoursWorked / totalDays : 0
    }

    const tableColumns = resolvedConfig.columns.length
      ? resolvedConfig.columns
      : [
          { id: 'emp_code', label: 'Código', sourceField: 'employee_code', source: 'standard' as const },
          { id: 'emp_name', label: 'Empleado', sourceField: 'employee_name', source: 'standard' as const },
          { id: 'date', label: 'Fecha', sourceField: 'date', source: 'standard' as const },
          { id: 'check_in', label: 'Entrada', sourceField: 'check_in', source: 'standard' as const },
          { id: 'check_out', label: 'Salida', sourceField: 'check_out', source: 'standard' as const },
          { id: 'hours_worked', label: 'Horas', sourceField: 'hours_worked', source: 'standard' as const },
          { id: 'status', label: 'Estado', sourceField: 'status', source: 'standard' as const },
          { id: 'late_minutes', label: 'Min Tardanza', sourceField: 'late_minutes', source: 'standard' as const }
        ]

    const detailRows = renderAttendanceRows(
      attendanceRecords,
      employeesForReport,
      tableColumns,
      reportFmt,
      { timeFormat }
    )
    const detailHeaders = tableColumns.map((c) => c.label)
    const primaryColor = resolvedConfig.branding?.primaryColor

    console.log(`Generando PDF de asistencia: ${attendanceData.length} registros para ${startDate} a ${endDate}`)
    const pdfBuffer = await generateConsolidatedAttendancePDF(
      attendanceData,
      summary,
      startDate,
      endDate,
      undefined,
      {
        companyDisplayName: companyDisplayName ?? undefined,
        primaryColor: primaryColor ?? undefined,
        detailTable: { headers: detailHeaders, rows: detailRows }
      }
    )
    
    res.setHeader('Content-Type', 'application/pdf')
    
    // NOMBRE DE ARCHIVO SEGURO (PREVIENE PATH TRAVERSAL)
    const safeFilename = sanitizeFilename(`asistencia_paragon_${startDate}_${endDate}.pdf`)
    res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
    res.send(pdfBuffer)

  } catch (error) {
    return res.status(500).json(createSecureErrorResponse(error, 'generar PDF de asistencia'))
  }
}


