import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 🔒 AUTENTICACIÓN REQUERIDA
    const supabase = createClient(req, res)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return res.status(401).json({ 
        error: 'No autorizado',
        message: 'Debe iniciar sesión para exportar nómina'
      })
    }

    // Verificar permisos del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, permissions, company_id')
      .eq('id', session.user.id)
      .single()

    if (!userProfile) {
      return res.status(403).json({ 
        error: 'Perfil no encontrado',
        message: 'Su perfil de usuario no está configurado correctamente'
      })
    }

    // Verificar permisos específicos para nómina
    const allowedRoles = ['company_admin', 'hr_manager', 'super_admin']
    if (!allowedRoles.includes(userProfile.role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para exportar nómina'
      })
    }

    const { periodo, formato = 'excel' } = req.body
    
    if (!periodo) {
      return res.status(400).json({ error: 'Periodo es requerido' })
    }

    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (formato: YYYY-MM)' })
    }

    // Obtener registros de nómina del período
    const { data: payrollRecords, error: payrollError } = await supabase
      .from('payroll_records')
      .select(`
        *,
        employees:employee_id (
          name,
          employee_code,
          position,
          department,
          bank_name,
          bank_account
        )
      `)
      .gte('period_start', `${periodo}-01`)
      .lt('period_start', `${periodo}-32`)
      .eq('employees.company_id', userProfile.company_id)
      .order('period_start', { ascending: false })

    if (payrollError) {
      console.error('Error obteniendo registros de nómina:', payrollError)
      return res.status(500).json({ error: 'Error obteniendo registros de nómina' })
    }

    if (!payrollRecords || payrollRecords.length === 0) {
      return res.status(404).json({ 
        error: 'No hay registros',
        message: 'No se encontraron registros de nómina para el período especificado'
      })
    }

    console.log(`📊 Exportando ${payrollRecords.length} registros de nómina para ${periodo}`)

    if (formato === 'excel') {
      return exportToExcel(payrollRecords, periodo, res)
    } else if (formato === 'pdf') {
      return exportToPDF(payrollRecords, periodo, res)
    } else if (formato === 'recibo-individual') {
      // Generar recibo individual para un empleado específico
      const { employeeId, quincena = 1 } = req.body
      if (!employeeId) {
        return res.status(400).json({ error: 'employeeId es requerido para recibo individual' })
      }
      
      const startDay = quincena === 1 ? 1 : 16
      const employeeRecord = payrollRecords.find(record => {
        if (record.employee_id !== employeeId) return false
        try {
          const day = new Date(record.period_start).getDate()
          return day === startDay
        } catch {
          return true
        }
      })
      if (!employeeRecord) {
        return res.status(404).json({ error: 'Empleado no encontrado en la nómina' })
      }
      
      return generateEmployeeReceipt(employeeRecord, periodo, quincena, res)
    } else {
      return res.status(400).json({ error: 'Formato no soportado. Use "excel", "pdf" o "recibo-individual"' })
    }

  } catch (error) {
    console.error('Error en exportación:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

async function exportToExcel(payrollRecords: any[], periodo: string, res: NextApiResponse) {
  try {
    // Usar xlsx para generar Excel
    const XLSX = require('xlsx')
    
    // Preparar datos para Excel
    const excelData = payrollRecords.map(record => ({
      'Código': record.employees?.employee_code || '',
      'Nombre': record.employees?.name || '',
      'Departamento': record.employees?.department || '',
      'Posición': record.employees?.position || '',
      'Banco': record.employees?.bank_name || '',
      'Cuenta': record.employees?.bank_account || '',
      'Período Inicio': new Date(record.period_start).toLocaleDateString('es-HN'),
      'Período Fin': new Date(record.period_end).toLocaleDateString('es-HN'),
      'Salario Base': record.base_salary,
      'Días Trabajados': record.days_worked,
      'Días Ausente': record.days_absent || 0,
      'Días Tardanza': record.late_days || 0,
      'Salario Bruto': record.gross_salary,
      'ISR': record.income_tax,
      'IHSS': record.social_security,
      'RAP': record.professional_tax,
      'Total Deducciones': record.total_deductions,
      'Salario Neto': record.net_salary,
      'Estado': record.status,
      'Notas Ingresos': record.notes_on_ingress || '',
      'Notas Deducciones': record.notes_on_deductions || '',
      'Generado': new Date(record.created_at).toLocaleDateString('es-HN')
    }))

    // Crear workbook
    const workbook = XLSX.utils.book_new()
    
    // Hoja principal de nómina
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    // Configurar anchos de columna
    const colWidths = [
      { wch: 12 }, // Código
      { wch: 25 }, // Nombre
      { wch: 15 }, // Departamento
      { wch: 20 }, // Posición
      { wch: 15 }, // Banco
      { wch: 20 }, // Cuenta
      { wch: 12 }, // Período Inicio
      { wch: 12 }, // Período Fin
      { wch: 12 }, // Salario Base
      { wch: 12 }, // Días Trabajados
      { wch: 12 }, // Días Ausente
      { wch: 12 }, // Días Tardanza
      { wch: 12 }, // Salario Bruto
      { wch: 10 }, // ISR
      { wch: 10 }, // IHSS
      { wch: 10 }, // RAP
      { wch: 15 }, // Total Deducciones
      { wch: 12 }, // Salario Neto
      { wch: 10 }, // Estado
      { wch: 30 }, // Notas Ingresos
      { wch: 30 }, // Notas Deducciones
      { wch: 12 }  // Generado
    ]
    worksheet['!cols'] = colWidths

    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nómina')

    // Hoja de resumen
    const totalBruto = payrollRecords.reduce((sum, r) => sum + r.gross_salary, 0)
    const totalDeducciones = payrollRecords.reduce((sum, r) => sum + r.total_deductions, 0)
    const totalNeto = payrollRecords.reduce((sum, r) => sum + r.net_salary, 0)
    const totalEmpleados = payrollRecords.length

    const resumenData = [
      { 'Concepto': 'Total Empleados', 'Valor': totalEmpleados },
      { 'Concepto': 'Total Salario Bruto', 'Valor': totalBruto },
      { 'Concepto': 'Total Deducciones', 'Valor': totalDeducciones },
      { 'Concepto': 'Total Salario Neto', 'Valor': totalNeto },
      { 'Concepto': 'Promedio Salario Neto', 'Valor': totalNeto / totalEmpleados }
    ]

    const resumenSheet = XLSX.utils.json_to_sheet(resumenData)
    resumenSheet['!cols'] = [{ wch: 25 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen')

    // Hoja por departamento
    const deptData: { [key: string]: any } = {}
    payrollRecords.forEach(record => {
      const dept = record.employees?.department || 'Sin Departamento'
      if (!deptData[dept]) {
        deptData[dept] = {
          empleados: 0,
          totalBruto: 0,
          totalDeducciones: 0,
          totalNeto: 0
        }
      }
      deptData[dept].empleados++
      deptData[dept].totalBruto += record.gross_salary
      deptData[dept].totalDeducciones += record.total_deductions
      deptData[dept].totalNeto += record.net_salary
    })

    const deptSheetData = Object.entries(deptData).map(([dept, data]: [string, any]) => ({
      'Departamento': dept,
      'Empleados': data.empleados,
      'Total Bruto': data.totalBruto,
      'Total Deducciones': data.totalDeducciones,
      'Total Neto': data.totalNeto,
      'Promedio Neto': data.totalNeto / data.empleados
    }))

    const deptSheet = XLSX.utils.json_to_sheet(deptSheetData)
    deptSheet['!cols'] = [
      { wch: 20 }, // Departamento
      { wch: 12 }, // Empleados
      { wch: 15 }, // Total Bruto
      { wch: 15 }, // Total Deducciones
      { wch: 15 }, // Total Neto
      { wch: 15 }  // Promedio Neto
    ]
    XLSX.utils.book_append_sheet(workbook, deptSheet, 'Por Departamento')

    // Generar buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Enviar respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=nomina_paragon_${periodo}.xlsx`)
    res.send(excelBuffer)

  } catch (error) {
    console.error('Error generando Excel:', error)
    return res.status(500).json({ error: 'Error generando archivo Excel' })
  }
}

async function exportToPDF(payrollRecords: any[], periodo: string, res: NextApiResponse) {
  try {
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 })
    let buffers: Buffer[] = []

    doc.on('data', (chunk: Buffer) => buffers.push(chunk))
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=nomina_paragon_${periodo}.pdf`)
      res.send(pdf)
    })

    // Encabezado
    doc.fontSize(16).text(`PARAGON HONDURAS - REPORTE DE NÓMINA`, { align: 'center' }).moveDown()
    doc.fontSize(12).text(`Período: ${periodo}`, { align: 'center' }).moveDown()
    doc.fontSize(10).text(`Generado: ${new Date().toLocaleDateString('es-HN')}`, { align: 'center' }).moveDown()
    doc.fontSize(8)

    // Encabezados de tabla
    const headers = [
      'Código', 'Nombre', 'Departamento', 'Días Trabajados', 'Salario Bruto', 
      'Deducciones', 'Salario Neto', 'Estado'
    ]
    const colWidths = [50, 120, 80, 50, 70, 70, 70, 50]
    const startX = 20
    let y = 120
    const rowHeight = 14

    headers.forEach((h, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
      doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#e0e0e0', '#000')
      doc.fillColor('#000').text(h, x + 2, y + 4, { width: colWidths[i] - 4 })
    })
    y += rowHeight

    // Datos
    payrollRecords.forEach(record => {
      const values = [
        record.employees?.employee_code || '',
        record.employees?.name || '',
        record.employees?.department || '',
        record.days_worked.toString(),
        `L. ${record.gross_salary.toFixed(2)}`,
        `L. ${record.total_deductions.toFixed(2)}`,
        `L. ${record.net_salary.toFixed(2)}`,
        record.status
      ]
      
      values.forEach((val, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, y, colWidths[i], rowHeight).stroke()
        doc.text(val.toString(), x + 2, y + 3, { width: colWidths[i] - 4 })
      })
      y += rowHeight
    })

    // Totales
    const totalBruto = payrollRecords.reduce((sum, r) => sum + r.gross_salary, 0)
    const totalDeducciones = payrollRecords.reduce((sum, r) => sum + r.total_deductions, 0)
    const totalNeto = payrollRecords.reduce((sum, r) => sum + r.net_salary, 0)

    y += 10
    doc.fontSize(10).text(`TOTALES:`, startX, y)
    doc.text(`Bruto: L. ${totalBruto.toFixed(2)}`, startX + 200, y)
    doc.text(`Deducciones: L. ${totalDeducciones.toFixed(2)}`, startX + 350, y)
    doc.text(`Neto: L. ${totalNeto.toFixed(2)}`, startX + 500, y)

    doc.end()

  } catch (error) {
    console.error('Error generando PDF:', error)
    return res.status(500).json({ error: 'Error generando archivo PDF' })
  }
}

// Nueva función para generar recibo individual por empleado
async function generateEmployeeReceipt(payrollRecord: any, periodo: string, quincena: number, res: NextApiResponse) {
  try {
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ 
      size: 'A4', 
      layout: 'portrait', 
      margin: 30,
      info: {
        Title: `Recibo de Nómina - ${payrollRecord.employees?.name} - ${periodo} Q${quincena}`,
        Author: 'Sistema de Recursos Humanos',
        Subject: 'Recibo de Nómina Individual',
        Keywords: 'recibo, nómina, empleado, Paragon, Honduras',
        Creator: 'HR SaaS System'
      }
    })
    
    let buffers: Buffer[] = []

    doc.on('data', (chunk: Buffer) => buffers.push(chunk))
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=recibo_${payrollRecord.employees?.employee_code}_${periodo}_q${quincena}.pdf`)
      res.send(pdf)
    })

    // ===== HEADER PROFESIONAL =====
    doc.rect(0, 0, 595, 80).fill('#1e40af')
    doc.fillColor('white')
    doc.fontSize(20).text('PARAGON HONDURAS', 30, 15, { align: 'center', width: 535 })
    doc.fontSize(14).text('RECIBO DE NÓMINA QUINCENAL', 30, 40, { align: 'center', width: 535 })
    doc.fontSize(12).text(`${periodo} - Quincena ${quincena}`, 30, 60, { align: 'center', width: 535 })
    
    doc.fillColor('black')
    
    // ===== INFORMACIÓN DEL EMPLEADO =====
    doc.fontSize(12).text('INFORMACIÓN DEL EMPLEADO:', 30, 100)
    doc.rect(30, 115, 535, 60).stroke()
    
    doc.fontSize(10).text('Código:', 40, 125)
    doc.fontSize(10).text(payrollRecord.employees?.employee_code || 'N/A', 120, 125)
    
    doc.fontSize(10).text('Nombre:', 40, 140)
    doc.fontSize(10).text(payrollRecord.employees?.name || 'N/A', 120, 140)
    
    doc.fontSize(10).text('Departamento:', 40, 155)
    doc.fontSize(10).text(payrollRecord.employees?.department || 'N/A', 120, 155)
    
    doc.fontSize(10).text('Posición:', 300, 125)
    doc.fontSize(10).text(payrollRecord.employees?.position || 'N/A', 380, 125)
    
    doc.fontSize(10).text('Período:', 300, 140)
    doc.fontSize(10).text(`${payrollRecord.period_start} - ${payrollRecord.period_end}`, 380, 140)
    
    doc.fontSize(10).text('Días Trabajados:', 300, 155)
    doc.fontSize(10).text(payrollRecord.days_worked.toString(), 380, 155)
    
    // ===== DETALLE DE INGRESOS =====
    doc.fontSize(12).text('DETALLE DE INGRESOS:', 30, 200)
    doc.rect(30, 215, 535, 40).stroke()
    
    doc.fontSize(10).text('Concepto:', 40, 225)
    doc.fontSize(10).text('Monto:', 400, 225)
    
    doc.fontSize(10).text('Salario Base (Quincenal):', 40, 240)
    doc.fontSize(10).text(`L. ${payrollRecord.base_salary.toFixed(2)}`, 400, 240)
    
    // ===== DETALLE DE DEDUCCIONES =====
    doc.fontSize(12).text('DETALLE DE DEDUCCIONES:', 30, 280)
    doc.rect(30, 295, 535, 80).stroke()
    
    doc.fontSize(10).text('Concepto:', 40, 305)
    doc.fontSize(10).text('Monto:', 400, 305)
    
    doc.fontSize(10).text('IHSS (2.5%):', 40, 320)
    doc.fontSize(10).text(`L. ${payrollRecord.social_security.toFixed(2)}`, 400, 320)
    
    doc.fontSize(10).text('RAP (1.5%):', 40, 335)
    doc.fontSize(10).text(`L. ${payrollRecord.professional_tax.toFixed(2)}`, 400, 335)
    
    doc.fontSize(10).text('ISR (Impuesto Sobre la Renta):', 40, 350)
    doc.fontSize(10).text(`L. ${payrollRecord.income_tax.toFixed(2)}`, 400, 350)
    
    doc.fontSize(10).text('Total Deducciones:', 40, 365)
    doc.fontSize(10).text(`L. ${payrollRecord.total_deductions.toFixed(2)}`, 400, 365)
    
    // ===== RESUMEN FINAL =====
    doc.fontSize(12).text('RESUMEN FINAL:', 30, 400)
    doc.rect(30, 415, 535, 40).fillAndStroke('#f3f4f6', '#000')
    
    doc.fontSize(12).text('TOTAL A RECIBIR:', 40, 425)
    doc.fontSize(14).text(`L. ${payrollRecord.net_salary.toFixed(2)}`, 400, 425, { align: 'right' })
    
    // ===== INFORMACIÓN BANCARIA =====
    doc.fontSize(12).text('INFORMACIÓN BANCARIA:', 30, 480)
    doc.rect(30, 495, 535, 40).stroke()
    
    doc.fontSize(10).text('Banco:', 40, 505)
    doc.fontSize(10).text(payrollRecord.employees?.bank_name || 'No especificado', 120, 505)
    
    doc.fontSize(10).text('Número de Cuenta:', 40, 520)
    doc.fontSize(10).text(payrollRecord.employees?.bank_account || 'No especificado', 120, 520)
    
    doc.fontSize(10).text('Monto a Transferir:', 300, 505)
    doc.fontSize(10).text(`L. ${payrollRecord.net_salary.toFixed(2)}`, 400, 505)
    
    // ===== NOTAS Y FIRMAS =====
    doc.fontSize(10).text('NOTAS:', 30, 560)
    doc.fontSize(9).text('• Este recibo es un documento oficial de Paragon Honduras.', 30, 575)
    doc.fontSize(9).text('• Los montos están calculados según la legislación laboral de Honduras.', 30, 590)
    doc.fontSize(9).text('• Para consultas, contactar al departamento de recursos humanos.', 30, 605)
    
    // Espacio para firma
    doc.fontSize(10).text('Firma del Empleado:', 30, 650)
    doc.rect(30, 665, 200, 30).stroke()
    
    doc.fontSize(10).text('Firma del Autorizado:', 300, 650)
    doc.rect(300, 665, 200, 30).stroke()
    
    // Pie de página
    doc.fontSize(8).text('Documento generado automáticamente - Paragon Honduras - Sistema de Recursos Humanos', 30, 750, { align: 'center', width: 535 })
    doc.fontSize(8).text(`Fecha de generación: ${new Date().toLocaleString('es-HN')}`, 30, 765, { align: 'center', width: 535 })

    doc.end()

  } catch (error) {
    console.error('Error generando recibo individual:', error)
    return res.status(500).json({ error: 'Error generando recibo individual' })
  }
} 