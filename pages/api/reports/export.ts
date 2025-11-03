import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { formatDateForHonduras, nowInHonduras, formatDateTimeForHonduras } from '../../../lib/timezone'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'
import ExcelJS from 'exceljs'

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

  try {
    // Autenticación usando el mismo método que payroll
    const { supabase, companyId, role, user, userProfile } = await requireCompanyAccess(req, res)
    
    // Verificar permisos (solo admins y HR managers pueden generar reportes)
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
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

    const { format, dateFilter, reportType } = req.body
    
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

    // Route to appropriate exporter
    if (format === 'excel') {
      if (reportType === 'attendance') {
        return generateAttendanceExcel(res, reportData, dateFilter)
      } else if (reportType === 'payroll') {
        return generatePayrollExcel(res, reportData, dateFilter)
      } else if (reportType === 'employees') {
        return generateEmployeesExcel(res, reportData)
      } else {
        return res.status(400).json({ error: 'Excel no disponible para este tipo de reporte' })
      }
    }

    if (format === 'pdf') {
      if (reportType === 'attendance') {
        return generateAttendancePDF(res, reportData, dateFilter, company?.name)
      } else if (reportType === 'payroll') {
        return generatePayrollPDF(res, reportData, dateFilter, company?.name)
      } else if (reportType === 'employees') {
        return generateEmployeesPDF(res, reportData, company?.name)
      } else {
        return generatePDFReport(res, reportData, dateFilter, company?.name)
      }
    } else {
      return generateCSVReport(res, reportData, dateFilter, reportType)
    }

  } catch (error) {
    console.error('Error generando reporte:', error)
    // Solo enviar error JSON si no se han enviado headers aún
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido'
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

function generateCSVReport(res: NextApiResponse, reportData: ReportData, dateFilter: any, reportType?: string) {
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
    const formatHNL = (n: number) => `L. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
  if (empError) throw new Error('Error obteniendo empleados')

  // Obtener registros de asistencia
  let attendanceQuery = supabase
    .from('attendance_records')
    .select('*, employees!inner(id, name, employee_code, company_id)')
    .gte('date', dateFilter.startDate)
    .lte('date', dateFilter.endDate)

  if (companyId) {
    attendanceQuery = attendanceQuery.eq('employees.company_id', companyId)
  }

  const { data: attendance, error: attError } = await attendanceQuery
  if (attError) throw new Error('Error obteniendo asistencia')

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

async function generateAttendanceExcel(res: NextApiResponse, reportData: any, dateFilter: any) {
  try {
    const workbook = new ExcelJS.Workbook()
    
    // Hoja 1: Registros de Asistencia
    const sheet = workbook.addWorksheet('Asistencia')
    sheet.columns = [
      { header: 'Código', key: 'code', width: 12 },
      { header: 'Empleado', key: 'employee', width: 25 },
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Entrada', key: 'check_in', width: 18 },
      { header: 'Salida', key: 'check_out', width: 18 },
      { header: 'Min Tardanza', key: 'late_minutes', width: 14 },
      { header: 'Justificación', key: 'justification', width: 30 }
    ]

    const employeeById = new Map<string, any>()
    for (const emp of reportData.employees) {
      employeeById.set(emp.id, emp)
    }

    for (const r of reportData.attendance) {
      const emp = r.employees || employeeById.get(r.employee_id)
      sheet.addRow({
        code: emp?.employee_code || '',
        employee: emp?.name || r.employee_id,
        date: new Date(r.date + 'T00:00:00').toLocaleDateString('es-HN'),
        status: r.status || '',
        check_in: r.check_in ? new Date(r.check_in).toLocaleString('es-HN', { timeZone: 'America/Tegucigalpa' }) : '',
        check_out: r.check_out ? new Date(r.check_out).toLocaleString('es-HN', { timeZone: 'America/Tegucigalpa' }) : '',
        late_minutes: r.late_minutes || 0,
        justification: r.justification || ''
      })
    }

    // Estilo del encabezado
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Hoja 2: Resumen
    const summarySheet = workbook.addWorksheet('Resumen')
    summarySheet.columns = [
      { header: 'Empleado', key: 'employee', width: 25 },
      { header: 'Días Presente', key: 'present', width: 15 },
      { header: 'Días Ausente', key: 'absent', width: 15 },
      { header: 'Días Tarde', key: 'late', width: 15 },
      { header: 'Total Registros', key: 'total', width: 15 }
    ]

    const summary = new Map<string, any>()
    for (const r of reportData.attendance) {
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

async function generatePayrollExcel(res: NextApiResponse, reportData: any, dateFilter: any) {
  try {
    const workbook = new ExcelJS.Workbook()
    
    // Hoja 1: Nómina Detallada
    const sheet = workbook.addWorksheet('Nómina')
    sheet.columns = [
      { header: 'Código', key: 'code', width: 12 },
      { header: 'Empleado', key: 'employee', width: 25 },
      { header: 'Departamento', key: 'department', width: 20 },
      { header: 'Período Inicio', key: 'period_start', width: 14 },
      { header: 'Período Fin', key: 'period_end', width: 14 },
      { header: 'Salario Base', key: 'base_salary', width: 15 },
      { header: 'Días Trabajados', key: 'days_worked', width: 15 },
      { header: 'Salario Bruto', key: 'gross_salary', width: 15 },
      { header: 'ISR', key: 'income_tax', width: 12 },
      { header: 'IHSS', key: 'social_security', width: 12 },
      { header: 'RAP', key: 'professional_tax', width: 12 },
      { header: 'Total Deducciones', key: 'total_deductions', width: 15 },
      { header: 'Salario Neto', key: 'net_salary', width: 15 },
      { header: 'Estado', key: 'status', width: 12 }
    ]

    for (const record of reportData.payroll) {
      const emp = record.employees || {}
      sheet.addRow({
        code: emp.employee_code || '',
        employee: emp.name || '',
        department: emp.departments?.name || 'Sin Departamento',
        period_start: new Date(record.period_start).toLocaleDateString('es-HN'),
        period_end: new Date(record.period_end).toLocaleDateString('es-HN'),
        base_salary: record.base_salary || 0,
        days_worked: record.days_worked || 0,
        gross_salary: record.gross_salary || 0,
        income_tax: record.income_tax || 0,
        social_security: record.social_security || 0,
        professional_tax: record.professional_tax || 0,
        total_deductions: record.total_deductions || 0,
        net_salary: record.net_salary || 0,
        status: record.status || ''
      })
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

async function generateEmployeesExcel(res: NextApiResponse, reportData: any) {
  try {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Empleados')

    sheet.columns = [
      { header: 'Código', key: 'code', width: 12 },
      { header: 'DNI', key: 'dni', width: 15 },
      { header: 'Nombre', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Teléfono', key: 'phone', width: 15 },
      { header: 'Departamento', key: 'department', width: 20 },
      { header: 'Rol', key: 'role', width: 15 },
      { header: 'Salario Base', key: 'salary', width: 15 },
      { header: 'Fecha Ingreso', key: 'hire_date', width: 14 },
      { header: 'Estado', key: 'status', width: 12 }
    ]

    const formatHNL = (n: number) => `L. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    for (const emp of reportData.employees) {
      sheet.addRow({
        code: emp.employee_code || '',
        dni: emp.dni || '',
        name: emp.name || '',
        email: emp.email || '',
        phone: emp.phone || '',
        department: emp.departments?.name || 'Sin Departamento',
        role: emp.role || '',
        salary: formatHNL(emp.base_salary || 0),
        hire_date: emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('es-HN') : '',
        status: emp.status || ''
      })
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

async function generateAttendancePDF(res: NextApiResponse, reportData: any, dateFilter: any, companyName?: string) {
  // Por ahora usar el PDF genérico, se puede mejorar después
  return generatePDFReport(res, { 
    employees: reportData.employees,
    attendance: reportData.attendance,
    payroll: [],
    stats: {
      totalEmployees: reportData.employees.length,
      totalAttendance: reportData.attendance.length,
      totalPayroll: 0,
      averageAttendance: 0,
      lateEmployees: 0,
      absentEmployees: 0
    }
  }, dateFilter, companyName)
}

async function generatePayrollPDF(res: NextApiResponse, reportData: any, dateFilter: any, companyName?: string) {
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