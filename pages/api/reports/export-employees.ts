import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'
import { getCompanyData } from '../../../lib/helpers/company-filter'
import { getHondurasTimestamp, formatDateForHonduras, nowInHonduras, formatDateTimeForHonduras } from '../../../lib/timezone'
import { 
  withExportSecurity, 
  validateCompanyAccess, 
  buildSecureQuery, 
  secureLog,
  sanitizeFilename
} from '../../../lib/security/export-security'

// Aplicar seguridad de exportación
const handlerWithSecurity = withExportSecurity(exportEmployeesHandler)

export default handlerWithSecurity

async function exportEmployeesHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const { format = 'pdf' } = req.body
    
    // Validaciones
    if (!format || !['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Formato inválido (debe ser pdf o csv)' })
    }

    console.log('📊 Generando reporte de empleados:', { 
      format, 
      companyId 
    })

    // Obtener datos del reporte
    const reportData = await generateEmployeeReportData(supabase, companyId)

    if (format === 'pdf') {
      return generateEmployeePDFReport(res, reportData)
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

async function generateEmployeeReportData(supabase: any, companyId: string) {
  // Obtener empleados activos con información completa usando getCompanyData
  const { data: employees, error: empError } = await getCompanyData(
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
  ).order('name')

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
    
    // Header con branding
    doc.rect(0, 0, 595, 80).fill('#1e40af')
    doc.fillColor('white')
    doc.fontSize(20).text('SISTEMA DE RECURSOS HUMANOS', 30, 20, { align: 'center', width: 535 })
    doc.fontSize(16).text('Reporte de Empleados', 30, 45, { align: 'center', width: 535 })
    doc.fontSize(12).text(`Generado el ${formatDateForHonduras(nowInHonduras())}`, 30, 65, { align: 'center', width: 535 })
    
    // Reset colors
    doc.fillColor('black')
    
    // Información del reporte
    doc.fontSize(10).text('INFORMACIÓN DEL REPORTE:', 30, 100)
    doc.fontSize(9).text(`Fecha de generación: ${formatDateForHonduras(nowInHonduras())}`, 30, 115)
    doc.fontSize(9).text(`Tipo: Reporte Completo de Empleados`, 30, 130)
    doc.fontSize(9).text(`Total de registros: ${reportData.employees.length}`, 30, 145)
    
    // Resumen ejecutivo
    doc.rect(30, 170, 535, 120).stroke()
    doc.fontSize(14).text('RESUMEN EJECUTIVO', 35, 180)
    
    doc.fontSize(10).text('Total Empleados:', 40, 200)
    doc.fontSize(10).text(reportData.stats.totalEmployees.toString(), 200, 200)
    
    doc.fontSize(10).text('Empleados Activos:', 40, 215)
    doc.fontSize(10).text(reportData.stats.activeEmployees.toString(), 200, 215)
    
    doc.fontSize(10).text('Empleados Inactivos:', 40, 230)
    doc.fontSize(10).text(reportData.stats.inactiveEmployees.toString(), 200, 230)
    
    doc.fontSize(10).text('Empleados Terminados:', 40, 245)
    doc.fontSize(10).text(reportData.stats.terminatedEmployees.toString(), 200, 245)
    
    doc.fontSize(10).text('Salario Total:', 40, 260)
    doc.fontSize(10).text(`L. ${reportData.stats.totalSalary.toLocaleString('es-HN')}`, 200, 260)
    
    doc.fontSize(10).text('Salario Promedio:', 40, 275)
    doc.fontSize(10).text(`L. ${reportData.stats.averageSalary.toLocaleString('es-HN')}`, 200, 275)
    
    // Mensaje si no hay datos
    if (reportData.employees.length === 0) {
      doc.fontSize(12).text('⚠️ NO HAY EMPLEADOS REGISTRADOS', 40, 300, { align: 'center', width: 455 })
      doc.fontSize(10).text('No se encontraron empleados en el sistema.', 40, 320, { align: 'center', width: 455 })
      doc.fontSize(10).text('Agrega empleados desde la sección de Gestión de Empleados.', 40, 335, { align: 'center', width: 455 })
    }
    
    // ===== PÁGINA 2: LISTA DE EMPLEADOS =====
    if (reportData.employees.length > 0) {
      doc.addPage()
      
      doc.fontSize(14).text('LISTA COMPLETA DE EMPLEADOS', 30, 30, { align: 'center', width: 535 })
      
      // Tabla de empleados
      const headers = ['Código', 'Nombre', 'Cargo', 'Departamento', 'Salario', 'Estado']
      const colWidths = [60, 120, 80, 100, 80, 60]
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
      
      // Datos de empleados
      reportData.employees.forEach((emp: any) => {
        if (y > 750) {
          doc.addPage()
          y = 30
        }
        
        const values = [
          emp.employee_code || 'N/A',
          emp.name || 'N/A',
          emp.role || 'N/A',
          emp.departments?.name || 'N/A',
          emp.base_salary ? `L. ${emp.base_salary.toLocaleString('es-HN')}` : 'N/A',
          emp.status === 'active' ? 'Activo' : emp.status === 'inactive' ? 'Inactivo' : 'Terminado'
        ]
        
        values.forEach((val: any, i: number) => {
          const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
          doc.rect(x, y, colWidths[i], rowHeight).stroke()
          doc.fontSize(7).text(val.toString(), x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
        })
        y += rowHeight
      })
      
      // ===== PÁGINA 3: ESTADÍSTICAS POR DEPARTAMENTO =====
      if (reportData.departmentStats.length > 0) {
        doc.addPage()
        
        doc.fontSize(14).text('ESTADÍSTICAS POR DEPARTAMENTO', 30, 30, { align: 'center', width: 535 })
        
        // Tabla de departamentos
        const deptHeaders = ['Departamento', 'Empleados', 'Activos', 'Salario Total']
        const deptColWidths = [150, 80, 80, 120]
        const deptStartX = 30
        let deptY = 70
        
        // Header tabla departamentos
        deptHeaders.forEach((h: string, i: number) => {
          const x = deptStartX + deptColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
          doc.rect(x, deptY, deptColWidths[i], rowHeight).fillAndStroke('#1e40af', '#000')
          doc.fillColor('white')
          doc.fontSize(8).text(h, x + 2, deptY + 4, { width: deptColWidths[i] - 4, align: 'center' })
          doc.fillColor('black')
        })
        deptY += rowHeight
        
        // Datos de departamentos
        reportData.departmentStats.forEach((stat: any) => {
          if (deptY > 750) {
            doc.addPage()
            deptY = 30
          }
          
          const values = [
            stat.department.name,
            stat.employeeCount.toString(),
            stat.activeCount.toString(),
            `L. ${stat.totalSalary.toLocaleString('es-HN')}`
          ]
          
          values.forEach((val: any, i: number) => {
            const x = deptStartX + deptColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
            doc.rect(x, deptY, deptColWidths[i], rowHeight).stroke()
            doc.fontSize(7).text(val.toString(), x + 2, deptY + 4, { width: deptColWidths[i] - 4, align: 'center' })
          })
          deptY += rowHeight
        })
      }
    }
    
    // Pie de página
    doc.fontSize(8).text('Documento generado automáticamente - Sistema de Recursos Humanos', 30, 800, { align: 'center', width: 535 })
    doc.fontSize(8).text(`Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, 30, 815, { align: 'center', width: 535 })

    doc.end()
  } catch (error) {
    console.error('Error generando PDF de empleados:', error)
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
      csvContent += `${emp.hire_date ? new Date(emp.hire_date + 'T00:00:00').toLocaleDateString('es-HN') : 'N/A'}\n`
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