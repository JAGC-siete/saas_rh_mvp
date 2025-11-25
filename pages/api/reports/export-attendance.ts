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

// Aplicar rate limiting, validación de entrada y seguridad de exportación
const handlerWithSecurity = withExportRateLimit()(
  withInputValidation(
    withExportSecurity(exportAttendanceHandler)
  )
)

export default handlerWithSecurity

async function exportAttendanceHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const { startDate, endDate, formato, employee_id } = req.body

    // Obtener empleados de la empresa usando getCompanyData
    const { data: employees, error: empError } = await getCompanyData(
      supabase,
      'employees',
      companyId,
      'id',
      { status: 'active' }
    )
    
    if (empError) {
      console.error('Error obteniendo empleados', { error: empError.message })
      return res.status(500).json({ error: 'Error obteniendo empleados' })
    }
    
    const employeeIds = (employees || []).map((e: any) => e.id)

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

    // 5. PROCESAR EXPORTACIÓN SEGURA
    if (formato === 'csv') {
      const headers = ['employee_id','date','status','check_in','check_out','late_minutes']
      const csvRows = [headers.join(',')]
      for (const r of (records || [])) {
        // Formatear fechas correctamente para Honduras
        const formattedDate = new Date(r.date + 'T00:00:00').toLocaleDateString('es-HN')
        const formattedCheckIn = r.check_in ? new Date(r.check_in).toLocaleString('es-HN', { timeZone: 'America/Tegucigalpa' }) : ''
        const formattedCheckOut = r.check_out ? new Date(r.check_out).toLocaleString('es-HN', { timeZone: 'America/Tegucigalpa' }) : ''
        
        const row = [r.employee_id, formattedDate, r.status, formattedCheckIn, formattedCheckOut, r.late_minutes || 0]
        csvRows.push(row.join(','))
      }
      const csv = csvRows.join('\n')
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      
      // NOMBRE DE ARCHIVO SEGURO (PREVIENE PATH TRAVERSAL)
      const safeFilename = sanitizeFilename(`attendance_${startDate}_${endDate}.csv`)
      res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
      
      return res.status(200).send(csv)
    }

    if (formato === 'excel') {
      return exportToExcel(records || [], startDate, endDate, res)
    }

    if (formato === 'pdf') {
      return exportToPDF(records || [], startDate, endDate, res)
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

async function exportToExcel(attendanceRecords: any[], startDate: string, endDate: string, res: NextApiResponse) {
  try {
    // Preparar datos para Excel
    const excelData = attendanceRecords.map(record => {
      const checkIn = record.check_in ? new Date(record.check_in) : null
      const checkOut = record.check_out ? new Date(record.check_out) : null
      
      // Calcular horas trabajadas
      let hoursWorked = 0
      if (checkIn && checkOut) {
        const diffMs = checkOut.getTime() - checkIn.getTime()
        hoursWorked = diffMs / (1000 * 60 * 60) // Convertir a horas
      }

      // Calcular tardanza (asumiendo horario de 8:00 AM)
      let lateMinutes = 0
      if (checkIn) {
        const expectedTime = new Date(checkIn)
        expectedTime.setHours(8, 0, 0, 0) // 8:00 AM
        if (checkIn > expectedTime) {
          lateMinutes = Math.floor((checkIn.getTime() - expectedTime.getTime()) / (1000 * 60))
        }
      }

      // Calcular horas extra (asumiendo 8 horas por día)
      const overtimeHours = Math.max(0, hoursWorked - 8)

      return {
        'Código': record.employees?.employee_code || '',
        'Nombre': record.employees?.name || '',
        'Departamento': record.employees?.department || '',
        'Posición': record.employees?.role || '',
        'Fecha': new Date(record.date).toLocaleDateString('es-HN'),
        'Día de la Semana': new Date(record.date).toLocaleDateString('es-HN', { weekday: 'long' }),
        'Hora de Entrada': checkIn ? checkIn.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        'Hora de Salida': checkOut ? checkOut.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        'Horas Trabajadas': hoursWorked.toFixed(2),
        'Estado': record.status === 'present' ? 'Presente' : record.status === 'late' ? 'Tardanza' : 'Ausente',
        'Minutos de Tardanza': lateMinutes,
        'Horas Extra': overtimeHours.toFixed(2),
        'Justificación': record.justification || '',
        'Categoría Justificación': record.justification_category || '',
        'Ubicación': record.location ? `${record.lat}, ${record.lon}` : 'N/A',
        'Dispositivo': record.device_id || 'N/A',
        'Registrado': new Date(record.created_at).toLocaleDateString('es-HN')
      }
    })

    // Calcular resumen
    const totalRecords = excelData.length
    const totalHours = excelData.reduce((sum, row) => sum + parseFloat(row['Horas Trabajadas']), 0)
    const totalLateMinutes = excelData.reduce((sum, row) => sum + row['Minutos de Tardanza'], 0)
    const totalOvertime = excelData.reduce((sum, row) => sum + parseFloat(row['Horas Extra']), 0)
    const presentRecords = excelData.filter(r => r['Estado'] === 'Presente').length
    const lateRecords = excelData.filter(r => r['Estado'] === 'Tardanza').length
    const absentRecords = excelData.filter(r => r['Estado'] === 'Ausente').length

    const resumenData = [
      { 'Concepto': 'Total Registros', 'Valor': totalRecords },
      { 'Concepto': 'Total Horas Trabajadas', 'Valor': totalHours.toFixed(2) },
      { 'Concepto': 'Total Minutos de Tardanza', 'Valor': totalLateMinutes },
      { 'Concepto': 'Total Horas Extra', 'Valor': totalOvertime.toFixed(2) },
      { 'Concepto': 'Registros Presentes', 'Valor': presentRecords },
      { 'Concepto': 'Registros con Tardanza', 'Valor': lateRecords },
      { 'Concepto': 'Registros Ausentes', 'Valor': absentRecords },
      { 'Concepto': 'Tasa de Asistencia', 'Valor': `${((presentRecords + lateRecords) / totalRecords * 100).toFixed(1)}%` },
      { 'Concepto': 'Tasa de Puntualidad', 'Valor': `${(presentRecords / totalRecords * 100).toFixed(1)}%` },
      { 'Concepto': 'Promedio Horas por Día', 'Valor': (totalHours / totalRecords).toFixed(2) }
    ]

    // Crear workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Asistencia')
    
    // Agregar datos a la hoja principal
    worksheet.columns = [
      { header: 'Código', key: 'Código', width: 12 },
      { header: 'Nombre', key: 'Nombre', width: 25 },
      { header: 'Departamento', key: 'Departamento', width: 15 },
      { header: 'Posición', key: 'Posición', width: 20 },
      { header: 'Fecha', key: 'Fecha', width: 12 },
      { header: 'Día de la Semana', key: 'Día de la Semana', width: 15 },
      { header: 'Hora de Entrada', key: 'Hora de Entrada', width: 12 },
      { header: 'Hora de Salida', key: 'Hora de Salida', width: 12 },
      { header: 'Horas Trabajadas', key: 'Horas Trabajadas', width: 12 },
      { header: 'Estado', key: 'Estado', width: 10 },
      { header: 'Minutos de Tardanza', key: 'Minutos de Tardanza', width: 15 },
      { header: 'Horas Extra', key: 'Horas Extra', width: 12 },
      { header: 'Justificación', key: 'Justificación', width: 30 },
      { header: 'Categoría Justificación', key: 'Categoría Justificación', width: 20 },
      { header: 'Ubicación', key: 'Ubicación', width: 20 },
      { header: 'Dispositivo', key: 'Dispositivo', width: 15 },
      { header: 'Registrado', key: 'Registrado', width: 12 }
    ]

    // Agregar datos
    excelData.forEach(row => {
      worksheet.addRow(row)
    })

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

    resumenData.forEach(row => {
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

async function exportToPDF(attendanceRecords: any[], startDate: string, endDate: string, res: NextApiResponse) {
  try {
    // Preparar datos para PDF
    const attendanceData: AttendanceItem[] = attendanceRecords.map(record => {
      const checkIn = record.check_in ? new Date(record.check_in) : null
      const checkOut = record.check_out ? new Date(record.check_out) : null
      
      // Calcular horas trabajadas
      let hoursWorked = 0
      if (checkIn && checkOut) {
        const diffMs = checkOut.getTime() - checkIn.getTime()
        hoursWorked = diffMs / (1000 * 60 * 60)
      }

      // Calcular tardanza
      let lateMinutes = 0
      if (checkIn) {
        const expectedTime = new Date(checkIn)
        expectedTime.setHours(8, 0, 0, 0)
        if (checkIn > expectedTime) {
          lateMinutes = Math.floor((checkIn.getTime() - expectedTime.getTime()) / (1000 * 60))
        }
      }

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

    console.log(`Generando PDF de asistencia: ${attendanceData.length} registros para ${startDate} a ${endDate}`)
    const pdfBuffer = await generateConsolidatedAttendancePDF(attendanceData, summary, startDate, endDate)
    
    res.setHeader('Content-Type', 'application/pdf')
    
    // NOMBRE DE ARCHIVO SEGURO (PREVIENE PATH TRAVERSAL)
    const safeFilename = sanitizeFilename(`asistencia_paragon_${startDate}_${endDate}.pdf`)
    res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
    res.send(pdfBuffer)

  } catch (error) {
    return res.status(500).json(createSecureErrorResponse(error, 'generar PDF de asistencia'))
  }
}


