import { NextApiRequest, NextApiResponse } from 'next'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import PDFDocument from 'pdfkit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { range, format } = req.body

    if (!range || !format) {
      return res.status(400).json({ error: 'Range and format are required' })
    }

    // Calcular fechas según el rango
    let startDate, endDate
    const today = new Date()
    
    switch (range) {
      case 'daily':
        startDate = today.toISOString().split('T')[0]
        endDate = startDate
        break
      case 'weekly':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        startDate = weekStart.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      case 'biweekly':
        const twoWeeksAgo = new Date(today)
        twoWeeksAgo.setDate(today.getDate() - 14)
        startDate = twoWeeksAgo.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      case 'monthly':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        startDate = monthStart.toISOString().split('T')[0]
        endDate = today.toISOString().split('T')[0]
        break
      default:
        return res.status(400).json({ error: 'Invalid range' })
    }

    // Obtener datos de asistencia
    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance_records')
      .select(`
        *,
        employees:employee_id (
          id,
          name,
          employee_code,
          base_salary,
          department_id
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (attError) {
      console.error('Error fetching attendance:', attError)
      return res.status(500).json({ error: 'Error fetching attendance data' })
    }

    // Obtener empleados para calcular ausencias
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, base_salary, department_id')
      .eq('status', 'active')

    if (empError) {
      console.error('Error fetching employees:', empError)
      return res.status(500).json({ error: 'Error fetching employees' })
    }

    if (format === 'csv') {
      return generateCSV(res, attendanceRecords, employees, startDate, endDate, range)
    } else if (format === 'pdf') {
      return generatePDF(res, attendanceRecords, employees, startDate, endDate, range)
    } else {
      return res.status(400).json({ error: 'Invalid format' })
    }

  } catch (error) {
    console.error('Error in export report:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

function generateCSV(res: NextApiResponse, attendanceRecords: any[], employees: any[], startDate: string, endDate: string, range: string) {
  const headers = [
    'Fecha',
    'Código Empleado',
    'Nombre Empleado',
    'Entrada',
    'Salida',
    'Minutos Tardanza',
    'Estado',
    'Justificación'
  ]

  const csvContent = [
    headers.join(','),
    ...attendanceRecords.map(record => [
      record.date,
      record.employees?.employee_code || '',
      record.employees?.name || '',
      record.check_in ? new Date(record.check_in).toLocaleTimeString('es-HN') : '',
      record.check_out ? new Date(record.check_out).toLocaleTimeString('es-HN') : '',
      record.late_minutes || 0,
      record.status || '',
      record.justification || ''
    ].join(','))
  ].join('\n')

  const filename = `reporte_asistencia_${range}_${startDate}_${endDate}.csv`
  
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
  res.status(200).send(csvContent)
}

function generatePDF(res: NextApiResponse, attendanceRecords: any[], employees: any[], startDate: string, endDate: string, range: string) {
  const doc = new PDFDocument()
  const filename = `reporte_asistencia_${range}_${startDate}_${endDate}.pdf`
  
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
  
  doc.pipe(res)

  // Header
  doc.fontSize(20).text('PARAGON HONDURAS', { align: 'center' })
  doc.fontSize(16).text('Reporte de Asistencia', { align: 'center' })
  doc.fontSize(12).text(`Período: ${startDate} - ${endDate}`, { align: 'center' })
  doc.fontSize(10).text(`Generado: ${new Date().toLocaleDateString('es-HN')}`, { align: 'center' })
  
  doc.moveDown()

  // Estadísticas resumidas
  const totalEmployees = employees.length
  const presentCount = attendanceRecords.length
  const absentCount = totalEmployees - presentCount
  const lateCount = attendanceRecords.filter(r => r.late_minutes > 0).length

  doc.fontSize(14).text('Resumen Ejecutivo')
  doc.fontSize(10).text(`Total Empleados: ${totalEmployees}`)
  doc.fontSize(10).text(`Presentes: ${presentCount}`)
  doc.fontSize(10).text(`Ausentes: ${absentCount}`)
  doc.fontSize(10).text(`Tardanzas: ${lateCount}`)
  doc.fontSize(10).text(`Tasa de Asistencia: ${totalEmployees > 0 ? ((presentCount / totalEmployees) * 100).toFixed(1) : 0}%`)
  
  doc.moveDown()

  // Tabla de registros
  doc.fontSize(14).text('Detalle de Registros')
  doc.moveDown()

  const tableTop = doc.y
  const tableLeft = 50
  const colWidths = [60, 80, 100, 60, 60, 60, 60, 100]
  const headers = ['Fecha', 'Código', 'Nombre', 'Entrada', 'Salida', 'Tardanza', 'Estado', 'Justificación']

  // Headers
  let x = tableLeft
  headers.forEach((header, i) => {
    doc.fontSize(8).text(header, x, tableTop, { width: colWidths[i] })
    x += colWidths[i]
  })

  // Data
  let y = tableTop + 20
  attendanceRecords.forEach(record => {
    if (y > 700) {
      doc.addPage()
      y = 50
    }

    x = tableLeft
    const rowData = [
      record.date,
      record.employees?.employee_code || '',
      record.employees?.name || '',
      record.check_in ? new Date(record.check_in).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }) : '',
      record.check_out ? new Date(record.check_out).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }) : '',
      record.late_minutes || 0,
      record.status || '',
      record.justification || ''
    ]

    rowData.forEach((cell, i) => {
      doc.fontSize(8).text(cell, x, y, { width: colWidths[i] })
      x += colWidths[i]
    })

    y += 15
  })

  doc.end()
} 