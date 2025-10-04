import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { getCompanyData } from '../../../lib/helpers/company-filter'
import { formatDateForHonduras, nowInHonduras, formatDateTimeForHonduras } from '../../../lib/timezone'
import { 
  withExportSecurity, 
  validateCompanyAccess, 
  buildSecureQuery, 
  secureLog,
  sanitizeFilename
} from '../../../lib/security/export-security'

// Aplicar seguridad de exportación
const handlerWithSecurity = withExportSecurity(exportPayrollHandler)

export default handlerWithSecurity

async function exportPayrollHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const { format, reportType, periodo } = req.body
    
    // Validaciones
    if (!format || !['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Formato inválido (debe ser pdf o csv)' })
    }
    
    if (!reportType || !['general', 'period', 'deductions'].includes(reportType)) {
      return res.status(400).json({ error: 'Tipo de reporte inválido' })
    }

    console.log('📊 Generando reporte de nómina:', {
      format,
      reportType,
      periodo,
      companyId
    })

    // Obtener datos del reporte
    const reportData = await generatePayrollReportData(supabase, reportType, periodo, companyId)

    if (format === 'pdf') {
      return generatePayrollPDFReport(res, reportData, reportType, periodo)
    } else {
      return generatePayrollCSVReport(res, reportData, reportType, periodo)
    }

  } catch (error: any) {
    console.error('Error generando reporte de nómina:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({
      error: error.message || 'Internal server error'
    })
  }
}

async function generatePayrollReportData(supabase: any, reportType: string, periodo: string, companyId: string) {
  // Obtener empleados activos usando getCompanyData
  const { data: employees, error: empError } = await getCompanyData(
    supabase,
    'employees',
    companyId,
    'id, name, dni, employee_code, base_salary, department_id, status',
    { status: 'active' }
  ).order('name')

  if (empError) {
    console.error('Error obteniendo empleados:', empError)
    throw new Error('Error obteniendo empleados')
  }

  // Obtener registros de nómina usando getCompanyData
  let payrollQuery = getCompanyData(
    supabase,
    'payroll_records',
    companyId,
    `
      *,
      employees (
        name,
        employee_code,
        department_id
      )
    `
  ).order('created_at', { ascending: false })

  // Filtrar por período si es necesario
  if (reportType === 'period' && periodo) {
    const [year, month] = periodo.split('-')
    const startDate = `${periodo}-01`
    const endDate = `${periodo}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`
    payrollQuery = payrollQuery
      .gte('period_start', startDate)
      .lte('period_end', endDate)
  }

  const { data: payrollRecords, error: payrollError } = await payrollQuery

  if (payrollError) {
    console.error('Error obteniendo registros de nómina:', payrollError)
    throw new Error('Error obteniendo registros de nómina')
  }

  // Calcular estadísticas
  const totalEmployees = employees?.length || 0
  const totalGrossSalary = payrollRecords?.reduce((sum: number, record: any) => sum + (record.gross_salary || 0), 0) || 0
  const totalDeductions = payrollRecords?.reduce((sum: number, record: any) => sum + (record.total_deductions || 0), 0) || 0
  const totalNetSalary = payrollRecords?.reduce((sum: number, record: any) => sum + (record.net_salary || 0), 0) || 0
  const averageSalary = totalEmployees > 0 ? totalGrossSalary / totalEmployees : 0

  // Estadísticas de deducciones
  const totalISR = payrollRecords?.reduce((sum: number, record: any) => sum + (record.income_tax || 0), 0) || 0
  const totalIHSS = payrollRecords?.reduce((sum: number, record: any) => sum + (record.social_security || 0), 0) || 0
  const totalRAP = payrollRecords?.reduce((sum: number, record: any) => sum + (record.professional_tax || 0), 0) || 0

  // Estadísticas por departamento
  const departmentStats: { [key: string]: any } = {}
  payrollRecords?.forEach((record: any) => {
    const deptId = record.employees?.department_id || 'Sin Departamento'
    if (!departmentStats[deptId]) {
      departmentStats[deptId] = {
        employeeCount: 0,
        totalGross: 0,
        totalNet: 0,
        totalDeductions: 0
      }
    }
    departmentStats[deptId].employeeCount++
    departmentStats[deptId].totalGross += record.gross_salary || 0
    departmentStats[deptId].totalNet += record.net_salary || 0
    departmentStats[deptId].totalDeductions += record.total_deductions || 0
  })

  return {
    employees: employees || [],
    payrollRecords: payrollRecords || [],
    departmentStats,
    stats: {
      totalEmployees,
      totalGrossSalary,
      totalDeductions,
      totalNetSalary,
      averageSalary,
      totalISR,
      totalIHSS,
      totalRAP
    },
    reportType,
    periodo
  }
}

function generatePayrollPDFReport(res: NextApiResponse, reportData: any, reportType: string, periodo: string) {
  try {
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ 
      size: 'A4', 
      layout: 'portrait', 
      margin: 30,
      info: {
        Title: `Reporte de Nómina - ${reportType}`,
        Author: 'Sistema de Recursos Humanos',
        Subject: 'Reporte de Nómina',
        Keywords: 'nómina, reporte, recursos humanos',
        Creator: 'HR SaaS System'
      }
    })
    
    let buffers: Buffer[] = []

    doc.on('data', (chunk: Buffer) => buffers.push(chunk))
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      const safeFilename = sanitizeFilename(`reporte_nomina_${reportType}_${periodo || 'general'}.pdf`)
      res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
      res.send(pdf)
    })

    // ===== PÁGINA 1: HEADER Y RESUMEN EJECUTIVO =====
    
    // Header con branding
    doc.rect(0, 0, 595, 80).fill('#1e40af')
    doc.fillColor('white')
    doc.fontSize(20).text('SISTEMA DE RECURSOS HUMANOS', 30, 20, { align: 'center', width: 535 })
    doc.fontSize(16).text('Reporte de Nómina', 30, 45, { align: 'center', width: 535 })
    doc.fontSize(12).text(`Tipo: ${reportType.toUpperCase()} - ${periodo || 'General'}`, 30, 65, { align: 'center', width: 535 })
    
    // Reset colors
    doc.fillColor('black')
    
    // Información del reporte
    doc.fontSize(10).text('INFORMACIÓN DEL REPORTE:', 30, 100)
    doc.fontSize(9).text(`Tipo: Reporte de Nómina - ${reportType}`, 30, 115)
    doc.fontSize(9).text(`Período: ${periodo || 'General'}`, 30, 130)
    doc.fontSize(9).text(`Fecha de generación: ${formatDateForHonduras(nowInHonduras())}`, 30, 145)
    
    // Resumen ejecutivo
    doc.rect(30, 170, 535, 120).stroke()
    doc.fontSize(14).text('RESUMEN EJECUTIVO', 35, 180)
    
    doc.fontSize(10).text('Total Empleados:', 40, 200)
    doc.fontSize(10).text(reportData.stats.totalEmployees.toString(), 200, 200)
    
    doc.fontSize(10).text('Nómina Bruta Total:', 40, 215)
    doc.fontSize(10).text(`L. ${reportData.stats.totalGrossSalary.toFixed(2)}`, 200, 215)
    
    doc.fontSize(10).text('Deducciones Totales:', 40, 230)
    doc.fontSize(10).text(`L. ${reportData.stats.totalDeductions.toFixed(2)}`, 200, 230)
    
    doc.fontSize(10).text('Nómina Neta Total:', 40, 245)
    doc.fontSize(10).text(`L. ${reportData.stats.totalNetSalary.toFixed(2)}`, 200, 245)
    
    doc.fontSize(10).text('Salario Promedio:', 40, 260)
    doc.fontSize(10).text(`L. ${reportData.stats.averageSalary.toFixed(2)}`, 200, 260)
    
    // Detalle de deducciones
    doc.fontSize(10).text('ISR Total:', 300, 200)
    doc.fontSize(10).text(`L. ${reportData.stats.totalISR.toFixed(2)}`, 450, 200)
    
    doc.fontSize(10).text('IHSS Total:', 300, 215)
    doc.fontSize(10).text(`L. ${reportData.stats.totalIHSS.toFixed(2)}`, 450, 215)
    
    doc.fontSize(10).text('RAP Total:', 300, 230)
    doc.fontSize(10).text(`L. ${reportData.stats.totalRAP.toFixed(2)}`, 450, 230)
    
    // ===== PÁGINA 2: ESTADÍSTICAS POR DEPARTAMENTO =====
    doc.addPage()
    
    doc.fontSize(14).text('ESTADÍSTICAS POR DEPARTAMENTO', 30, 30, { align: 'center', width: 535 })
    
    // Tabla de departamentos
    const headers = ['Departamento', 'Empleados', 'Nómina Bruta', 'Deducciones', 'Nómina Neta']
    const colWidths = [120, 80, 100, 100, 100]
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
    
    // Datos de departamentos
    Object.entries(reportData.departmentStats).forEach(([deptId, stats]: [string, any]) => {
      if (y > 750) {
        doc.addPage()
        y = 30
      }
      
      const values = [
        deptId,
        stats.employeeCount.toString(),
        `L. ${stats.totalGross.toFixed(2)}`,
        `L. ${stats.totalDeductions.toFixed(2)}`,
        `L. ${stats.totalNet.toFixed(2)}`
      ]
      
      values.forEach((val: any, i: number) => {
        const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
        doc.rect(x, y, colWidths[i], rowHeight).stroke()
        doc.fontSize(7).text(val.toString(), x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
      })
      y += rowHeight
    })
    
    // ===== PÁGINA 3: DETALLE DE NÓMINA =====
    doc.addPage()
    
    doc.fontSize(14).text('DETALLE DE NÓMINA', 30, 30, { align: 'center', width: 535 })
    
    // Tabla de nómina
    const payrollHeaders = ['Empleado', 'Período', 'Bruto', 'Deducciones', 'Neto', 'Estado']
    const payrollColWidths = [100, 80, 80, 80, 80, 60]
    const payrollStartX = 30
    let payrollY = 70
    
    // Header tabla nómina
    payrollHeaders.forEach((h: string, i: number) => {
      const x = payrollStartX + payrollColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
      doc.rect(x, payrollY, payrollColWidths[i], rowHeight).fillAndStroke('#1e40af', '#000')
      doc.fillColor('white')
      doc.fontSize(8).text(h, x + 2, payrollY + 4, { width: payrollColWidths[i] - 4, align: 'center' })
      doc.fillColor('black')
    })
    payrollY += rowHeight
    
    // Datos de nómina
    reportData.payrollRecords.forEach((record: any) => {
      if (payrollY > 750) {
        doc.addPage()
        payrollY = 30
      }
      
      const values = [
        record.employees?.name || 'N/A',
        `${new Date(record.period_start + 'T00:00:00').toLocaleDateString('es-HN')} - ${new Date(record.period_end + 'T00:00:00').toLocaleDateString('es-HN')}`,
        `L. ${(record.gross_salary || 0).toFixed(2)}`,
        `L. ${(record.total_deductions || 0).toFixed(2)}`,
        `L. ${(record.net_salary || 0).toFixed(2)}`,
        record.status
      ]
      
      values.forEach((val: any, i: number) => {
        const x = payrollStartX + payrollColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
        doc.rect(x, payrollY, payrollColWidths[i], rowHeight).stroke()
        doc.fontSize(7).text(val.toString(), x + 2, payrollY + 4, { width: payrollColWidths[i] - 4, align: 'center' })
      })
      payrollY += rowHeight
    })
    
    // Pie de página
    doc.fontSize(8).text('Documento generado automáticamente - Sistema de Recursos Humanos', 30, 800, { align: 'center', width: 535 })
    doc.fontSize(8).text(`Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, 30, 815, { align: 'center', width: 535 })

    doc.end()
  } catch (error) {
    console.error('Error generando PDF de nómina:', error)
    throw error
  }
}

function generatePayrollCSVReport(res: NextApiResponse, reportData: any, reportType: string, periodo: string) {
  try {
    let csvContent = ''
    
    // Header del reporte
    csvContent += 'REPORTE DE NÓMINA\n'
    csvContent += `Tipo: ${reportType}\n`
    csvContent += `Período: ${periodo || 'General'}\n`
    csvContent += `Fecha de generación: ${formatDateForHonduras(nowInHonduras())}\n\n`
    
    // Resumen ejecutivo
    csvContent += 'RESUMEN EJECUTIVO\n'
    csvContent += 'Métrica,Valor\n'
    csvContent += `Total Empleados,${reportData.stats.totalEmployees}\n`
    csvContent += `Nómina Bruta Total,L. ${reportData.stats.totalGrossSalary.toFixed(2)}\n`
    csvContent += `Deducciones Totales,L. ${reportData.stats.totalDeductions.toFixed(2)}\n`
    csvContent += `Nómina Neta Total,L. ${reportData.stats.totalNetSalary.toFixed(2)}\n`
    csvContent += `Salario Promedio,L. ${reportData.stats.averageSalary.toFixed(2)}\n`
    csvContent += `ISR Total,L. ${reportData.stats.totalISR.toFixed(2)}\n`
    csvContent += `IHSS Total,L. ${reportData.stats.totalIHSS.toFixed(2)}\n`
    csvContent += `RAP Total,L. ${reportData.stats.totalRAP.toFixed(2)}\n\n`
    
    // Estadísticas por departamento
    csvContent += 'ESTADÍSTICAS POR DEPARTAMENTO\n'
    csvContent += 'Departamento,Empleados,Nómina Bruta,Deducciones,Nómina Neta\n'
    Object.entries(reportData.departmentStats).forEach(([deptId, stats]: [string, any]) => {
      csvContent += `"${deptId}",${stats.employeeCount},L. ${stats.totalGross.toFixed(2)},L. ${stats.totalDeductions.toFixed(2)},L. ${stats.totalNet.toFixed(2)}\n`
    })
    csvContent += '\n'
    
    // Detalle de nómina
    csvContent += 'DETALLE DE NÓMINA\n'
    csvContent += 'Empleado,Período Inicio,Período Fin,Bruto,Deducciones,Neto,Estado\n'
    reportData.payrollRecords.forEach((record: any) => {
      csvContent += `"${record.employees?.name || 'N/A'}","${record.period_start}","${record.period_end}",L. ${(record.gross_salary || 0).toFixed(2)},L. ${(record.total_deductions || 0).toFixed(2)},L. ${(record.net_salary || 0).toFixed(2)},${record.status}\n`
    })
    
    // Configurar respuesta CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    const safeFilename = sanitizeFilename(`reporte_nomina_${reportType}_${periodo || 'general'}.csv`)
    res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
    res.send(csvContent)
    
  } catch (error) {
    console.error('Error generando CSV de nómina:', error)
    throw error
  }
} 