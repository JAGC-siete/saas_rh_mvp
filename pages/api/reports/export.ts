import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
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
    // 🔒 AUTENTICACIÓN REQUERIDA CON MISMOS PERMISOS QUE PAYROLL
    const authResult = await authenticateUser(req, res, ['can_view_reports', 'can_export_payroll'])
    
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult
    const supabase = createClient(req, res)

    console.log('🔐 Usuario autenticado para reportes:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    const { format, dateFilter, reportType } = req.body
    
    // Validaciones
    const allowedFormats = reportType === 'attendance' ? ['pdf', 'csv', 'excel'] : ['pdf', 'csv']
    if (!format || !allowedFormats.includes(format)) {
      return res.status(400).json({ error: `Formato inválido (permitidos: ${allowedFormats.join(', ')})` })
    }
    
    if (!dateFilter || !dateFilter.startDate || !dateFilter.endDate) {
      return res.status(400).json({ error: 'Filtro de fechas requerido' })
    }

    console.log('📊 Generando reporte:', {
      format,
      dateFilter,
      reportType,
      user: user.email
    })

    // Obtener datos del reporte
    const reportData = await generateReportData(supabase, dateFilter, userProfile)

    if (format === 'excel' && reportType === 'attendance') {
      return generateAttendanceExcel(res, reportData, dateFilter)
    }

    if (format === 'pdf') {
      return generatePDFReport(res, reportData, dateFilter)
    } else {
      return generateCSVReport(res, reportData, dateFilter)
    }

  } catch (error) {
    console.error('Error generando reporte:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export default withExportRateLimit()(handler)

async function generateReportData(supabase: any, dateFilter: any, userProfile: any): Promise<ReportData> {
  // Obtener empleados activos
  let employeesQuery = supabase
    .from('employees')
    .select('id, name, dni, base_salary, department_id, status, created_at')
    .eq('status', 'active')
    .order('name')

  // Si el usuario tiene company_id, filtrar por empresa (mismo patrón que payroll)
  if (userProfile?.company_id) {
    employeesQuery = employeesQuery.eq('company_id', userProfile.company_id)
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
  if (userProfile?.company_id) {
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

  if (userProfile?.company_id) {
    payrollQuery = payrollQuery.eq('company_id', userProfile.company_id)
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

function generatePDFReport(res: NextApiResponse, reportData: ReportData, dateFilter: any) {
  try {
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ 
      size: 'A4', 
      layout: 'portrait', 
      margin: 30,
      info: {
        Title: `Reporte General - ${dateFilter.startDate} a ${dateFilter.endDate}`,
        Author: 'Sistema de Recursos Humanos',
        Subject: 'Reporte de Estadísticas',
        Keywords: 'reporte, estadísticas, recursos humanos',
        Creator: 'HR SaaS System'
      }
    })
    
    let buffers: Buffer[] = []

    doc.on('data', (chunk: Buffer) => buffers.push(chunk))
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=reporte_${dateFilter.startDate}_${dateFilter.endDate}.pdf`)
      res.send(pdf)
    })

    // ===== PÁGINA 1: HEADER Y RESUMEN EJECUTIVO =====
    
    // Header con branding
    doc.rect(0, 0, 595, 80).fill('#1e40af')
    doc.fillColor('white')
    doc.fontSize(20).text('SISTEMA DE RECURSOS HUMANOS', 30, 20, { align: 'center', width: 535 })
    doc.fontSize(16).text('Reporte de Estadísticas', 30, 45, { align: 'center', width: 535 })
    doc.fontSize(12).text(`${dateFilter.startDate} - ${dateFilter.endDate}`, 30, 65, { align: 'center', width: 535 })
    
    // Reset colors
    doc.fillColor('black')
    
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
    doc.fontSize(10).text(`L. ${reportData.stats.totalPayroll.toFixed(2)}`, 200, 230)
    
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
        `L. ${(emp.base_salary || 0).toFixed(2)}`,
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
    
    // Pie de página
    doc.fontSize(8).text('Documento generado automáticamente - Sistema de Recursos Humanos', 30, 800, { align: 'center', width: 535 })
    doc.fontSize(8).text(`Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, 30, 815, { align: 'center', width: 535 })

    doc.end()
  } catch (error) {
    console.error('Error generando PDF:', error)
    throw error
  }
}

function generateCSVReport(res: NextApiResponse, reportData: ReportData, dateFilter: any) {
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
    csvContent += `Total Empleados,${reportData.stats.totalEmployees}\n`
    csvContent += `Registros de Asistencia,${reportData.stats.totalAttendance}\n`
    csvContent += `Nómina Total,L. ${reportData.stats.totalPayroll.toFixed(2)}\n`
    csvContent += `Promedio Asistencia,${reportData.stats.averageAttendance.toFixed(1)}\n`
    csvContent += `Empleados Tardíos,${reportData.stats.lateEmployees}\n`
    csvContent += `Empleados Ausentes,${reportData.stats.absentEmployees}\n\n`
    
    // Lista de empleados
    csvContent += 'LISTA DE EMPLEADOS\n'
    csvContent += 'Código,Nombre,Departamento,Salario Base,Estado\n'
    reportData.employees.forEach((emp: any) => {
      csvContent += `${emp.dni || emp.id},"${emp.name}",${emp.department_id || 'Sin Departamento'},L. ${(emp.base_salary || 0).toFixed(2)},${emp.status}\n`
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

async function generateAttendanceExcel(res: NextApiResponse, reportData: ReportData, dateFilter: any) {
  try {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Asistencia')

    sheet.columns = [
      { header: 'Empleado', key: 'employee', width: 25 },
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Entrada', key: 'check_in', width: 18 },
      { header: 'Salida', key: 'check_out', width: 18 },
      { header: 'Min Tardanza', key: 'late_minutes', width: 14 }
    ]

    const employeeById = new Map<string, any>()
    for (const emp of reportData.employees) {
      employeeById.set(emp.id, emp)
    }

    for (const r of reportData.attendance) {
      const emp = employeeById.get(r.employee_id)
      sheet.addRow({
        employee: emp?.name || r.employee_id,
        date: new Date(r.date + 'T00:00:00').toLocaleDateString('es-HN'),
        status: r.status,
        check_in: r.check_in ? new Date(r.check_in).toLocaleString('es-HN', { timeZone: 'America/Tegucigalpa' }) : '',
        check_out: r.check_out ? new Date(r.check_out).toLocaleString('es-HN', { timeZone: 'America/Tegucigalpa' }) : '',
        late_minutes: r.late_minutes || ''
      })
    }

    sheet.getRow(1).font = { bold: true }

    const buffer = await workbook.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=asistencia_${dateFilter.startDate}_${dateFilter.endDate}.xlsx`)
    res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('Error generando Excel de asistencia:', error)
    throw error
  }
}