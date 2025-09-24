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

    // Obtener nombre del empleado si se está filtrando
    let employeeName = undefined
    if (employee_id && attendanceRecords.length > 0) {
      employeeName = attendanceRecords[0].employees?.name
    }

    // Generar PDF ejecutivo (modo gerencia)
    const pdf = await generateAttendancePDF(attendanceRecords, startDate, endDate, user.email, preset, Array.isArray(roleFilter) ? roleFilter[0] : roleFilter, employeeName)
    
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

// Función para generar PDF de asistencia ejecutivo (modo gerencia)
export async function generateAttendancePDF(attendanceRecords: any[], startDate: string, endDate: string, userEmail: string, preset?: string, role?: string, employeeName?: string): Promise<Buffer> {
  const PDFDocument = require('pdfkit')
  const doc = new PDFDocument({ margin: 50, bufferPages: true })
  
  // 1. ENCABEZADO CON FILTROS REALES
  const TZ = 'America/Tegucigalpa'
  const { from, to } = getDateRange(preset || 'today')
  
  doc.fontSize(18).text('Reporte de Asistencia', { align: 'center' })
  doc.fontSize(10).text(`Período: ${new Date(from).toLocaleDateString('es-HN', { timeZone: TZ })} a ${new Date(to).toLocaleDateString('es-HN', { timeZone: TZ })}`, { align: 'center' })
  doc.text(`Equipo: ${role || 'Todos'}  ·  Empleado: ${employeeName || 'Todos'}`, { align: 'center' })
  doc.fontSize(8).text(`Generado por: ${userEmail}  ·  ${new Date().toLocaleDateString('es-HN', { timeZone: TZ })}`, { align: 'center' })
  
  // 2. RESUMEN ARRIBA (KPIs QUE IMPORTAN)
  const totals = attendanceRecords.reduce((a, r) => { 
    if (r.status === 'late') a.late++; 
    else if (r.status === 'present') a.present++; 
    else a.absent++; 
    return a 
  }, { present: 0, late: 0, absent: 0 })
  
  const total = totals.present + totals.late + totals.absent
  const asistencia = total ? (((totals.present + totals.late) / total) * 100).toFixed(1) : '0.0'
  const puntualidad = total ? ((totals.present / total) * 100).toFixed(1) : '0.0'
  
  doc.moveDown(0.5)
  doc.fontSize(11).text(`Asistencia: ${asistencia}%   ·   Puntualidad: ${puntualidad}%   ·   Presentes: ${totals.present}   Tarde: ${totals.late}   Ausentes: ${totals.absent}`)
  
  doc.moveDown(1)
  
  // 3. ENCABEZADO DE TABLA QUE SE REPITE + PAGINACIÓN
  const headers = ['Empleado', 'Fecha', 'Entrada', 'Salida', 'Estado', 'Δ (min)']
  const colWidths = [120, 80, 80, 80, 60, 60]
  
  const drawHeader = () => {
    const y = doc.y
    doc.fontSize(10).fillColor('#000')
    
    // Dibujar encabezados
    headers.forEach((header, i) => {
      const x = 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
      doc.text(header, x, y, { width: colWidths[i], align: i >= 2 ? 'right' : 'left' })
    })
    
    // Línea separadora
    doc.moveTo(50, y + 15).lineTo(50 + colWidths.reduce((a, b) => a + b, 0), y + 15).stroke()
    doc.y = y + 20
  }
  
  drawHeader()
  doc.on('pageAdded', drawHeader)
  
  // 4. ZEBRA + NÚMEROS ALINEADOS + 5. COLOREA SEVERIDAD
  const colorLate = (m: number) => m > 20 ? '#ef4444' : m > 10 ? '#f97316' : m > 4 ? '#f59e0b' : '#10b981'
  
  // 6. FORMATO HONDURAS CONSISTENTE (TIMEZONE)
  const t = (d?: string) => d ? new Date(d).toLocaleTimeString('es-HN', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '—'
  const d = (d: string) => new Date(d).toLocaleDateString('es-HN', { timeZone: TZ })
  
  // 7. CORTAR TEXTOS LARGOS CON ELIPSIS
  const ellipsis = (s: string, w: number) => {
    if (doc.widthOfString(s) <= w) return s
    let r = s; while (doc.widthOfString(r + '…') > w && r.length) r = r.slice(0, -1)
    return r + '…'
  }
  
  // 8. AGRUPAR POR EQUIPO CUANDO NO FILTRAS (MÁS LEGIBLE)
  const byRole = attendanceRecords.sort((a, b) => (a.employees?.role || '').localeCompare(b.employees?.role || ''))
  let currentRole = ''
  
  for (const record of byRole) {
    const recordRole = record.employees?.role || 'Sin equipo'
    
    // Agrupar por equipo
    if (recordRole !== currentRole) {
      currentRole = recordRole
      doc.moveDown(0.5).fontSize(12).text(currentRole).fontSize(10)
    }
    
    if (doc.y > 700) { // Nueva página si se llena
      doc.addPage()
    }
    
    // 4. ZEBRA
    const rowIndex = byRole.indexOf(record)
    if (rowIndex % 2) {
      doc.rect(50, doc.y - 2, doc.page.width - 100, 18).fill('#0b1220').fillColor('#fff')
    }
    
    // Datos de la fila
    const nombre = ellipsis(record.employees?.name || 'N/A', colWidths[0])
    const fecha = d(record.date)
    const entrada = t(record.check_in)
    const salida = t(record.check_out)
    const estado = record.status === 'late' ? 'Tardanza' : record.status === 'present' ? 'Presente' : 'Ausente'
    const delta = record.late_minutes == null ? '—' : (record.late_minutes > 0 ? `+${record.late_minutes}` : `${record.late_minutes}`)
    
    // Pintar fila con alineación
    doc.text(nombre, 50, doc.y, { width: colWidths[0] })
    doc.text(fecha, 50 + colWidths[0], doc.y, { width: colWidths[1] })
    doc.text(entrada, 50 + colWidths[0] + colWidths[1], doc.y, { width: colWidths[2], align: 'right' })
    doc.text(salida, 50 + colWidths[0] + colWidths[1] + colWidths[2], doc.y, { width: colWidths[3], align: 'right' })
    
    // 5. COLOREA SEVERIDAD
    doc.fillColor(colorLate(record.late_minutes || 0)).text(estado, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], doc.y, { width: colWidths[4] }).fillColor('#000')
    doc.text(delta, 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], doc.y, { width: colWidths[5], align: 'right' })
    
    doc.y += 15
  }
  
  // 10. FIRMAS Y VALIDEZ (SIRVE PARA AUDITORÍA)
  doc.moveDown(2)
  doc.fontSize(10).text('___________________________          ___________________________')
  doc.text('   Jefe Inmediato                               RR.HH.')
  
  // 9. PIE DE PÁGINA PROFESIONAL (PAGINACIÓN Y CONFIDENCIALIDAD)
  const addFooter = () => {
    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i)
      doc.fontSize(8).fillColor('#94a3b8')
        .text('CONFIDENCIAL – Uso interno RH', 50, doc.page.height - 40, { width: 200 })
        .text(`Página ${i + 1} de ${range.count}`, 50, doc.page.height - 40, { align: 'right', width: doc.page.width - 100 })
    }
  }
  
  // Finalizar documento
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => {
      addFooter()
      resolve(Buffer.concat(chunks))
    })
    doc.on('error', reject)
    doc.end()
  })
}