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
    if (!allowedRoles.includes(userProfile?.role)) {
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
      .eq('employees?.company_id', userProfile?.company_id)
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
      const { employeeId } = req.body
      if (!employeeId) {
        return res.status(400).json({ error: 'employeeId es requerido para recibo individual' })
      }
      
      const employeeRecord = payrollRecords.find(record => record.employee_id === employeeId)
      if (!employeeRecord) {
        return res.status(404).json({ error: 'Empleado no encontrado en la nómina' })
      }
      
      return generateEmployeeReceipt(employeeRecord, periodo, 1, res) // Asumimos quincena 1 por defecto
    } else {
      return res.status(400).json({ error: 'Formato no soportado. Use "excel", "pdf" o "recibo-individual"' })
    }

  } catch (error) {
    console.error('Error en exportación:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error instanceof Error ? error.message : 'Error desconocido' : 'Error desconocido' 
    })
  }
}

async function exportToExcel(payrollRecords: any[], periodo: string, res: NextApiResponse) {
  try {
    // Usar xlsx para generar Excel
    const XLSX = require('xlsx')
    
    // Preparar datos para Excel
    const excelData = payrollRecords.map((record: any) => ({
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
    const totalBruto = payrollRecords.reduce((sum: number, r: any) => sum + r.gross_salary, 0)
    const totalDeducciones = payrollRecords.reduce((sum: number, r: any) => sum + r.total_deductions, 0)
    const totalNeto = payrollRecords.reduce((sum: number, r: any) => sum + r.net_salary, 0)
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
    payrollRecords.forEach((record: any) => {
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
    deptSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, deptSheet, 'Por Departamento')

    // Generar archivo Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=nomina_${periodo}_q1.xlsx`)
    res.send(excelBuffer)
    return
  }

  // Si no es Excel, generar PDF
  const PDFDocument = require('pdfkit')
  const doc = new PDFDocument({ 
    size: 'A4', 
    layout: 'landscape',
    margin: 20,
    info: {
      Title: `Nómina ${periodo} Q${quincena}`,
      Author: 'Sistema de Recursos Humanos',
      Subject: 'Reporte de Nómina'
    }
  })

  let buffers: Buffer[] = []
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))
  doc.on('end', () => {
    const pdf = Buffer.concat(buffers)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=nomina_${periodo}_q${quincena}.pdf`)
    res.send(pdf)
  })

  // Header del PDF
  doc.fontSize(16).text(`NÓMINA ${periodo} - QUINCENA ${quincena}`, { align: 'center' })
  doc.moveDown()
  doc.fontSize(10).text(`Generado el: ${new Date().toLocaleDateString('es-HN')}`, { align: 'center' })
  doc.moveDown()

  // Tabla de datos
  const headers = ['Código', 'Nombre', 'Departamento', 'Días Trab.', 'Bruto', 'Deducciones', 'Neto']
  const colWidths = [50, 120, 80, 50, 60, 60, 60]
  const startX = 20
  let y = 80
  const rowHeight = 14

  headers.forEach((h: string, i: number) => {
    const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
    doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#e0e0e0', '#000')
    doc.fillColor('black')
    doc.fontSize(8).text(h, x + 2, y + 3, { width: colWidths[i] - 4, align: 'center' })
  })
  y += rowHeight

  // Datos de empleados
  payrollRecords.forEach((record: any) => {
    if (y > 500) {
      doc.addPage()
      y = 20
    }

    const values = [
      record.employees?.employee_code || '',
      record.employees?.name || '',
      record.employees?.department || '',
      record.days_worked.toString(),
      `L. ${record.gross_salary.toFixed(2)}`,
      `L. ${record.total_deductions.toFixed(2)}`,
      `L. ${record.net_salary.toFixed(2)}`
    ]
    
    values.forEach((val: any, i: number) => {
      const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
      doc.rect(x, y, colWidths[i], rowHeight).stroke()
      doc.fontSize(7).text(val.toString(), x + 2, y + 3, { width: colWidths[i] - 4, align: 'center' })
    })
    y += rowHeight
  })

  // Totales
  const totalBruto = payrollRecords.reduce((sum: number, r: any) => sum + r.gross_salary, 0)
  const totalDeducciones = payrollRecords.reduce((sum: number, r: any) => sum + r.total_deductions, 0)
  const totalNeto = payrollRecords.reduce((sum: number, r: any) => sum + r.net_salary, 0) 