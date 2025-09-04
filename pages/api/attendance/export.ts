import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { getDateRange } from '../../../lib/attendance'
import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { format = 'csv', preset = 'today', employee_id, from, to } = req.query
  const supabase = createAdminClient()

  // Convertir parámetros a string
  const formatStr = Array.isArray(format) ? format[0] : format
  const presetStr = Array.isArray(preset) ? preset[0] : preset
  const employeeIdStr = Array.isArray(employee_id) ? employee_id[0] : employee_id

  const range = typeof from === 'string' && typeof to === 'string'
    ? { from, to }
    : getDateRange(presetStr)

  const { data, error } = await supabase.rpc('attendance_export', {
    p_employee_id: (employeeIdStr && employeeIdStr.trim() !== '') ? employeeIdStr.trim() : null,
    p_from: range.from as string,
    p_to: range.to as string
  })
  if (error) {
    console.error('attendance_export error', error)
    return res.status(500).json({ error: error.message })
  }
  // Generar nombre de archivo con fecha y preset
  const datePart = new Date().toISOString().split('T')[0]
  const employeePart = employeeIdStr ? '_empleado' : ''
  
  if (formatStr === 'csv') {
    return exportToCSV(data, presetStr, employeePart, datePart, res)
  } else if (formatStr === 'xlsx') {
    return await exportToXLSX(data, presetStr, employeePart, datePart, res)
  } else if (formatStr === 'pdf') {
    return await exportToPDF(data, presetStr, employeePart, datePart, res)
  } else {
    return res.status(400).json({ error: 'Formato no soportado. Use csv, xlsx o pdf' })
  }
}

// Función para exportar a CSV
function exportToCSV(data: any[], preset: string, employeePart: string, datePart: string, res: NextApiResponse) {
  const headers = Object.keys(data[0] || {})
  const csv = [
    headers.join(','), 
    ...(data as any[]).map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
  ].join('\n')
  
  const fileName = `asistencia_${preset}${employeePart}_${datePart}.csv`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
  return res.status(200).send('\ufeff' + csv) // BOM para UTF-8
}

// Función para exportar a XLSX
async function exportToXLSX(data: any[], preset: string, employeePart: string, datePart: string, res: NextApiResponse) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Asistencia')
  
  if (data.length > 0) {
    // Agregar encabezados
    const headers = Object.keys(data[0])
    worksheet.addRow(headers)
    
    // Estilo para encabezados
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
    
    // Agregar datos
    data.forEach(row => {
      worksheet.addRow(headers.map(h => row[h]))
    })
    
    // Ajustar ancho de columnas
    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }
  
  const fileName = `asistencia_${preset}${employeePart}_${datePart}.xlsx`
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
  
  await workbook.xlsx.write(res)
  res.end()
}

// Función para exportar a PDF
async function exportToPDF(data: any[], preset: string, employeePart: string, datePart: string, res: NextApiResponse) {
  const doc = new PDFDocument({ margin: 50 })
  const fileName = `asistencia_${preset}${employeePart}_${datePart}.pdf`
  
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
  
  doc.pipe(res)
  
  // Título
  doc.fontSize(18).text('Reporte de Asistencia', { align: 'center' })
  doc.moveDown()
  
  // Información del reporte
  const presetLabels: { [key: string]: string } = {
    'today': 'Hoy',
    'week': 'Esta Semana', 
    'fortnight': 'Esta Quincena',
    'month': 'Este Mes',
    'year': 'Este Año'
  }
  
  doc.fontSize(12)
  doc.text(`Período: ${presetLabels[preset] || preset}`)
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-HN')}`)
  if (employeePart) {
    doc.text('Filtro: Empleado específico')
  }
  doc.moveDown()
  
  if (data.length === 0) {
    doc.text('No hay datos para mostrar')
  } else {
    // Tabla de datos
    const headers = Object.keys(data[0])
    const startY = doc.y
    
    // Encabezados
    let x = 50
    headers.forEach(header => {
      doc.text(header, x, startY, { width: 80 })
      x += 85
    })
    
    doc.moveDown()
    
    // Datos (limitamos a 50 registros para evitar PDFs muy grandes)
    const limitedData = data.slice(0, 50)
    limitedData.forEach(row => {
      let x = 50
      headers.forEach(header => {
        doc.text(String(row[header] || ''), x, doc.y, { width: 80 })
        x += 85
      })
      doc.moveDown(0.5)
    })
    
    if (data.length > 50) {
      doc.moveDown()
      doc.text(`... y ${data.length - 50} registros más`)
    }
  }
  
  doc.end()
}
