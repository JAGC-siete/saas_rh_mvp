import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { getCompanyData } from '../../../lib/helpers/company-filter'
import { getHondurasTimestamp, formatDateForHonduras, nowInHonduras, formatDateTimeForHonduras, formatDateOnlyForHonduras } from '../../../lib/timezone'
import { 
  validateCompanyAccess, 
  buildSecureQuery, 
  secureLog,
  sanitizeFilename,
  fileFormatSchema
} from '../../../lib/security/export-security'
import ExcelJS from 'exceljs'
import { z } from 'zod'

// Schema de validación para exportación de empleados (sin fechas)
const employeeExportSchema = z.object({
  format: fileFormatSchema,
  filters: z.object({
    status: z.array(z.enum(['active', 'inactive', 'terminated'])).optional(),
    departmentIds: z.array(z.string()).optional(), // Permitir cualquier string, no solo UUIDs estrictos
    employeeIds: z.array(z.string()).optional()
  }).optional()
})

// Middleware de seguridad específico para exportación de empleados
function withEmployeeExportSecurity(handler: any) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Validar método HTTP
      if (req.method !== 'POST') {
        return res.status(405).json({ 
          error: 'Método no permitido',
          message: 'Solo se permite POST para exportaciones'
        })
      }

      // Validar datos de entrada
      const validation = employeeExportSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          message: 'Los datos proporcionados no son válidos',
          details: validation.error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        })
      }

      // Agregar datos validados al request
      req.validatedData = validation.data
      
      return handler(req, res)
    } catch (error) {
      secureLog('Error en middleware de seguridad de exportación de empleados', { error })
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: 'Ha ocurrido un error inesperado'
      })
    }
  }
}

// Aplicar seguridad de exportación
const handlerWithSecurity = withEmployeeExportSecurity(exportEmployeesHandler)

export default handlerWithSecurity

async function exportEmployeesHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    // Usar datos validados del middleware
    const validatedData = (req as any).validatedData || req.body
    const { format = 'pdf', filters } = validatedData
    
    // Validaciones adicionales (por si acaso)
    if (!format || !['pdf', 'csv', 'excel', 'xlsx'].includes(format)) {
      return res.status(400).json({ error: 'Formato inválido (debe ser pdf, csv o excel)' })
    }

    console.log('📊 Generando reporte de empleados:', { 
      format, 
      companyId,
      filters 
    })

    // Obtener datos del reporte con filtros
    const reportData = await generateEmployeeReportData(supabase, companyId, filters)

    const exportFormat = format === 'xlsx' ? 'excel' : format

    if (exportFormat === 'pdf') {
      return generateEmployeePDFReport(res, reportData)
    } else if (exportFormat === 'excel') {
      return generateEmployeeExcelReport(res, reportData)
    } else {
      return generateEmployeeCSVReport(res, reportData)
    }

  } catch (error: any) {
    console.error('Error generando reporte de empleados:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({
      error: error.message || 'Internal server error'
    })
  }
}

async function generateEmployeeReportData(supabase: any, companyId: string, filters?: {
  status?: string[]
  departmentIds?: string[]
  employeeIds?: string[]
}) {
  // Construir query base
  let query = getCompanyData(
    supabase,
    'employees',
    companyId,
    `
      id,
      name,
      email,
      employee_code,
      dni,
      role,
      hire_date,
      base_salary,
      status,
      bank_name,
      bank_account,
      department_id,
      created_at,
      departments!employees_department_id_fkey(name),
      companies(name)
    `
  )

  // Aplicar filtros
  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  if (filters?.departmentIds && filters.departmentIds.length > 0) {
    query = query.in('department_id', filters.departmentIds)
  }

  if (filters?.employeeIds && filters.employeeIds.length > 0) {
    query = query.in('id', filters.employeeIds)
  }

  // Obtener empleados con información completa
  const { data: employees, error: empError } = await query.order('name')

  if (empError) {
    console.error('Error obteniendo empleados:', empError)
    throw new Error('Error obteniendo empleados')
  }

  // Obtener departamentos usando getCompanyData
  const { data: departments, error: deptError } = await getCompanyData(
    supabase,
    'departments',
    companyId,
    'id, name'
  )

  if (deptError) {
    console.error('Error obteniendo departamentos:', deptError)
    // No lanzar error, continuar sin departamentos
  }

  // Calcular estadísticas
  const totalEmployees = employees?.length || 0
  const activeEmployees = employees?.filter((emp: any) => emp.status === 'active').length || 0
  const inactiveEmployees = employees?.filter((emp: any) => emp.status === 'inactive').length || 0
  const terminatedEmployees = employees?.filter((emp: any) => emp.status === 'terminated').length || 0
  
  const totalSalary = employees?.reduce((sum: number, emp: any) => sum + (emp.base_salary || 0), 0) || 0
  const averageSalary = totalEmployees > 0 ? totalSalary / totalEmployees : 0

  // Estadísticas por departamento
  const departmentStats = departments?.map((dept: any) => {
    const deptEmployees = employees?.filter((emp: any) => emp.department_id === dept.id) || []
    return {
      department: dept,
      employeeCount: deptEmployees.length,
      activeCount: deptEmployees.filter((emp: any) => emp.status === 'active').length,
      totalSalary: deptEmployees.reduce((sum: number, emp: any) => sum + (emp.base_salary || 0), 0)
    }
  }) || []

  return {
    employees: employees || [],
    departments: departments || [],
    departmentStats,
    stats: {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      terminatedEmployees,
      totalSalary,
      averageSalary
    }
  }
}

function generateEmployeePDFReport(res: NextApiResponse, reportData: any) {
  try {
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ 
      size: 'A4', 
      layout: 'portrait', 
      margin: 30,
      info: {
        Title: 'Reporte de Empleados',
        Author: 'Sistema de Recursos Humanos',
        Subject: 'Reporte de Empleados',
        Keywords: 'empleados, reporte, recursos humanos',
        Creator: 'HR SaaS System'
      }
    })
    
    const pageWidth = doc.page.width
    const pageHeight = doc.page.height
    
    // Colores consistentes
    const colors = {
      primary: '#1e40af',
      primaryDark: '#1e3a8a',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      muted: '#64748b',
      lightGray: '#f1f5f9',
      borderGray: '#e2e8f0'
    }
    
    let buffers: Buffer[] = []

    doc.on('data', (chunk: Buffer) => buffers.push(chunk))
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers)
      res.setHeader('Content-Type', 'application/pdf')
      const safeFilename = sanitizeFilename(`reporte_empleados_${getHondurasTimestamp().split('T')[0]}.pdf`)
      res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
      res.send(pdf)
    })

    // ===== PÁGINA 1: HEADER Y RESUMEN EJECUTIVO =====
    
    // Header mejorado con mejor diseño
    doc.rect(0, 0, pageWidth, 100).fill(colors.primary)
    doc.fillColor('white')
    doc.fontSize(24).font('Helvetica-Bold').text(
      'SISTEMA DE RECURSOS HUMANOS', 
      30, 25, 
      { align: 'center', width: pageWidth - 60 }
    )
    doc.fontSize(16).font('Helvetica').text(
      'Reporte de Empleados', 
      30, 55, 
      { align: 'center', width: pageWidth - 60 }
    )
    doc.fontSize(12).text(
      `Generado el ${formatDateForHonduras(nowInHonduras())}`, 
      30, 80, 
      { align: 'center', width: pageWidth - 60 }
    )
    
    doc.fillColor('#0f172a')
    
    // Información del reporte en caja destacada
    const infoBoxY = 120
    doc.roundedRect(30, infoBoxY, pageWidth - 60, 50, 5).fill(colors.lightGray).stroke(colors.borderGray)
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('INFORMACIÓN DEL REPORTE', 40, infoBoxY + 8)
    doc.fontSize(9).font('Helvetica').fillColor('#0f172a')
    doc.text(`Fecha de generación: ${formatDateForHonduras(nowInHonduras())}`, 40, infoBoxY + 22)
    doc.text(`Total de registros: ${reportData.employees.length}`, 40, infoBoxY + 35)
    
    // KPIs mejorados con diseño visual
    const kpiY = 190
    const kpiWidth = (pageWidth - 90) / 4
    const kpiHeight = 70
    
    // KPI 1: Total Empleados
    doc.roundedRect(30, kpiY, kpiWidth, kpiHeight, 8)
      .fill(colors.primary).stroke(colors.primaryDark)
    doc.fillColor('white')
    doc.fontSize(9).font('Helvetica').text('TOTAL', 35, kpiY + 8, { width: kpiWidth - 10, align: 'center' })
    doc.fontSize(24).font('Helvetica-Bold').text(reportData.stats.totalEmployees.toString(), 35, kpiY + 20, { width: kpiWidth - 10, align: 'center' })
    
    // KPI 2: Activos
    doc.roundedRect(30 + kpiWidth + 10, kpiY, kpiWidth, kpiHeight, 8)
      .fill(colors.success).stroke('#047857')
    doc.fillColor('white')
    doc.fontSize(9).font('Helvetica').text('ACTIVOS', 35 + kpiWidth + 10, kpiY + 8, { width: kpiWidth - 10, align: 'center' })
    doc.fontSize(24).font('Helvetica-Bold').text(reportData.stats.activeEmployees.toString(), 35 + kpiWidth + 10, kpiY + 20, { width: kpiWidth - 10, align: 'center' })
    
    // KPI 3: Inactivos
    doc.roundedRect(30 + (kpiWidth + 10) * 2, kpiY, kpiWidth, kpiHeight, 8)
      .fill(colors.warning).stroke('#b45309')
    doc.fillColor('white')
    doc.fontSize(9).font('Helvetica').text('INACTIVOS', 35 + (kpiWidth + 10) * 2, kpiY + 8, { width: kpiWidth - 10, align: 'center' })
    doc.fontSize(24).font('Helvetica-Bold').text(reportData.stats.inactiveEmployees.toString(), 35 + (kpiWidth + 10) * 2, kpiY + 20, { width: kpiWidth - 10, align: 'center' })
    
    // KPI 4: Terminados
    doc.roundedRect(30 + (kpiWidth + 10) * 3, kpiY, kpiWidth, kpiHeight, 8)
      .fill(colors.danger).stroke('#b91c1c')
    doc.fillColor('white')
    doc.fontSize(9).font('Helvetica').text('TERMINADOS', 35 + (kpiWidth + 10) * 3, kpiY + 8, { width: kpiWidth - 10, align: 'center' })
    doc.fontSize(24).font('Helvetica-Bold').text(reportData.stats.terminatedEmployees.toString(), 35 + (kpiWidth + 10) * 3, kpiY + 20, { width: kpiWidth - 10, align: 'center' })
    
    // Métricas financieras
    doc.fillColor('#0f172a')
    const metricsY = kpiY + kpiHeight + 20
    doc.roundedRect(30, metricsY, pageWidth - 60, 60, 8).fill(colors.lightGray).stroke(colors.borderGray)
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#475569').text('MÉTRICAS FINANCIERAS', 40, metricsY + 8)
    
    const formatHNL = (n: number) => `L. ${Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const metricColWidth = (pageWidth - 100) / 2
    doc.fontSize(9).font('Helvetica').fillColor('#0f172a')
    doc.text(`Salario Total:`, 40, metricsY + 25)
    doc.font('Helvetica-Bold').fillColor(colors.primary).text(formatHNL(reportData.stats.totalSalary), 150, metricsY + 25)
    
    doc.font('Helvetica').fillColor('#0f172a')
    doc.text(`Salario Promedio:`, 40, metricsY + 40)
    doc.font('Helvetica-Bold').fillColor(colors.primary).text(formatHNL(reportData.stats.averageSalary), 150, metricsY + 40)
    
    // Mensaje si no hay datos
    if (reportData.employees.length === 0) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.warning).text('⚠️ NO HAY EMPLEADOS REGISTRADOS', 40, metricsY + 70, { align: 'center', width: pageWidth - 80 })
      doc.fontSize(10).font('Helvetica').fillColor('#0f172a').text('No se encontraron empleados en el sistema.', 40, metricsY + 90, { align: 'center', width: pageWidth - 80 })
      doc.text('Agrega empleados desde la sección de Gestión de Empleados.', 40, metricsY + 105, { align: 'center', width: pageWidth - 80 })
    }
    
    // ===== PÁGINA 2: LISTA DE EMPLEADOS =====
    if (reportData.employees.length > 0) {
      doc.addPage()
      
      doc.fontSize(16).font('Helvetica-Bold').fillColor(colors.primary).text(
        'LISTA COMPLETA DE EMPLEADOS', 
        30, 30, 
        { align: 'center', width: pageWidth - 60 }
      )
      
      // Tabla de empleados mejorada
      const headers = ['Código', 'Nombre', 'Cargo', 'Departamento', 'Salario', 'Estado']
      const colWidths = [60, 120, 80, 100, 80, 60]
      const startX = 30
      let y = 70
      const rowHeight = 18
      
      // Header de tabla mejorado
      headers.forEach((h: string, i: number) => {
        const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
        doc.roundedRect(x, y, colWidths[i], rowHeight, 2)
          .fill(colors.primary)
          .stroke(colors.primaryDark)
        doc.fillColor('white')
        doc.fontSize(8).font('Helvetica-Bold').text(
          h, 
          x + 3, 
          y + 6, 
          { width: colWidths[i] - 6, align: 'center' }
        )
      })
      y += rowHeight
      
      // Datos de empleados con alternancia de colores
      let rowIndex = 0
      reportData.employees.forEach((emp: any) => {
        if (y > pageHeight - 60) {
          doc.addPage()
          y = 30
          // Re-dibujar headers en nueva página
          headers.forEach((h: string, i: number) => {
            const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
            doc.roundedRect(x, y, colWidths[i], rowHeight, 2)
              .fill(colors.primary)
              .stroke(colors.primaryDark)
            doc.fillColor('white')
            doc.fontSize(8).font('Helvetica-Bold').text(
              h, 
              x + 3, 
              y + 6, 
              { width: colWidths[i] - 6, align: 'center' }
            )
          })
          y += rowHeight
        }
        
        const isEven = rowIndex % 2 === 0
        const statusColors: Record<string, string> = {
          'active': colors.success,
          'inactive': colors.warning,
          'terminated': colors.danger
        }
        const statusLabels: Record<string, string> = {
          'active': 'Activo',
          'inactive': 'Inactivo',
          'terminated': 'Terminado'
        }
        
        headers.forEach((_h: string, i: number) => {
          const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
          
          // Fondo alternado
          if (isEven) {
            doc.rect(x, y, colWidths[i], rowHeight).fill(colors.lightGray)
          }
          doc.rect(x, y, colWidths[i], rowHeight).stroke(colors.borderGray)
          
          doc.fillColor('#0f172a')
          doc.fontSize(7).font('Helvetica')
          
          let value = ''
          switch (i) {
            case 0: // Código
              value = emp.employee_code || 'N/A'
              break
            case 1: // Nombre
              value = emp.name || 'N/A'
              break
            case 2: // Cargo
              value = emp.role || 'N/A'
              break
            case 3: // Departamento
              value = emp.departments?.name || 'N/A'
              break
            case 4: // Salario
              value = emp.base_salary ? formatHNL(emp.base_salary) : 'N/A'
              break
            case 5: // Estado
              value = statusLabels[emp.status] || emp.status || 'N/A'
              doc.fillColor(statusColors[emp.status] || '#0f172a')
              break
          }
          
          doc.text(value, x + 3, y + 5, { width: colWidths[i] - 6, align: 'center' })
          doc.fillColor('#0f172a')
        })
        
        y += rowHeight
        rowIndex++
      })
      
      // ===== PÁGINA 3: ESTADÍSTICAS POR DEPARTAMENTO =====
      if (reportData.departmentStats.length > 0) {
        doc.addPage()
        
        doc.fontSize(16).font('Helvetica-Bold').fillColor(colors.primary).text(
          'ESTADÍSTICAS POR DEPARTAMENTO', 
          30, 30, 
          { align: 'center', width: pageWidth - 60 }
        )
        
        // Tabla de departamentos mejorada
        const deptHeaders = ['Departamento', 'Empleados', 'Activos', 'Salario Total']
        const deptColWidths = [200, 100, 100, 150]
        const deptStartX = 30
        let deptY = 70
        
        // Header tabla departamentos
        deptHeaders.forEach((h: string, i: number) => {
          const x = deptStartX + deptColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
          doc.roundedRect(x, deptY, deptColWidths[i], rowHeight, 2)
            .fill(colors.primary)
            .stroke(colors.primaryDark)
          doc.fillColor('white')
          doc.fontSize(8).font('Helvetica-Bold').text(
            h, 
            x + 3, 
            deptY + 6, 
            { width: deptColWidths[i] - 6, align: 'center' }
          )
        })
        deptY += rowHeight
        
        // Datos de departamentos con alternancia
        let deptRowIndex = 0
        reportData.departmentStats.forEach((stat: any) => {
          if (deptY > pageHeight - 60) {
            doc.addPage()
            deptY = 30
            // Re-dibujar headers
            deptHeaders.forEach((h: string, i: number) => {
              const x = deptStartX + deptColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
              doc.roundedRect(x, deptY, deptColWidths[i], rowHeight, 2)
                .fill(colors.primary)
                .stroke(colors.primaryDark)
              doc.fillColor('white')
              doc.fontSize(8).font('Helvetica-Bold').text(
                h, 
                x + 3, 
                deptY + 6, 
                { width: deptColWidths[i] - 6, align: 'center' }
              )
            })
            deptY += rowHeight
          }
          
          const isEven = deptRowIndex % 2 === 0
          
          const values = [
            stat.department.name,
            stat.employeeCount.toString(),
            stat.activeCount.toString(),
            formatHNL(stat.totalSalary)
          ]
          
          values.forEach((val: any, i: number) => {
            const x = deptStartX + deptColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
            if (isEven) {
              doc.rect(x, deptY, deptColWidths[i], rowHeight).fill(colors.lightGray)
            }
            doc.rect(x, deptY, deptColWidths[i], rowHeight).stroke(colors.borderGray)
            doc.fillColor('#0f172a')
            doc.fontSize(7).font('Helvetica').text(
              val.toString(), 
              x + 3, 
              deptY + 5, 
              { width: deptColWidths[i] - 6, align: 'center' }
            )
          })
          deptY += rowHeight
          deptRowIndex++
        })
      }
    }
    
    // Footer mejorado
    doc.fillColor(colors.muted)
    doc.fontSize(8).font('Helvetica')
    doc.text(
      'Sistema de Recursos Humanos - Documento generado automáticamente', 
      30, 
      pageHeight - 40, 
      { align: 'center', width: pageWidth - 60 }
    )
    doc.text(
      `Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, 
      30, 
      pageHeight - 25, 
      { align: 'center', width: pageWidth - 60 }
    )

    doc.end()
  } catch (error) {
    console.error('Error generando PDF de empleados:', error)
    throw error
  }
}

async function generateEmployeeExcelReport(res: NextApiResponse, reportData: any) {
  try {
    const workbook = new ExcelJS.Workbook()
    
    // Hoja 1: Lista de Empleados
    const sheet = workbook.addWorksheet('Empleados')
    sheet.columns = [
      { header: 'Código', key: 'code', width: 12 },
      { header: 'DNI', key: 'dni', width: 15 },
      { header: 'Nombre', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Teléfono', key: 'phone', width: 15 },
      { header: 'Cargo', key: 'role', width: 20 },
      { header: 'Departamento', key: 'department', width: 20 },
      { header: 'Salario Base', key: 'salary', width: 15 },
      { header: 'Fecha Ingreso', key: 'hire_date', width: 14 },
      { header: 'Estado', key: 'status', width: 12 }
    ]

    const formatHNL = (n: number) => `L. ${Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    
    for (const emp of reportData.employees) {
      sheet.addRow({
        code: emp.employee_code || '',
        dni: emp.dni || '',
        name: emp.name || '',
        email: emp.email || '',
        phone: emp.phone || '',
        role: emp.role || '',
        department: emp.departments?.name || 'Sin Departamento',
        salary: formatHNL(emp.base_salary || 0),
        hire_date: emp.hire_date ? formatDateOnlyForHonduras(emp.hire_date) : '',
        status: emp.status === 'active' ? 'Activo' : emp.status === 'inactive' ? 'Inactivo' : 'Terminado'
      })
    }

    // Estilo del encabezado
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1e40af' }
    }
    sheet.getRow(1).font = { ...sheet.getRow(1).font, color: { argb: 'FFFFFFFF' } }

    // Hoja 2: Resumen
    const summarySheet = workbook.addWorksheet('Resumen')
    summarySheet.columns = [
      { header: 'Concepto', key: 'concept', width: 30 },
      { header: 'Valor', key: 'value', width: 20 }
    ]

    summarySheet.addRow({ concept: 'Total Empleados', value: reportData.stats.totalEmployees })
    summarySheet.addRow({ concept: 'Empleados Activos', value: reportData.stats.activeEmployees })
    summarySheet.addRow({ concept: 'Empleados Inactivos', value: reportData.stats.inactiveEmployees })
    summarySheet.addRow({ concept: 'Empleados Terminados', value: reportData.stats.terminatedEmployees })
    summarySheet.addRow({ concept: 'Salario Total', value: formatHNL(reportData.stats.totalSalary) })
    summarySheet.addRow({ concept: 'Salario Promedio', value: formatHNL(reportData.stats.averageSalary) })

    summarySheet.getRow(1).font = { bold: true }
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Hoja 3: Estadísticas por Departamento
    if (reportData.departmentStats.length > 0) {
      const deptSheet = workbook.addWorksheet('Por Departamento')
      deptSheet.columns = [
        { header: 'Departamento', key: 'department', width: 25 },
        { header: 'Total Empleados', key: 'total', width: 15 },
        { header: 'Activos', key: 'active', width: 15 },
        { header: 'Salario Total', key: 'salary', width: 20 }
      ]

      for (const stat of reportData.departmentStats) {
        deptSheet.addRow({
          department: stat.department.name,
          total: stat.employeeCount,
          active: stat.activeCount,
          salary: formatHNL(stat.totalSalary)
        })
      }

      deptSheet.getRow(1).font = { bold: true }
      deptSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    const safeFilename = sanitizeFilename(`reporte_empleados_${getHondurasTimestamp().split('T')[0]}.xlsx`)
    res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
    res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('Error generando Excel de empleados:', error)
    throw error
  }
}

function generateEmployeeCSVReport(res: NextApiResponse, reportData: any) {
  try {
    let csvContent = ''
    
    // Header del reporte
    csvContent += 'REPORTE DE EMPLEADOS\n'
    csvContent += `Fecha de generación: ${formatDateForHonduras(nowInHonduras())}\n`
    csvContent += `Total de empleados: ${reportData.employees.length}\n\n`
    
    // Resumen ejecutivo
    csvContent += 'RESUMEN EJECUTIVO\n'
    csvContent += `Total Empleados,${reportData.stats.totalEmployees}\n`
    csvContent += `Empleados Activos,${reportData.stats.activeEmployees}\n`
    csvContent += `Empleados Inactivos,${reportData.stats.inactiveEmployees}\n`
    csvContent += `Empleados Terminados,${reportData.stats.terminatedEmployees}\n`
    csvContent += `Salario Total,L. ${reportData.stats.totalSalary.toLocaleString('es-HN')}\n`
    csvContent += `Salario Promedio,L. ${reportData.stats.averageSalary.toLocaleString('es-HN')}\n\n`
    
    // Lista de empleados
    csvContent += 'LISTA DE EMPLEADOS\n'
    csvContent += 'Código,Nombre,Email,Cargo,Departamento,Salario,Estado,Fecha Contratación\n'
    
    reportData.employees.forEach((emp: any) => {
      csvContent += `${emp.employee_code || 'N/A'},`
      csvContent += `${emp.name || 'N/A'},`
      csvContent += `${emp.email || 'N/A'},`
      csvContent += `${emp.role || 'N/A'},`
      csvContent += `${emp.departments?.name || 'N/A'},`
      csvContent += `${emp.base_salary ? `L. ${emp.base_salary.toLocaleString('es-HN')}` : 'N/A'},`
      csvContent += `${emp.status === 'active' ? 'Activo' : emp.status === 'inactive' ? 'Inactivo' : 'Terminado'},`
      csvContent += `${emp.hire_date ? formatDateOnlyForHonduras(emp.hire_date) : 'N/A'}\n`
    })
    
    // Estadísticas por departamento
    if (reportData.departmentStats.length > 0) {
      csvContent += '\nESTADÍSTICAS POR DEPARTAMENTO\n'
      csvContent += 'Departamento,Empleados,Activos,Salario Total\n'
      
      reportData.departmentStats.forEach((stat: any) => {
        csvContent += `${stat.department.name},`
        csvContent += `${stat.employeeCount},`
        csvContent += `${stat.activeCount},`
        csvContent += `L. ${stat.totalSalary.toLocaleString('es-HN')}\n`
      })
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    const safeFilename = sanitizeFilename(`reporte_empleados_${getHondurasTimestamp().split('T')[0]}.csv`)
    res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
    res.send(csvContent)
  } catch (error) {
    console.error('Error generando CSV de empleados:', error)
    throw error
  }
} 