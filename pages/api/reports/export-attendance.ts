import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { generateConsolidatedAttendancePDF, type AttendanceItem, type AttendanceSummary } from '../../../lib/attendance/report'
import ExcelJS from 'exceljs'
import { validateExportRequest } from '../../../lib/security/input-validation'
import { generateSafeFilename } from '../../../lib/security/sanitization'
import { createSecureErrorResponse, createValidationErrorResponse, handleDatabaseError, handleFileError } from '../../../lib/security/error-handling'
import { createSecureClient } from '../../../lib/supabase/secure-client'
import { applyCompanyFilter, applyPermissionFilter, canAccessResource } from '../../../lib/security/query-filters'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'
import { withAudit, logDataExport, logSensitiveAccess } from '../../../lib/security/audit'

// Aplicar rate limiting y auditoría
const handlerWithSecurity = withExportRateLimit()(
  withAudit('export_attendance', 'attendance_data', {
    severity: 'high',
    includeDetails: true,
    logOnSuccess: true,
    logOnError: true
  })(exportAttendanceHandler)
)

export default handlerWithSecurity

async function exportAttendanceHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. VALIDACIÓN DE ENTRADA SEGURA
    const validation = validateExportRequest(req)
    if (!validation.valid) {
      return res.status(400).json(createValidationErrorResponse(validation.error!))
    }

    const { format, dateFilter, employee_id } = validation.data!

    // 2. AUTENTICACIÓN Y AUTORIZACIÓN SEGURA
    const authResult = await authenticateUser(req, res, ['can_view_reports', 'can_export_reports'])
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult

    // 3. VALIDAR ACCESO AL RECURSO
    if (!canAccessResource(userProfile!, 'reports')) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tiene permisos para acceder a reportes'
      })
    }

    // 4. CREAR CLIENTE SUPABASE SEGURO
    const supabase = createSecureClient({
      req,
      res,
      userProfile: userProfile!,
      enforceRLS: true
    })

    // 5. OBTENER DATOS CON FILTROS DE SEGURIDAD APLICADOS
    let employeeIds: string[] = []
    if (userProfile?.company_id) {
      // Obtener empleados con filtros de seguridad
      const employeesQuery = supabase
        .from('employees')
        .select('id')
      
      // Aplicar filtros de seguridad
      const secureEmployeesQuery = applyCompanyFilter(employeesQuery, userProfile!)
      
      const { data: employees, error: empError } = await secureEmployeesQuery
      
      if (empError) {
        return res.status(500).json(handleDatabaseError(empError, 'obtener empleados'))
      }
      
      employeeIds = (employees || []).map((e: any) => e.id)
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
          position,
          company_id
        )
      `)
      .gte('date', dateFilter.startDate)
      .lte('date', dateFilter.endDate)

    // Aplicar filtros de seguridad por permisos
    attendanceQuery = applyPermissionFilter(attendanceQuery, userProfile!, 'attendance_records')

    // Aplicar filtro de empresa adicional si es necesario
    if (employeeIds.length > 0) {
      attendanceQuery = attendanceQuery.in('employee_id', employeeIds)
    } else if (userProfile?.company_id) {
      // Forzar vacío si no hay empleados para esa empresa
      attendanceQuery = attendanceQuery.eq('employee_id', '__none__')
    }

    // Filtrar por empleado específico si se proporciona
    if (employee_id) {
      // Verificar que el usuario puede acceder a ese empleado
      if (userProfile?.role === 'employee' && employee_id !== userProfile.id) {
        return res.status(403).json({
          error: 'Acceso denegado',
          message: 'No puede acceder a datos de otros empleados'
        })
      }
      attendanceQuery = attendanceQuery.eq('employee_id', employee_id)
    }

    const { data: records, error } = await attendanceQuery
    if (error) {
      return res.status(500).json(handleDatabaseError(error, 'obtener registros de asistencia'))
    }

    // 7. LOG DE ACCESO A DATOS SENSIBLES
    await logSensitiveAccess({
      req,
      res,
      userProfile: userProfile!,
      action: 'export_attendance',
      resource: 'attendance_records',
      details: {
        format,
        dateRange: dateFilter,
        recordCount: records?.length || 0
      }
    }, 'attendance_data', records?.length || 0)

    // 8. PROCESAR EXPORTACIÓN SEGURA
    if (format === 'csv') {
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
      
      // NOMBRE DE ARCHIVO SEGURO
      const safeFilename = generateSafeFilename('attendance', dateFilter.startDate, dateFilter.endDate, 'csv')
      res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
      
      // LOG DE EXPORTACIÓN
      await logDataExport({
        req,
        res,
        userProfile: userProfile!,
        action: 'export_attendance_csv',
        resource: 'attendance_data'
      }, 'csv', records?.length || 0)
      
      return res.status(200).send(csv)
    }

    if (format === 'excel') {
      // LOG DE EXPORTACIÓN EXCEL
      await logDataExport({
        req,
        res,
        userProfile: userProfile!,
        action: 'export_attendance_excel',
        resource: 'attendance_data'
      }, 'excel', records?.length || 0)
      
      return exportToExcel(records || [], dateFilter.startDate, dateFilter.endDate, res)
    }

    if (format === 'pdf') {
      // LOG DE EXPORTACIÓN PDF
      await logDataExport({
        req,
        res,
        userProfile: userProfile!,
        action: 'export_attendance_pdf',
        resource: 'attendance_data'
      }, 'pdf', records?.length || 0)
      
      return exportToPDF(records || [], dateFilter.startDate, dateFilter.endDate, res, user?.email)
    }

    // Formato no soportado
    return res.status(400).json(createValidationErrorResponse('Formato no soportado. Use csv, excel o pdf'))

  } catch (error) {
    return res.status(500).json(createSecureErrorResponse(error, {
      endpoint: '/api/reports/export-attendance',
      action: 'export_attendance'
    }))
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
        'Posición': record.employees?.position || '',
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
    
    // NOMBRE DE ARCHIVO SEGURO
    const safeFilename = generateSafeFilename('asistencia_paragon', startDate, endDate, 'xlsx')
    res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
    res.send(buffer)

  } catch (error) {
    return res.status(500).json(handleFileError(error, 'generar Excel de asistencia'))
  }
}

async function exportToPDF(attendanceRecords: any[], startDate: string, endDate: string, res: NextApiResponse, generatedByEmail?: string) {
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
        position: record.employees?.position || 'Sin Posición',
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
    const pdfBuffer = await generateConsolidatedAttendancePDF(attendanceData, summary, startDate, endDate, generatedByEmail)
    
    res.setHeader('Content-Type', 'application/pdf')
    
    // NOMBRE DE ARCHIVO SEGURO
    const safeFilename = generateSafeFilename('asistencia_paragon', startDate, endDate, 'pdf')
    res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
    res.send(pdfBuffer)

  } catch (error) {
    return res.status(500).json(handleFileError(error, 'generar PDF de asistencia'))
  }
}


