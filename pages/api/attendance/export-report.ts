import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { getHondurasTime } from '../../../lib/timezone'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 🔒 AUTENTICACIÓN REQUERIDA CON MISMOS PERMISOS QUE PAYROLL
    const authResult = await authenticateUser(req, res, ['can_view_reports', 'can_manage_attendance'])
    
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult
    const supabase = createClient(req, res)

    console.log('🔐 Usuario autenticado para reporte de asistencia:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    const { range, format, startDate, endDate } = req.body
    
    // Validaciones
    if (!format || !['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Formato inválido (debe ser pdf o csv)' })
    }
    
    if (!range || !['today', 'week', 'biweek', 'month'].includes(range)) {
      return res.status(400).json({ error: 'Rango inválido' })
    }

    console.log('📊 Generando reporte de asistencia:', {
      range,
      format,
      startDate,
      endDate,
      user: user.email
    })

    // Usar fechas específicas si se proporcionan, sino calcular según rango
    const dateFilter = startDate && endDate ? { startDate, endDate } : calculateDateRange(range)
    
    // Obtener datos del reporte
    const reportData = await generateAttendanceReportData(supabase, dateFilter, userProfile)

    if (format === 'pdf') {
      return generateAttendancePDFReport(res, reportData, dateFilter, range)
    } else {
      return generateAttendanceCSVReport(res, reportData, dateFilter, range)
    }

  } catch (error) {
    console.error('Error generando reporte de asistencia:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

function calculateDateRange(range: string) {
  const today = getHondurasTime()
  let startDate: Date
  let endDate = today

  switch (range) {
    case 'today':
      startDate = today
      break
    case 'week':
      const dayOfWeek = today.getDay()
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      startDate = new Date(today.setDate(diff))
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      break
    case 'biweek':
      const day = today.getDate()
      const startDay = day <= 15 ? 1 : 16
      startDate = new Date(today.getFullYear(), today.getMonth(), startDay)
      const endDay = day <= 15 ? 15 : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      endDate = new Date(today.getFullYear(), today.getMonth(), endDay)
      break
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      break
    default:
      startDate = today
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  }
}

async function generateAttendanceReportData(supabase: any, dateFilter: any, userProfile: any) {
  // Obtener empleados activos
  let employeesQuery = supabase
    .from('employees')
    .select('id, name, dni, department_id, status')
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
  const { data: attendanceRecords, error: attError } = await supabase
    .from('attendance_records')
    .select('employee_id, date, check_in, check_out, status')
    .gte('date', dateFilter.startDate)
    .lte('date', dateFilter.endDate)

  if (attError) {
    console.error('Error obteniendo registros de asistencia:', attError)
    throw new Error('Error obteniendo registros de asistencia')
  }

  // Calcular estadísticas
  const totalEmployees = employees?.length || 0
  const totalAttendance = attendanceRecords?.length || 0
  
  // Calcular estadísticas por día
  const dailyStats = calculateDailyStats(attendanceRecords, dateFilter)
  
  // Calcular estadísticas por empleado
  const employeeStats = employees?.map((emp: any) => {
    const empAttendance = attendanceRecords?.filter((att: any) => att.employee_id === emp.id) || []
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
      totalDays: presentDays + absentDays,
      attendanceRate: empAttendance.length > 0 ? (presentDays / empAttendance.length) * 100 : 0
    }
  }) || []

  return {
    employees: employees || [],
    attendance: attendanceRecords || [],
    dailyStats,
    employeeStats,
    totalEmployees,
    totalAttendance,
    dateFilter
  }
}

function calculateDailyStats(attendanceRecords: any[], dateFilter: any) {
  const stats: any[] = []
  const startDate = new Date(dateFilter.startDate)
  const endDate = new Date(dateFilter.endDate)
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const dayRecords = attendanceRecords.filter((att: any) => att.date === dateStr)
    const presentCount = dayRecords.filter((att: any) => att.status === 'present').length
    const totalCount = dayRecords.length
    
    stats.push({
      date: dateStr,
      attendanceCount: presentCount,
      totalCount,
      attendanceRate: totalCount > 0 ? (presentCount / totalCount) * 100 : 0
    })
  }
  
  return stats
}

function generateAttendancePDFReport(res: NextApiResponse, reportData: any, dateFilter: any, range: string) {
  try {
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ 
      size: 'A4', 
      layout: 'portrait', 
      margin: 30,
      info: {
        Title: `Reporte de Asistencia - ${range}`,
        Author: 'Sistema de Recursos Humanos',
        Subject: 'Reporte de Asistencia',
        Keywords: 'asistencia, reporte, recursos humanos',
        Creator: 'HR SaaS System'
      }
    })
    
    let buffers: Buffer[] = []

    doc.on('data', (chunk: Buffer) => buffers.push(chunk))
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=reporte_asistencia_${range}_${dateFilter.startDate}_${dateFilter.endDate}.pdf`)
      res.send(pdf)
    })

    // ===== PÁGINA 1: HEADER Y RESUMEN EJECUTIVO =====
    
    // Header con branding
    doc.rect(0, 0, 595, 80).fill('#1e40af')
    doc.fillColor('white')
    doc.fontSize(20).text('SISTEMA DE RECURSOS HUMANOS', 30, 20, { align: 'center', width: 535 })
    doc.fontSize(16).text('Reporte de Asistencia', 30, 45, { align: 'center', width: 535 })
    doc.fontSize(12).text(`${dateFilter.startDate} - ${dateFilter.endDate}`, 30, 65, { align: 'center', width: 535 })
    
    // Reset colors
    doc.fillColor('black')
    
    // Información del reporte
    doc.fontSize(10).text('INFORMACIÓN DEL REPORTE:', 30, 100)
    doc.fontSize(9).text(`Período: ${dateFilter.startDate} - ${dateFilter.endDate}`, 30, 115)
    doc.fontSize(9).text(`Tipo: Reporte de Asistencia - ${range}`, 30, 130)
    doc.fontSize(9).text(`Fecha de generación: ${getHondurasTime().toLocaleDateString('es-HN')}`, 30, 145)
    
    // Resumen ejecutivo
    doc.rect(30, 170, 535, 80).stroke()
    doc.fontSize(14).text('RESUMEN EJECUTIVO', 35, 180)
    
    doc.fontSize(10).text('Total Empleados:', 40, 200)
    doc.fontSize(10).text(reportData.totalEmployees.toString(), 200, 200)
    
    doc.fontSize(10).text('Total Registros:', 40, 215)
    doc.fontSize(10).text(reportData.totalAttendance.toString(), 200, 215)
    
    doc.fontSize(10).text('Promedio Asistencia:', 40, 230)
    const avgAttendance = reportData.employeeStats.length > 0 
      ? reportData.employeeStats.reduce((sum: number, stat: any) => sum + stat.attendanceRate, 0) / reportData.employeeStats.length 
      : 0
    doc.fontSize(10).text(`${avgAttendance.toFixed(1)}%`, 200, 230)
    
    // Mensaje si no hay datos
    if (reportData.totalAttendance === 0) {
      doc.fontSize(12).text('⚠️ NO HAY DATOS DE ASISTENCIA EN EL PERÍODO SELECCIONADO', 40, 250, { align: 'center', width: 455 })
      doc.fontSize(10).text('El período seleccionado no contiene registros de asistencia.', 40, 270, { align: 'center', width: 455 })
      doc.fontSize(10).text('Verifica las fechas o contacta al administrador del sistema.', 40, 285, { align: 'center', width: 455 })
    }
    
    // ===== PÁGINA 2: ESTADÍSTICAS POR EMPLEADO =====
    doc.addPage()
    
    doc.fontSize(14).text('ESTADÍSTICAS DE ASISTENCIA POR EMPLEADO', 30, 30, { align: 'center', width: 535 })
    
    // Tabla de estadísticas por empleado
    const headers = ['Empleado', 'Días Presente', 'Días Ausente', 'Días Tardío', 'Tasa %']
    const colWidths = [120, 80, 80, 80, 60]
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
    if (reportData.employeeStats.length === 0) {
      doc.fontSize(12).text('No hay empleados con registros de asistencia en el período seleccionado', 30, y + 20, { align: 'center', width: 535 })
    } else {
      reportData.employeeStats.forEach((stat: any) => {
        if (y > 750) {
          doc.addPage()
          y = 30
        }
        
        const values = [
          stat.employee.name,
          stat.presentDays.toString(),
          stat.absentDays.toString(),
          stat.lateDays.toString(),
          `${stat.attendanceRate.toFixed(1)}%`
        ]
        
        values.forEach((val: any, i: number) => {
          const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
          doc.rect(x, y, colWidths[i], rowHeight).stroke()
          doc.fontSize(7).text(val.toString(), x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
        })
        y += rowHeight
      })
    }
    
    // ===== PÁGINA 3: ESTADÍSTICAS DIARIAS =====
    doc.addPage()
    
    doc.fontSize(14).text('ESTADÍSTICAS DIARIAS', 30, 30, { align: 'center', width: 535 })
    
    // Tabla de estadísticas diarias
    const dailyHeaders = ['Fecha', 'Presentes', 'Total', 'Tasa %']
    const dailyColWidths = [80, 80, 80, 60]
    const dailyStartX = 30
    let dailyY = 70
    
    // Header tabla diaria
    dailyHeaders.forEach((h: string, i: number) => {
      const x = dailyStartX + dailyColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
      doc.rect(x, dailyY, dailyColWidths[i], rowHeight).fillAndStroke('#1e40af', '#000')
      doc.fillColor('white')
      doc.fontSize(8).text(h, x + 2, dailyY + 4, { width: dailyColWidths[i] - 4, align: 'center' })
      doc.fillColor('black')
    })
    dailyY += rowHeight
    
    // Datos diarios
    reportData.dailyStats.forEach((stat: any) => {
      if (dailyY > 750) {
        doc.addPage()
        dailyY = 30
      }
      
      const values = [
        new Date(stat.date).toLocaleDateString('es-HN'),
        stat.attendanceCount.toString(),
        stat.totalCount.toString(),
        `${stat.attendanceRate.toFixed(1)}%`
      ]
      
      values.forEach((val: any, i: number) => {
        const x = dailyStartX + dailyColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
        doc.rect(x, dailyY, dailyColWidths[i], rowHeight).stroke()
        doc.fontSize(7).text(val.toString(), x + 2, dailyY + 4, { width: dailyColWidths[i] - 4, align: 'center' })
      })
      dailyY += rowHeight
    })
    
    // Pie de página
    doc.fontSize(8).text('Documento generado automáticamente - Sistema de Recursos Humanos', 30, 800, { align: 'center', width: 535 })
    doc.fontSize(8).text(`Fecha de generación: ${getHondurasTime().toLocaleString('es-HN')}`, 30, 815, { align: 'center', width: 535 })

    doc.end()
  } catch (error) {
    console.error('Error generando PDF de asistencia:', error)
    throw error
  }
}

function generateAttendanceCSVReport(res: NextApiResponse, reportData: any, dateFilter: any, range: string) {
  try {
    let csvContent = ''
    
    // Header del reporte
    csvContent += 'REPORTE DE ASISTENCIA\n'
    csvContent += `Período: ${dateFilter.startDate} - ${dateFilter.endDate}\n`
    csvContent += `Tipo: ${range}\n`
    csvContent += `Fecha de generación: ${getHondurasTime().toLocaleDateString('es-HN')}\n\n`
    
    // Resumen ejecutivo
    csvContent += 'RESUMEN EJECUTIVO\n'
    csvContent += 'Métrica,Valor\n'
    csvContent += `Total Empleados,${reportData.totalEmployees}\n`
    csvContent += `Total Registros,${reportData.totalAttendance}\n`
    const avgAttendance = reportData.employeeStats.reduce((sum: number, stat: any) => sum + stat.attendanceRate, 0) / reportData.employeeStats.length
    csvContent += `Promedio Asistencia,${avgAttendance.toFixed(1)}%\n\n`
    
    // Estadísticas por empleado
    csvContent += 'ESTADÍSTICAS POR EMPLEADO\n'
    csvContent += 'Empleado,Días Presente,Días Ausente,Días Tardío,Tasa %\n'
    reportData.employeeStats.forEach((stat: any) => {
      csvContent += `"${stat.employee.name}",${stat.presentDays},${stat.absentDays},${stat.lateDays},${stat.attendanceRate.toFixed(1)}%\n`
    })
    csvContent += '\n'
    
    // Estadísticas diarias
    csvContent += 'ESTADÍSTICAS DIARIAS\n'
    csvContent += 'Fecha,Presentes,Total,Tasa %\n'
    reportData.dailyStats.forEach((stat: any) => {
      csvContent += `${new Date(stat.date).toLocaleDateString('es-HN')},${stat.attendanceCount},${stat.totalCount},${stat.attendanceRate.toFixed(1)}%\n`
    })
    
    // Configurar respuesta CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=reporte_asistencia_${range}_${dateFilter.startDate}_${dateFilter.endDate}.csv`)
    res.send(csvContent)
    
  } catch (error) {
    console.error('Error generando CSV de asistencia:', error)
    throw error
  }
} 