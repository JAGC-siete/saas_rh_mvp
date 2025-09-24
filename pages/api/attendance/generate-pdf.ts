import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'
import { getDateRange } from '../../../lib/attendance'
import { createSecureQueryBuilder } from '../../../lib/security/secure-queries'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN ESTANDARIZADA - Usar requireCompanyAccess (como payroll)
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Verificar roles específicos para generar PDF (como payroll)
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para generar PDF de asistencia'
      })
    }

    // VALIDACIÓN DE PARÁMETROS (como payroll)
    const { preset, employee_id, role: roleFilter } = req.query

    if (!preset || typeof preset !== 'string') {
      return res.status(400).json({ 
        error: 'Preset requerido',
        message: 'Debe especificar un preset válido (today, week, fortnight, month, year)'
      })
    }

    // Calcular fechas usando el mismo resolver que otros endpoints
    const range = getDateRange(preset)
    const startDate = range.from.split('T')[0]
    const endDate = range.to.split('T')[0]

    // USAR QUERY BUILDER SEGURO (como payroll)
    const queryBuilder = createSecureQueryBuilder(supabase, { 
      id: user.id, 
      company_id: companyId, 
      role: role 
    } as any)

    const attendanceRecords = await queryBuilder.getAttendanceRecords({
      startDate,
      endDate,
      formato: 'pdf',
      employee_id: typeof employee_id === 'string' ? employee_id : undefined,
      role: typeof roleFilter === 'string' ? roleFilter : undefined
    })

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return res.status(404).json({ 
        error: 'No hay registros',
        message: 'No se encontraron registros de asistencia para el período especificado'
      })
    }

    console.log(`Generando PDF de ${attendanceRecords.length} registros de asistencia para ${startDate} a ${endDate}`)

    // Generar PDF usando la misma librería que payroll
    const pdf = await generateAttendancePDF(attendanceRecords, startDate, endDate, user.email)
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=asistencia_${startDate}_${endDate}.pdf`)
    return res.send(pdf)

  } catch (error: any) {
    console.error('Error generando PDF de asistencia:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message || 'Error desconocido'
    })
  }
}

// Función para generar PDF de asistencia (similar a payroll)
async function generateAttendancePDF(attendanceRecords: any[], startDate: string, endDate: string, userEmail: string): Promise<Buffer> {
  // Por ahora, generar un PDF simple usando la misma estructura que payroll
  // En el futuro se puede mejorar con una librería más robusta
  
  const PDFDocument = require('pdfkit')
  const doc = new PDFDocument({ margin: 50 })
  
  // Configurar el documento
  doc.fontSize(20).text('Reporte de Asistencia', { align: 'center' })
  doc.fontSize(12).text(`Período: ${startDate} a ${endDate}`, { align: 'center' })
  doc.fontSize(10).text(`Generado por: ${userEmail}`, { align: 'center' })
  doc.fontSize(10).text(`Fecha: ${new Date().toLocaleDateString('es-HN')}`, { align: 'center' })
  
  doc.moveDown(2)
  
  // Agregar tabla de datos
  doc.fontSize(10)
  
  // Encabezados
  const headers = ['Empleado', 'Fecha', 'Entrada', 'Salida', 'Estado', 'Tardanza']
  const colWidths = [120, 80, 80, 80, 60, 60]
  let y = doc.y
  
  // Dibujar encabezados
  headers.forEach((header, i) => {
    doc.text(header, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y)
  })
  
  // Línea separadora
  doc.moveTo(50, y + 15).lineTo(50 + colWidths.reduce((a, b) => a + b, 0), y + 15).stroke()
  
  y += 20
  
  // Agregar datos
  attendanceRecords.forEach((record, index) => {
    if (y > 700) { // Nueva página si se llena
      doc.addPage()
      y = 50
    }
    
    const row = [
      record.employees?.name || 'N/A',
      new Date(record.date).toLocaleDateString('es-HN'),
      record.check_in ? new Date(record.check_in).toLocaleTimeString('es-HN') : 'N/A',
      record.check_out ? new Date(record.check_out).toLocaleTimeString('es-HN') : 'N/A',
      record.status === 'present' ? 'Presente' : record.status === 'late' ? 'Tardanza' : 'Ausente',
      record.late_minutes ? `${record.late_minutes} min` : '0 min'
    ]
    
    row.forEach((cell, i) => {
      doc.text(cell, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y)
    })
    
    y += 15
  })
  
  // Finalizar documento
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}