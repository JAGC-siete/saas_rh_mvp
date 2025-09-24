import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'
import { validateAttendanceExport } from '../../../lib/security/schema-validation'
import { createSecureQueryBuilder } from '../../../lib/security/secure-queries'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'
import { getDateRange } from '../../../lib/attendance'
import ExcelJS from 'exceljs'

// Aplicar rate limiting
const handlerWithSecurity = withExportRateLimit()(attendanceExportHandler)

export default handlerWithSecurity

async function attendanceExportHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // AUTENTICACIÓN ESTANDARIZADA - Usar requireCompanyAccess (como payroll)
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Verificar roles específicos para exportar asistencia (como payroll)
    if (!['super_admin', 'company_admin', 'hr_manager', 'manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para exportar datos de asistencia'
      })
    }

    // VALIDACIÓN DE PARÁMETROS DE QUERY (como payroll)
    const { preset, formato, role: roleFilter, employee_id } = req.query
    
    // Validar formato requerido
    if (!formato || typeof formato !== 'string') {
      return res.status(400).json({ 
        error: 'Formato requerido',
        message: 'Debe especificar un formato de exportación (excel, csv, pdf)'
      })
    }
    
    // Validar formato válido
    const validFormats = ['excel', 'csv', 'pdf', 'xlsx']
    if (!validFormats.includes(formato.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Formato inválido',
        message: `Formato debe ser uno de: ${validFormats.join(', ')}`
      })
    }
    
    // Usar preset si está disponible, sino usar fechas del body
    let exportData: any
    if (preset && typeof preset === 'string') {
      const range = getDateRange(preset)
      exportData = {
        startDate: range.from.split('T')[0],
        endDate: range.to.split('T')[0],
        formato: formato || 'excel',
        role: roleFilter || null,
        employee_id: employee_id || null
      }
    } else {
      // VALIDACIÓN SEGURA CON ZOD para fechas específicas
      const validation = validateAttendanceExport(req.body)
      if (!validation.success) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          message: validation.error?.message,
          details: validation.error?.details,
          timestamp: new Date().toISOString()
        })
      }
      exportData = {
        ...validation.data!,
        role: roleFilter || null,
        employee_id: employee_id || null
      }
    }

    const { startDate, endDate, formato: rawFormat } = exportData
    const format = String(rawFormat || 'excel').toLowerCase()

    console.log('Usuario autenticado para exportación de asistencia:', { 
      userId: user.id.substring(0, 8) + '...', // Ocultar ID completo
      role: role,
      companyId: '***' // Ocultar company_id
    })

    // USAR QUERY BUILDER SEGURO (como payroll)
    const queryBuilder = createSecureQueryBuilder(supabase, { 
      id: user.id, 
      company_id: companyId, 
      role: role 
    } as any)
    const attendanceRecords = await queryBuilder.getAttendanceRecords(exportData)

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(404).json({ 
        error: 'No hay registros',
        message: 'No se encontraron registros de asistencia para el período especificado'
      })
    }

    console.log(`Exportando ${attendanceRecords.length} registros de asistencia para ${startDate} a ${endDate}`)

    switch (format) {
      case 'excel':
      case 'xlsx':
        return exportToExcel(attendanceRecords, startDate, endDate, res)
      case 'csv':
        return exportToCSV(attendanceRecords, startDate, endDate, res)
      case 'pdf':
        // Redirigir al endpoint específico de PDF (como payroll)
        const pdfUrl = `/api/attendance/generate-pdf?preset=${preset}${employee_id ? `&employee_id=${Array.isArray(employee_id) ? employee_id[0] : employee_id}` : ''}${roleFilter ? `&role=${encodeURIComponent(Array.isArray(roleFilter) ? roleFilter[0] : roleFilter)}` : ''}`
        return res.status(302).json({ 
          redirect: pdfUrl,
          message: 'Redirigiendo al generador de PDF'
        })
      default:
        return res.status(400).json({ error: 'Formato no soportado. Use "excel", "xlsx" o "csv"' })
    }

  } catch (error) {
    console.error('Error en exportación de asistencia:', error)
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Ha ocurrido un error inesperado',
      timestamp: new Date().toISOString()
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

    // Preparar datos de resumen
    const totalRecords = attendanceRecords.length
    const totalHours = excelData.reduce((sum, r) => sum + parseFloat(r['Horas Trabajadas']), 0)
    const totalLateMinutes = excelData.reduce((sum, r) => sum + r['Minutos de Tardanza'], 0)
    const totalOvertime = excelData.reduce((sum, r) => sum + parseFloat(r['Horas Extra']), 0)
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

    // Agregar hoja de resumen
    const resumenSheet = workbook.addWorksheet('Resumen')
    resumenSheet.columns = [
      { header: 'Concepto', key: 'Concepto', width: 25 },
      { header: 'Valor', key: 'Valor', width: 15 }
    ]

    resumenData.forEach(row => {
      resumenSheet.addRow(row)
    })

    // Estilo para el resumen
    resumenSheet.getRow(1).font = { bold: true }
    resumenSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Generar buffer
    const excelBuffer = await workbook.xlsx.writeBuffer()

    // Sanitizar nombre de archivo
    const sanitizeFilename = (filename: string) => {
      return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    }
    
    const safeFilename = sanitizeFilename(`asistencia_paragon_${startDate}_${endDate}.xlsx`)
    
    // Enviar respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
    res.send(excelBuffer)

  } catch (error) {
    console.error('Error generando Excel de asistencia:', error)
    return res.status(500).json({ error: 'Error generando archivo Excel' })
  }
}

function toCsvValue(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

async function exportToCSV(attendanceRecords: any[], startDate: string, endDate: string, res: NextApiResponse) {
  // Encabezados (mismos campos clave usados en Excel)
  const headers = [
    'Código','Nombre','Departamento','Posición','Fecha','Día de la Semana','Hora de Entrada','Hora de Salida','Horas Trabajadas','Estado','Minutos de Tardanza','Horas Extra','Justificación','Categoría Justificación','Ubicación','Dispositivo','Registrado'
  ]

  const rows = attendanceRecords.map(record => {
    const checkIn = record.check_in ? new Date(record.check_in) : null
    const checkOut = record.check_out ? new Date(record.check_out) : null

    let hoursWorked = 0
    if (checkIn && checkOut) {
      const diffMs = checkOut.getTime() - checkIn.getTime()
      hoursWorked = diffMs / (1000 * 60 * 60)
    }

    let lateMinutes = 0
    if (checkIn) {
      const expectedTime = new Date(checkIn)
      expectedTime.setHours(8, 0, 0, 0)
      if (checkIn > expectedTime) {
        lateMinutes = Math.floor((checkIn.getTime() - expectedTime.getTime()) / (1000 * 60))
      }
    }

    const overtimeHours = Math.max(0, hoursWorked - 8)

    return [
      record.employees?.employee_code || '',
      record.employees?.name || '',
      record.employees?.department || '',
      record.employees?.position || '',
      new Date(record.date).toLocaleDateString('es-HN'),
      new Date(record.date).toLocaleDateString('es-HN', { weekday: 'long' }),
      checkIn ? checkIn.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      checkOut ? checkOut.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
      hoursWorked.toFixed(2),
      record.status === 'present' ? 'Presente' : record.status === 'late' ? 'Tardanza' : 'Ausente',
      lateMinutes,
      overtimeHours.toFixed(2),
      record.justification || '',
      record.justification_category || '',
      record.location ? `${record.lat}, ${record.lon}` : 'N/A',
      record.device_id || 'N/A',
      new Date(record.created_at).toLocaleDateString('es-HN')
    ]
  })

  const csv = [headers.map(toCsvValue).join(','), ...rows.map(r => r.map(toCsvValue).join(','))].join('\n')

  const filename = `asistencia_paragon_${startDate}_${endDate}.csv`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
  res.send('\uFEFF' + csv) // BOM para Excel
}