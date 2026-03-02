import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { formatDateForHonduras, nowInHonduras, formatDateTimeForHonduras } from '../../../lib/timezone'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'
import ExcelJS from 'exceljs'
import { resolveReportConfig } from '../../../lib/reports/column-resolver'
import type { ResolvedReportConfig } from '../../../lib/reports/column-resolver'
import { getHeaders, renderAttendanceRows, renderPayrollRows, renderEmployeesRows } from '../../../lib/reports/report-engine'

interface ReportData {
  employees: any[]
  attendance: any[]
  payroll: any[]
  stats: {
    totalEmployees: number
    totalAttendance: number
    totalPayroll: number
    averageAttendance: number
    lateEmployees: number
    absentEmployees: number
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let user: any = null
  let reportType: string | undefined
  let format: string | undefined
  let dateFilter: any

  try {
    // Autenticación usando el mismo método que payroll
    const authResult = await requireCompanyAccess(req, res)
    const { supabase, companyId, role, user: authUser, userProfile } = authResult
    user = authUser

    // Verificar permisos: rol permitido O permiso can_export_reports en JSON
    const allowedRoles = ['super_admin', 'company_admin', 'hr_manager', 'manager']
    const rawPerms = typeof userProfile?.permissions === 'string'
      ? (() => { try { return JSON.parse(userProfile.permissions) } catch { return {} } })()
      : (userProfile?.permissions || {})
    const hasExportPermission = rawPerms.can_export_reports === true

    if (!allowedRoles.includes(role) && !hasExportPermission) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para generar reportes'
      })
    }

    console.log('🔐 Usuario autenticado para reportes:', { 
      userId: user.id, 
      role: role,
      companyId: companyId 
    })

    const body = req.body
    format = body.format
    dateFilter = body.dateFilter
    reportType = body.reportType
    
    // Validaciones
    if (!reportType || !['attendance', 'payroll', 'employees'].includes(reportType)) {
      return res.status(400).json({ error: 'Tipo de reporte inválido (permitidos: attendance, payroll, employees)' })
    }
    
    const allowedFormats = ['pdf', 'csv', 'excel']
    if (!format || !allowedFormats.includes(format)) {
      return res.status(400).json({ error: `Formato inválido (permitidos: ${allowedFormats.join(', ')})` })
    }
    
    // Validar fechas solo para reportes que las requieren
    if (reportType !== 'employees' && (!dateFilter || !dateFilter.startDate || !dateFilter.endDate)) {
      return res.status(400).json({ error: 'Filtro de fechas requerido para este tipo de reporte' })
    }

    console.log('📊 Generando reporte:', {
      format,
      dateFilter,
      reportType,
      user: user.email
    })

    // Obtener datos del reporte según tipo
    let reportData: any
    
    // Obtener nombre de la empresa para branding del PDF
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()
    
    if (reportType === 'attendance') {
      reportData = await generateAttendanceReportData(supabase, dateFilter, companyId)
    } else if (reportType === 'payroll') {
      reportData = await generatePayrollReportData(supabase, dateFilter, companyId)
    } else if (reportType === 'employees') {
      reportData = await generateEmployeesReportData(supabase, companyId)
    } else {
      // General report (backward compatibility)
      reportData = await generateReportData(supabase, dateFilter, companyId)
    }
    
    // Agregar nombre de empresa a reportData para usar en PDFs
    if (company) {
      reportData.companyName = company.name
    }

    // Resolve metadata-driven report config (columns, branding)
    const resolvedConfig = await resolveReportConfig(
      companyId!,
      reportType as 'attendance' | 'payroll' | 'employees',
      supabase,
      body.config_id
    )

    // Route to appropriate exporter
    if (format === 'excel') {
      if (reportType === 'attendance') {
        return generateAttendanceExcel(res, reportData, dateFilter, resolvedConfig)
      } else if (reportType === 'payroll') {
        return generatePayrollExcel(res, reportData, dateFilter, resolvedConfig)
      } else if (reportType === 'employees') {
        return generateEmployeesExcel(res, reportData, resolvedConfig)
      } else {
        return res.status(400).json({ error: 'Excel no disponible para este tipo de reporte' })
      }
    }

    if (format === 'pdf') {
      if (reportType === 'attendance') {
        return generateAttendancePDF(res, reportData, dateFilter, company?.name, resolvedConfig)
      } else if (reportType === 'payroll') {
        return generatePayrollPDF(res, reportData, dateFilter, company?.name)
      } else if (reportType === 'employees') {
        return generateEmployeesPDF(res, reportData, company?.name)
      } else {
        return generatePDFReport(res, reportData, dateFilter, company?.name)
      }
    } else {
      return generateCSVReport(res, reportData, dateFilter, reportType, resolvedConfig)
    }

  } catch (error) {
    console.error('Error generando reporte:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      user: user?.email || 'unknown',
      reportType: reportType || 'unknown',
      format: format || 'unknown',
      dateFilter: dateFilter || 'none'
    })
    // Solo enviar error JSON si no se han enviado headers aún
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      })
    }
  }
}

export default withExportRateLimit()(handler)

async function generateReportData(supabase: any, dateFilter: any, companyId: string | null): Promise<ReportData> {
  // Obtener empleados activos
  let employeesQuery = supabase
    .from('employees')
    .select('id, name, dni, base_salary, department_id, status, created_at')
    .eq('status', 'active')
    .order('name')

  // Filtrar por empresa (mismo patrón que payroll)
  if (companyId) {
    employeesQuery = employeesQuery.eq('company_id', companyId)
  }

  const { data: employees, error: empError } = await employeesQuery

  if (empError) {
    console.error('Error obteniendo empleados:', empError)
    throw new Error('Error obteniendo empleados')
  }

  // Obtener registros de asistencia del período
  let attendanceQuery = supabase
    .from('attendance_records')
    .select('employee_id, date, check_in, check_out, status')
    .gte('date', dateFilter.startDate)
    .lte('date', dateFilter.endDate)

  // attendance_records puede no tener company_id; filtrar por empleados de la compañía
  if (companyId) {
    const employeeIds = (employees || []).map((e: any) => e.id)
    if (employeeIds.length > 0) {
      attendanceQuery = attendanceQuery.in('employee_id', employeeIds)
    } else {
      attendanceQuery = attendanceQuery.eq('employee_id', '__none__')
    }
  }

  const { data: attendanceRecords, error: attError } = await attendanceQuery

  if (attError) {
    console.error('Error obteniendo registros de asistencia:', attError)
    throw new Error('Error obteniendo registros de asistencia')
  }

  // Obtener registros de nómina del período, filtrados por empresa si aplica
  let payrollQuery = supabase
    .from('payroll_records')
    .select('*')
    .gte('period_start', dateFilter.startDate)
    .lte('period_end', dateFilter.endDate)

  if (companyId) {
    payrollQuery = payrollQuery.eq('company_id', companyId)
  }

  const { data: payrollRecords, error: payrollError } = await payrollQuery

  if (payrollError) {
    console.error('Error obteniendo registros de nómina:', payrollError)
    // No lanzar error, continuar sin datos de nómina
  }

  // Calcular estadísticas
  const totalEmployees = employees?.length || 0
  const totalAttendance = attendanceRecords?.length || 0
  const totalPayroll = payrollRecords?.reduce((sum: number, record: any) => sum + (record.net_salary || 0), 0) || 0
  // Promedio de asistencia normalizado por día del período
  const daysInRange = Math.max(1, Math.ceil((new Date(dateFilter.endDate).getTime() - new Date(dateFilter.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
  const expectedAttendances = totalEmployees * daysInRange
  const averageAttendance = expectedAttendances > 0 ? (totalAttendance / expectedAttendances) * 100 : 0

  // Calcular empleados tardíos y ausentes
  const lateEmployees = new Set(
    attendanceRecords
      ?.filter((record: any) => {
        if (!record.check_in) return false
        // TODO: Update to use employee's actual work schedule instead of hard-coded 8:15
        // For now, using late_minutes field from attendance_records if available
        if (record.late_minutes !== undefined) {
          return record.late_minutes > 5
        }
        // Fallback to hard-coded logic (should be replaced with dynamic schedule lookup)
        const checkInTime = new Date(record.check_in)
        const hour = checkInTime.getHours()
        const minutes = checkInTime.getMinutes()
        return hour > 8 || (hour === 8 && minutes > 15)
      })
      .map((record: any) => record.employee_id) || []
  ).size

  const absentEmployees = new Set(
    attendanceRecords
      ?.filter((record: any) => record.status === 'absent')
      .map((record: any) => record.employee_id) || []
  ).size

  return {
    employees: employees || [],
    attendance: attendanceRecords || [],
    payroll: payrollRecords || [],
    stats: {
      totalEmployees,
      totalAttendance,
      totalPayroll,
      averageAttendance,
      lateEmployees,
      absentEmployees
    }
  }
}

function generatePDFReport(res: NextApiResponse, reportData: ReportData, dateFilter: any, companyName?: string) {
  try {
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ 
      size: 'A4', 
      layout: 'portrait', 
      margin: 30,
      info: {
        Title: `Reporte General - ${dateFilter.startDate} a ${dateFilter.endDate}`,
        Author: 'Sistema Hondureño de Recursos Humanos',
        Subject: 'Reporte de Estadísticas',
        Keywords: 'reporte, estadísticas, recursos humanos',
        Creator: 'HR SaaS System'
      }
    })
    
    const formatHNL = (n: number) => `L. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    
    let buffers: Buffer[] = []

    doc.on('data', (chunk: Buffer) => buffers.push(chunk))
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=reporte_${dateFilter.startDate}_${dateFilter.endDate}.pdf`)
      res.send(pdf)
    })

    // ===== PÁGINA 1: HEADER Y RESUMEN EJECUTIVO =====
    const pageWidth = doc.page.width
    
    // Header con branding consistente
    doc.rect(0, 0, pageWidth, 80).fill('#0b4fa1')
    doc.fillColor('white')
    doc.fontSize(18).text((companyName || 'SISTEMA HONDUREÑO DE RECURSOS HUMANOS').toUpperCase(), 30, 20, { align: 'center', width: pageWidth - 60 })
    doc.fontSize(14).text('Reporte de Estadísticas', 30, 44, { align: 'center', width: pageWidth - 60 })
    doc.fontSize(12).text(`${dateFilter.startDate} - ${dateFilter.endDate}`, 30, 64, { align: 'center', width: pageWidth - 60 })
    
    // Reset colors
    doc.fillColor('#0f172a')
    
    // Información del reporte
    doc.fontSize(10).text('INFORMACIÓN DEL REPORTE:', 30, 100)
    doc.fontSize(9).text(`Período: ${dateFilter.startDate} - ${dateFilter.endDate}`, 30, 115)
    doc.fontSize(9).text(`Fecha de generación: ${formatDateForHonduras(nowInHonduras())}`, 30, 130)
    doc.fontSize(9).text(`Tipo: Reporte General de Estadísticas`, 30, 145)
    
    // Resumen ejecutivo
    doc.rect(30, 170, 535, 100).stroke()
    doc.fontSize(14).text('RESUMEN EJECUTIVO', 35, 180)
    
    doc.fontSize(10).text('Total Empleados:', 40, 200)
    doc.fontSize(10).text(reportData.stats.totalEmployees.toString(), 200, 200)
    
    doc.fontSize(10).text('Registros de Asistencia:', 40, 215)
    doc.fontSize(10).text(reportData.stats.totalAttendance.toString(), 200, 215)
    
    doc.fontSize(10).text('Nómina Total:', 40, 230)
    doc.fontSize(10).text(formatHNL(reportData.stats.totalPayroll), 200, 230)
    
    doc.fontSize(10).text('Promedio Asistencia:', 40, 245)
    doc.fontSize(10).text(reportData.stats.averageAttendance.toFixed(1), 200, 245)
    
    doc.fontSize(10).text('Empleados Tardíos:', 40, 260)
    doc.fontSize(10).text(reportData.stats.lateEmployees.toString(), 200, 260)
    
    doc.fontSize(10).text('Empleados Ausentes:', 40, 275)
    doc.fontSize(10).text(reportData.stats.absentEmployees.toString(), 200, 275)
    
    // ===== PÁGINA 2: DETALLE DE EMPLEADOS =====
    doc.addPage()
    
    doc.fontSize(14).text('DETALLE DE EMPLEADOS', 30, 30, { align: 'center', width: 535 })
    
    // Tabla de empleados
    const headers = ['Código', 'Nombre', 'Departamento', 'Salario Base', 'Estado']
    const colWidths = [60, 150, 100, 80, 60]
    const startX = 30
    let y = 70
    const rowHeight = 15
    
    // Header de tabla
    headers.forEach((h: string, i: number) => {
      const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
      doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#1e40af', '#000')
      doc.fillColor('white')
      doc.fontSize(8).text(h, x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
      doc.fillColor('black')
    })
    y += rowHeight
    
    // Datos de empleados
    reportData.employees.forEach((emp: any) => {
      if (y > 750) {
        doc.addPage()
        y = 30
      }
      
      const values = [
        emp.dni || emp.id,
        emp.name,
        emp.department_id || 'Sin Departamento',
        formatHNL(emp.base_salary || 0),
        emp.status
      ]
      
      values.forEach((val: any, i: number) => {
        const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
        doc.rect(x, y, colWidths[i], rowHeight).stroke()
        doc.fontSize(7).text(val.toString(), x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
      })
      y += rowHeight
    })
    
    // ===== PÁGINA 3: ESTADÍSTICAS DE ASISTENCIA =====
    doc.addPage()
    
    doc.fontSize(14).text('ESTADÍSTICAS DE ASISTENCIA', 30, 30, { align: 'center', width: 535 })
    
    // Resumen de asistencia por empleado
    const attendanceSummary = reportData.employees.map((emp: any) => {
      const empAttendance = reportData.attendance.filter((att: any) => att.employee_id === emp.id)
      const presentDays = empAttendance.filter((att: any) => att.status === 'present').length
      const absentDays = empAttendance.filter((att: any) => att.status === 'absent').length
      const lateDays = empAttendance.filter((att: any) => {
        if (!att.check_in) return false
        // TODO: Update to use employee's actual work schedule instead of hard-coded 8:15
        // For now, using late_minutes field from attendance_records if available
        if (att.late_minutes !== undefined) {
          return att.late_minutes > 5
        }
        // Fallback to hard-coded logic (should be replaced with dynamic schedule lookup)
        const checkInTime = new Date(att.check_in)
        const hour = checkInTime.getHours()
        const minutes = checkInTime.getMinutes()
        return hour > 8 || (hour === 8 && minutes > 15)
      }).length
      
      return {
        employee: emp,
        presentDays,
        absentDays,
        lateDays,
        totalDays: presentDays + absentDays
      }
    })
    
    // Tabla de resumen de asistencia
    const attHeaders = ['Empleado', 'Días Presente', 'Días Ausente', 'Días Tardío', 'Total']
    const attColWidths = [120, 80, 80, 80, 60]
    const attStartX = 30
    let attY = 70
    
    // Header tabla asistencia
    attHeaders.forEach((h: string, i: number) => {
      const x = attStartX + attColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
      doc.rect(x, attY, attColWidths[i], rowHeight).fillAndStroke('#1e40af', '#000')
      doc.fillColor('white')
      doc.fontSize(8).text(h, x + 2, attY + 4, { width: attColWidths[i] - 4, align: 'center' })
      doc.fillColor('black')
    })
    attY += rowHeight
    
    // Datos de asistencia
    attendanceSummary.forEach((summary: any) => {
      if (attY > 750) {
        doc.addPage()
        attY = 30
      }
      
      const values = [
        summary.employee.name,
        summary.presentDays.toString(),
        summary.absentDays.toString(),
        summary.lateDays.toString(),
        summary.totalDays.toString()
      ]
      
      values.forEach((val: any, i: number) => {
        const x = attStartX + attColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
        doc.rect(x, attY, attColWidths[i], rowHeight).stroke()
        doc.fontSize(7).text(val.toString(), x + 2, attY + 4, { width: attColWidths[i] - 4, align: 'center' })
      })
      attY += rowHeight
    })
    
    // Footer SISU
    doc.fontSize(8).fillColor('#64748b').text('SISU: Sistema Hondureño de Recursos Humanos', 30, doc.page.height - 30, { align: 'center', width: pageWidth - 60 })
    doc.fontSize(8).text(`Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, 30, doc.page.height - 15, { align: 'center', width: pageWidth - 60 })

    doc.end()
  } catch (error) {
    console.error('Error generando PDF:', error)
    throw error
  }
}

function generateCSVReport(
  res: NextApiResponse,
  reportData: ReportData,
  dateFilter: any,
  _reportType?: string,
  _resolvedConfig?: ResolvedReportConfig
) {
  try {
    // Generar CSV con múltiples secciones
    let csvContent = ''
    
    // Header del reporte
    csvContent += 'REPORTE DE ESTADÍSTICAS\n'
    csvContent += `Período: ${dateFilter.startDate} - ${dateFilter.endDate}\n`
    csvContent += `Fecha de generación: ${formatDateForHonduras(nowInHonduras())}\n\n`
    
    // Resumen ejecutivo
    csvContent += 'RESUMEN EJECUTIVO\n'
    csvContent += 'Métrica,Valor\n'
    const formatHNL = (n: number) => `L. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    csvContent += `Total Empleados,${reportData.stats.totalEmployees}\n`
    csvContent += `Registros de Asistencia,${reportData.stats.totalAttendance}\n`
    csvContent += `Nómina Total,${formatHNL(reportData.stats.totalPayroll)}\n`
    csvContent += `Promedio Asistencia,${reportData.stats.averageAttendance.toFixed(1)}\n`
    csvContent += `Empleados Tardíos,${reportData.stats.lateEmployees}\n`
    csvContent += `Empleados Ausentes,${reportData.stats.absentEmployees}\n\n`
    
    // Lista de empleados
    csvContent += 'LISTA DE EMPLEADOS\n'
    csvContent += 'Código,Nombre,Departamento,Salario Base,Estado\n'
    reportData.employees.forEach((emp: any) => {
      csvContent += `${emp.dni || emp.id},"${emp.name}",${emp.department_id || 'Sin Departamento'},${formatHNL(emp.base_salary || 0)},${emp.status}\n`
    })
    csvContent += '\n'
    
    // Estadísticas de asistencia
    csvContent += 'ESTADÍSTICAS DE ASISTENCIA\n'
    csvContent += 'Empleado,Días Presente,Días Ausente,Días Tardío,Total\n'
    
    const attendanceSummary = reportData.employees.map((emp: any) => {
      const empAttendance = reportData.attendance.filter((att: any) => att.employee_id === emp.id)
      const presentDays = empAttendance.filter((att: any) => att.status === 'present').length
      const absentDays = empAttendance.filter((att: any) => att.status === 'absent').length
      const lateDays = empAttendance.filter((att: any) => {
        if (!att.check_in) return false
        // TODO: Update to use employee's actual work schedule instead of hard-coded 8:15
        // For now, using late_minutes field from attendance_records if available
        if (att.late_minutes !== undefined) {
          return att.late_minutes > 5
        }
        // Fallback to hard-coded logic (should be replaced with dynamic schedule lookup)
        const checkInTime = new Date(att.check_in)
        const hour = checkInTime.getHours()
        const minutes = checkInTime.getMinutes()
        return hour > 8 || (hour === 8 && minutes > 15)
      }).length
      
      return {
        employee: emp,
        presentDays,
        absentDays,
        lateDays,
        totalDays: presentDays + absentDays
      }
    })
    
    attendanceSummary.forEach((summary: any) => {
      csvContent += `"${summary.employee.name}",${summary.presentDays},${summary.absentDays},${summary.lateDays},${summary.totalDays}\n`
    })
    
    // Configurar respuesta CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=reporte_${dateFilter.startDate}_${dateFilter.endDate}.csv`)
    res.send(csvContent)
    
  } catch (error) {
    console.error('Error generando CSV:', error)
    throw error
  }
} 

// ===== FUNCIONES PARA OBTENER DATOS ESPECÍFICOS =====

async function generateAttendanceReportData(supabase: any, dateFilter: any, companyId: string | null) {
  // Obtener empleados
  let employeesQuery = supabase
    .from('employees')
    .select('id, name, dni, employee_code, department_id, departments:department_id(name), status')
    .eq('status', 'active')
    .order('name')

  if (companyId) {
    employeesQuery = employeesQuery.eq('company_id', companyId)
  }

  const { data: employees, error: empError } = await employeesQuery
  if (empError) {
    console.error('Error obteniendo empleados:', empError)
    throw new Error(`Error obteniendo empleados: ${empError.message}`)
  }

  // Obtener IDs de empleados para filtrar asistencia
  const employeeIds = (employees || []).map((e: any) => e.id)

  // Obtener registros de asistencia con filtro por employee_ids de la empresa
  let attendanceQuery = supabase
    .from('attendance_records')
    .select(`
      *,
      employees!attendance_records_employee_id_fkey(
        id,
        name,
        employee_code,
        company_id
      )
    `)
    .gte('date', dateFilter.startDate)
    .lte('date', dateFilter.endDate)

  // Filtrar por employee_ids de la empresa (más seguro que usar !inner join)
  if (companyId && employeeIds.length > 0) {
    attendanceQuery = attendanceQuery.in('employee_id', employeeIds)
  } else if (companyId && employeeIds.length === 0) {
    // Si no hay empleados para la empresa, devolver array vacío
    attendanceQuery = attendanceQuery.eq('employee_id', '__none__')
  }

  const { data: attendance, error: attError } = await attendanceQuery
  if (attError) {
    console.error('Error obteniendo registros de asistencia:', attError)
    throw new Error(`Error obteniendo asistencia: ${attError.message}`)
  }

  return { employees: employees || [], attendance: attendance || [], dateFilter }
}

async function generatePayrollReportData(supabase: any, dateFilter: any, companyId: string | null) {
  // Obtener registros de nómina con relación a empleados
  let payrollQuery = supabase
    .from('payroll_records')
    .select(`
      *,
      employees!inner(
        id,
        name,
        employee_code,
        dni,
        department_id,
        departments:department_id(name),
        company_id
      )
    `)
    .gte('period_start', dateFilter.startDate)
    .lte('period_end', dateFilter.endDate)

  if (companyId) {
    payrollQuery = payrollQuery.eq('employees.company_id', companyId)
  }

  const { data: payroll, error: payrollError } = await payrollQuery
  if (payrollError) throw new Error('Error obteniendo nómina')

  return { payroll: payroll || [], dateFilter }
}

async function generateEmployeesReportData(supabase: any, companyId: string | null) {
  let employeesQuery = supabase
    .from('employees')
    .select(`
      id,
      name,
      dni,
      employee_code,
      email,
      phone,
      role,
      base_salary,
      hire_date,
      status,
      department_id,
      departments:department_id(name),
      company_id
    `)
    .order('name')

  if (companyId) {
    employeesQuery = employeesQuery.eq('company_id', companyId)
  }

  const { data: employees, error: empError } = await employeesQuery
  if (empError) {
    console.error('Error obteniendo empleados:', empError)
    throw new Error(`Error obteniendo empleados: ${empError.message}`)
  }

  return { employees: employees || [] }
}

// ===== GENERADORES DE EXCEL =====

async function generateAttendanceExcel(
  res: NextApiResponse,
  reportData: any,
  dateFilter: any,
  resolvedConfig?: ResolvedReportConfig
) {
  try {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Asistencia')

    const columns = resolvedConfig?.columns ?? [
      { id: 'emp_code', label: 'Código', sourceField: 'employee_code', source: 'standard' as const },
      { id: 'emp_name', label: 'Empleado', sourceField: 'employee_name', source: 'standard' as const },
      { id: 'date', label: 'Fecha', sourceField: 'date', source: 'standard' as const },
      { id: 'status', label: 'Estado', sourceField: 'status', source: 'standard' as const },
      { id: 'check_in', label: 'Entrada', sourceField: 'check_in', source: 'standard' as const },
      { id: 'check_out', label: 'Salida', sourceField: 'check_out', source: 'standard' as const },
      { id: 'late_minutes', label: 'Min Tardanza', sourceField: 'late_minutes', source: 'standard' as const },
      { id: 'justification', label: 'Justificación', sourceField: 'justification', source: 'standard' as const }
    ]

    sheet.columns = columns.map((c, i) => ({
      header: c.label,
      key: `col_${i}`,
      width: Math.max(12, Math.min(c.label.length + 2, 30))
    }))

    const rows = renderAttendanceRows(
      reportData.attendance || [],
      reportData.employees || [],
      columns
    )
    for (const row of rows) {
      const rowObj: Record<string, unknown> = {}
      row.forEach((val, i) => { rowObj[`col_${i}`] = val })
      sheet.addRow(rowObj)
    }

    // Estilo del encabezado
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Hoja 2: Resumen
    const employeeById = new Map<string, any>()
    for (const emp of reportData.employees || []) {
      employeeById.set(emp.id, emp)
    }
    const summarySheet = workbook.addWorksheet('Resumen')
    summarySheet.columns = [
      { header: 'Empleado', key: 'employee', width: 25 },
      { header: 'Días Presente', key: 'present', width: 15 },
      { header: 'Días Ausente', key: 'absent', width: 15 },
      { header: 'Días Tarde', key: 'late', width: 15 },
      { header: 'Total Registros', key: 'total', width: 15 }
    ]

    const summary = new Map<string, any>()
    for (const r of reportData.attendance || []) {
      const emp = r.employees || employeeById.get(r.employee_id)
      const empName = emp?.name || r.employee_id
      
      if (!summary.has(empName)) {
        summary.set(empName, { employee: empName, present: 0, absent: 0, late: 0, total: 0 })
      }
      
      const s = summary.get(empName)
      s.total++
      if (r.status === 'present') s.present++
      if (r.status === 'absent') s.absent++
      if (r.late_minutes && r.late_minutes > 5) s.late++
    }

    summary.forEach(s => summarySheet.addRow(s))
    
    summarySheet.getRow(1).font = { bold: true }
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=asistencia_${dateFilter.startDate}_${dateFilter.endDate}.xlsx`)
    res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('Error generando Excel de asistencia:', error)
    throw error
  }
}

async function generatePayrollExcel(
  res: NextApiResponse,
  reportData: any,
  dateFilter: any,
  resolvedConfig?: ResolvedReportConfig
) {
  try {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Nómina')

    const columns = resolvedConfig?.columns ?? [
      { id: 'emp_code', label: 'Código', sourceField: 'employee_code', source: 'standard' as const },
      { id: 'emp_name', label: 'Empleado', sourceField: 'employee_name', source: 'standard' as const },
      { id: 'period', label: 'Período', sourceField: 'period', source: 'standard' as const },
      { id: 'gross_salary', label: 'Salario Bruto', sourceField: 'gross_salary', source: 'standard' as const },
      { id: 'total_deductions', label: 'Total Deducciones', sourceField: 'total_deductions', source: 'standard' as const },
      { id: 'net_salary', label: 'Salario Neto', sourceField: 'net_salary', source: 'standard' as const },
      { id: 'status', label: 'Estado', sourceField: 'status', source: 'standard' as const }
    ]

    const employees = (reportData.payroll || []).map((r: any) => r.employees).filter(Boolean)
    sheet.columns = columns.map((c, i) => ({
      header: c.label,
      key: `col_${i}`,
      width: Math.max(12, Math.min(c.label.length + 2, 25))
    }))

    const rows = renderPayrollRows(
      reportData.payroll || [],
      employees,
      columns
    )
    for (const row of rows) {
      const rowObj: Record<string, unknown> = {}
      row.forEach((val, i) => { rowObj[`col_${i}`] = val })
      sheet.addRow(rowObj)
    }

    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Hoja 2: Resumen
    const summarySheet = workbook.addWorksheet('Resumen')
    summarySheet.columns = [
      { header: 'Concepto', key: 'concept', width: 25 },
      { header: 'Valor', key: 'value', width: 15 }
    ]

    const formatHNL = (n: number) => `L. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const totalBruto = reportData.payroll.reduce((sum: number, r: any) => sum + (r.gross_salary || 0), 0)
    const totalDeducciones = reportData.payroll.reduce((sum: number, r: any) => sum + (r.total_deductions || 0), 0)
    const totalNeto = reportData.payroll.reduce((sum: number, r: any) => sum + (r.net_salary || 0), 0)
    const totalEmpleados = reportData.payroll.length

    summarySheet.addRow({ concept: 'Total Empleados', value: totalEmpleados })
    summarySheet.addRow({ concept: 'Total Salario Bruto', value: formatHNL(totalBruto) })
    summarySheet.addRow({ concept: 'Total Deducciones', value: formatHNL(totalDeducciones) })
    summarySheet.addRow({ concept: 'Total Salario Neto', value: formatHNL(totalNeto) })
    summarySheet.addRow({ concept: 'Promedio Salario Neto', value: formatHNL(totalNeto / totalEmpleados) })

    summarySheet.getRow(1).font = { bold: true }
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=nomina_${dateFilter.startDate}_${dateFilter.endDate}.xlsx`)
    res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('Error generando Excel de nómina:', error)
    throw error
  }
}

async function generateEmployeesExcel(
  res: NextApiResponse,
  reportData: any,
  resolvedConfig?: ResolvedReportConfig
) {
  try {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Empleados')

    const columns = resolvedConfig?.columns ?? [
      { id: 'emp_code', label: 'Código', sourceField: 'employee_code', source: 'standard' as const },
      { id: 'name', label: 'Nombre', sourceField: 'name', source: 'standard' as const },
      { id: 'position', label: 'Cargo', sourceField: 'position', source: 'standard' as const },
      { id: 'department', label: 'Departamento', sourceField: 'department_name', source: 'standard' as const },
      { id: 'status', label: 'Estado', sourceField: 'status', source: 'standard' as const },
      { id: 'hire_date', label: 'Fecha Ingreso', sourceField: 'hire_date', source: 'standard' as const }
    ]

    sheet.columns = columns.map((c, i) => ({
      header: c.label,
      key: `col_${i}`,
      width: Math.max(12, Math.min(c.label.length + 2, 25))
    }))

    const rows = renderEmployeesRows(reportData.employees || [], columns)
    for (const row of rows) {
      const rowObj: Record<string, unknown> = {}
      row.forEach((val, i) => { rowObj[`col_${i}`] = val })
      sheet.addRow(rowObj)
    }

    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=empleados_${new Date().toISOString().split('T')[0]}.xlsx`)
    res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('Error generando Excel de empleados:', error)
    throw error
  }
}

// ===== GENERADORES DE PDF =====

async function generateAttendancePDF(
  res: NextApiResponse,
  reportData: any,
  dateFilter: any,
  companyName?: string,
  resolvedConfig?: ResolvedReportConfig
) {
  try {
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ 
      size: 'A4', 
      layout: 'portrait', 
      margin: 30,
      info: {
        Title: `Reporte de Asistencia - ${dateFilter.startDate} a ${dateFilter.endDate}`,
        Author: 'Sistema de Recursos Humanos',
        Subject: 'Reporte de Asistencia',
        Keywords: 'asistencia, reporte, recursos humanos',
        Creator: 'HR SaaS System'
      }
    })
    
    const pageWidth = doc.page.width
    const pageHeight = doc.page.height
    const primaryColor = resolvedConfig?.branding?.primaryColor ?? '#1e40af'
    
    // Colores consistentes (branding from config)
    const colors = {
      primary: primaryColor,
      primaryDark: primaryColor,
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      muted: '#64748b',
      lightGray: '#f1f5f9',
      borderGray: '#e2e8f0'
    }
    
    let buffers: Buffer[] = []
    doc.on('data', (chunk: Buffer) => buffers.push(chunk))
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=asistencia_${dateFilter.startDate}_${dateFilter.endDate}.pdf`)
      res.send(pdf)
    })

    // ===== PÁGINA 1: HEADER Y RESUMEN EJECUTIVO =====
    
    // Header mejorado con gradiente visual
    doc.rect(0, 0, pageWidth, 100).fill(colors.primary)
    doc.fillColor('white')
    doc.fontSize(24).font('Helvetica-Bold').text(
      (companyName || 'SISTEMA DE RECURSOS HUMANOS').toUpperCase(), 
      30, 25, 
      { align: 'center', width: pageWidth - 60 }
    )
    doc.fontSize(16).font('Helvetica').text(
      'Reporte de Asistencia', 
      30, 55, 
      { align: 'center', width: pageWidth - 60 }
    )
    doc.fontSize(12).text(
      `${dateFilter.startDate} - ${dateFilter.endDate}`, 
      30, 80, 
      { align: 'center', width: pageWidth - 60 }
    )
    
    doc.fillColor('#0f172a')
    
    // Información del reporte en caja destacada
    const infoBoxY = 120
    doc.roundedRect(30, infoBoxY, pageWidth - 60, 50, 5).fill(colors.lightGray).stroke(colors.borderGray)
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('INFORMACIÓN DEL REPORTE', 40, infoBoxY + 8)
    doc.fontSize(9).font('Helvetica').fillColor('#0f172a')
    doc.text(`Período: ${dateFilter.startDate} - ${dateFilter.endDate}`, 40, infoBoxY + 22)
    doc.text(`Fecha de generación: ${formatDateForHonduras(nowInHonduras())}`, 40, infoBoxY + 35)
    
    // Calcular estadísticas mejoradas
    const attendanceRecords = reportData.attendance || []
    const employees = reportData.employees || []
    const totalRecords = attendanceRecords.length
    const presentRecords = attendanceRecords.filter((r: any) => r.status === 'present').length
    const lateRecords = attendanceRecords.filter((r: any) => r.status === 'late').length
    const absentRecords = attendanceRecords.filter((r: any) => r.status === 'absent').length
    const attendanceRate = totalRecords > 0 ? ((presentRecords + lateRecords) / totalRecords * 100) : 0
    const punctualityRate = totalRecords > 0 ? (presentRecords / totalRecords * 100) : 0
    
    // KPIs mejorados con diseño visual
    const kpiY = 190
    const kpiWidth = (pageWidth - 90) / 4
    const kpiHeight = 80
    
    // KPI 1: Total Registros
    doc.roundedRect(30, kpiY, kpiWidth, kpiHeight, 8)
      .fill(colors.primary).stroke(colors.primaryDark)
    doc.fillColor('white')
    doc.fontSize(9).font('Helvetica').text('TOTAL REGISTROS', 35, kpiY + 10, { width: kpiWidth - 10, align: 'center' })
    doc.fontSize(28).font('Helvetica-Bold').text(totalRecords.toString(), 35, kpiY + 25, { width: kpiWidth - 10, align: 'center' })
    
    // KPI 2: Presentes
    doc.roundedRect(30 + kpiWidth + 10, kpiY, kpiWidth, kpiHeight, 8)
      .fill(colors.success).stroke('#047857')
    doc.fillColor('white')
    doc.fontSize(9).font('Helvetica').text('PRESENTES', 35 + kpiWidth + 10, kpiY + 10, { width: kpiWidth - 10, align: 'center' })
    doc.fontSize(28).font('Helvetica-Bold').text(presentRecords.toString(), 35 + kpiWidth + 10, kpiY + 25, { width: kpiWidth - 10, align: 'center' })
    
    // KPI 3: Ausentes
    doc.roundedRect(30 + (kpiWidth + 10) * 2, kpiY, kpiWidth, kpiHeight, 8)
      .fill(colors.danger).stroke('#b91c1c')
    doc.fillColor('white')
    doc.fontSize(9).font('Helvetica').text('AUSENTES', 35 + (kpiWidth + 10) * 2, kpiY + 10, { width: kpiWidth - 10, align: 'center' })
    doc.fontSize(28).font('Helvetica-Bold').text(absentRecords.toString(), 35 + (kpiWidth + 10) * 2, kpiY + 25, { width: kpiWidth - 10, align: 'center' })
    
    // KPI 4: Tardes
    doc.roundedRect(30 + (kpiWidth + 10) * 3, kpiY, kpiWidth, kpiHeight, 8)
      .fill(colors.warning).stroke('#b45309')
    doc.fillColor('white')
    doc.fontSize(9).font('Helvetica').text('TARDES', 35 + (kpiWidth + 10) * 3, kpiY + 10, { width: kpiWidth - 10, align: 'center' })
    doc.fontSize(28).font('Helvetica-Bold').text(lateRecords.toString(), 35 + (kpiWidth + 10) * 3, kpiY + 25, { width: kpiWidth - 10, align: 'center' })
    
    // Métricas adicionales
    doc.fillColor('#0f172a')
    const metricsY = kpiY + kpiHeight + 20
    doc.roundedRect(30, metricsY, pageWidth - 60, 60, 8).fill(colors.lightGray).stroke(colors.borderGray)
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#475569').text('MÉTRICAS DE RENDIMIENTO', 40, metricsY + 8)
    
    const metricColWidth = (pageWidth - 100) / 2
    doc.fontSize(9).font('Helvetica').fillColor('#0f172a')
    doc.text(`Tasa de Asistencia:`, 40, metricsY + 25)
    doc.font('Helvetica-Bold').fillColor(colors.success).text(`${attendanceRate.toFixed(1)}%`, 150, metricsY + 25)
    
    doc.font('Helvetica').fillColor('#0f172a')
    doc.text(`Tasa de Puntualidad:`, 40, metricsY + 40)
    doc.font('Helvetica-Bold').fillColor(colors.success).text(`${punctualityRate.toFixed(1)}%`, 150, metricsY + 40)
    
    doc.text(`Total Empleados:`, 40 + metricColWidth, metricsY + 25)
    doc.font('Helvetica-Bold').fillColor(colors.primary).text(`${employees.length}`, 40 + metricColWidth + 100, metricsY + 25)
    
    doc.font('Helvetica').fillColor('#0f172a')
    doc.text(`Promedio por Empleado:`, 40 + metricColWidth, metricsY + 40)
    const avgPerEmployee = employees.length > 0 ? (totalRecords / employees.length).toFixed(1) : '0'
    doc.font('Helvetica-Bold').fillColor(colors.primary).text(`${avgPerEmployee} días`, 40 + metricColWidth + 100, metricsY + 40)

    // ===== PÁGINA 2: TABLA DE ASISTENCIA =====
    doc.addPage()
    
    doc.fontSize(16).font('Helvetica-Bold').fillColor(colors.primary).text(
      'DETALLE DE REGISTROS DE ASISTENCIA', 
      30, 30, 
      { align: 'center', width: pageWidth - 60 }
    )
    
    // Tabla: usar columnas resueltas o defaults
    const tableColumns = resolvedConfig?.columns ?? [
      { id: 'emp_code', label: 'Código', sourceField: 'employee_code', source: 'standard' as const },
      { id: 'emp_name', label: 'Empleado', sourceField: 'employee_name', source: 'standard' as const },
      { id: 'date', label: 'Fecha', sourceField: 'date', source: 'standard' as const },
      { id: 'status', label: 'Estado', sourceField: 'status', source: 'standard' as const },
      { id: 'check_in', label: 'Entrada', sourceField: 'check_in', source: 'standard' as const },
      { id: 'check_out', label: 'Salida', sourceField: 'check_out', source: 'standard' as const },
      { id: 'late_minutes', label: 'Tardanza', sourceField: 'late_minutes', source: 'standard' as const }
    ]
    const headers = tableColumns.map((c) => c.label)
    const baseWidth = 50
    const colWidths = headers.map(() => baseWidth)
    const startX = 30
    let y = 70
    const rowHeight = 18
    
    // Header de tabla mejorado
    headers.forEach((h: string, i: number) => {
      const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
      doc.roundedRect(x, y, colWidths[i], rowHeight, 2)
        .fill(colors.primary)
        .stroke(colors.primaryDark)
      doc.fillColor('white')
      doc.fontSize(8).font('Helvetica-Bold').text(
        h, 
        x + 3, 
        y + 6, 
        { width: colWidths[i] - 6, align: 'center' }
      )
    })
    y += rowHeight
    
    // Datos de asistencia usando columnas resueltas
    const attRows = renderAttendanceRows(attendanceRecords, employees, tableColumns)
    let rowIndex = 0
    for (const rowValues of attRows) {
      if (y > pageHeight - 60) {
        doc.addPage()
        y = 30
        headers.forEach((h: string, i: number) => {
          const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
          doc.roundedRect(x, y, colWidths[i], rowHeight, 2)
            .fill(colors.primary)
            .stroke(colors.primaryDark)
          doc.fillColor('white')
          doc.fontSize(8).font('Helvetica-Bold').text(
            h, x + 3, y + 6, { width: colWidths[i] - 6, align: 'center' }
          )
        })
        y += rowHeight
      }
      const isEven = rowIndex % 2 === 0
      rowValues.forEach((val, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
        if (isEven) doc.rect(x, y, colWidths[i], rowHeight).fill(colors.lightGray)
        doc.rect(x, y, colWidths[i], rowHeight).stroke(colors.borderGray)
        doc.fillColor('#0f172a').fontSize(7).font('Helvetica')
        doc.text(String(val ?? ''), x + 3, y + 5, { width: colWidths[i] - 6, align: 'center' })
      })
      y += rowHeight
      rowIndex++
    }
    
    // Footer mejorado
    doc.fillColor(colors.muted)
    doc.fontSize(8).font('Helvetica')
    doc.text(
      'Sistema de Recursos Humanos - Documento generado automáticamente', 
      30, 
      pageHeight - 40, 
      { align: 'center', width: pageWidth - 60 }
    )
    doc.text(
      `Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, 
      30, 
      pageHeight - 25, 
      { align: 'center', width: pageWidth - 60 }
    )

    doc.end()
  } catch (error) {
    console.error('Error generando PDF de asistencia:', error)
    throw error
  }
}

async function generatePayrollPDF(res: NextApiResponse, _reportData: any, _dateFilter: any, _companyName?: string) {
  // Implementar PDF específico para nómina si se necesita
  return res.status(400).json({ error: 'PDF de nómina use /api/payroll/report' })
}

async function generateEmployeesPDF(res: NextApiResponse, reportData: any, companyName?: string) {
  // Implementar PDF específico para empleados si se necesita
  return generatePDFReport(res, { 
    employees: reportData.employees,
    attendance: [],
    payroll: [],
    stats: {
      totalEmployees: reportData.employees.length,
      totalAttendance: 0,
      totalPayroll: 0,
      averageAttendance: 0,
      lateEmployees: 0,
      absentEmployees: 0
    }
  }, { startDate: '', endDate: '' }, companyName)
}