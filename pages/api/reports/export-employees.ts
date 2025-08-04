import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 🔒 AUTENTICACIÓN REQUERIDA CON MISMOS PERMISOS QUE PAYROLL
    const authResult = await authenticateUser(req, res, ['can_view_reports', 'can_manage_employees'])
    
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult
    const supabase = createClient(req, res)

    console.log('🔐 Usuario autenticado para reporte de empleados:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    const { format, reportType } = req.body
    
    // Validaciones
    if (!format || !['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'Formato inválido (debe ser pdf o csv)' })
    }

    console.log('📊 Generando reporte de empleados:', {
      format,
      reportType,
      user: user.email
    })

    // Obtener datos del reporte
    const reportData = await generateEmployeeReportData(supabase, userProfile)

    if (format === 'pdf') {
      return generateEmployeePDFReport(res, reportData)
    } else {
      return generateEmployeeCSVReport(res, reportData)
    }

  } catch (error) {
    console.error('Error generando reporte de empleados:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

async function generateEmployeeReportData(supabase: any, userProfile: any) {
  // Obtener empleados activos
  let employeesQuery = supabase
    .from('employees')
    .select('id, name, dni, employee_code, email, phone, role, position, base_salary, hire_date, status, bank_name, bank_account, department_id, created_at')
    .order('name')

  // Si el usuario tiene company_id, filtrar por empresa (mismo patrón que payroll)
  if (userProfile?.company_id) {
    employeesQuery = employeesQuery.eq('company_id', userProfile.company_id)
  }

  const { data: employees, error: empError } = await employeesQuery

  if (empError) {
    console.error('Error obteniendo empleados:', empError)
    throw new Error('Error obteniendo empleados')
  }

  // Obtener departamentos
  let departmentsQuery = supabase
    .from('departments')
    .select('id, name')

  if (userProfile?.company_id) {
    departmentsQuery = departmentsQuery.eq('company_id', userProfile.company_id)
  }

  const { data: departments, error: deptError } = await departmentsQuery

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
      res.setHeader('Content-Disposition', `attachment; filename=reporte_empleados_${new Date().toISOString().split('T')[0]}.pdf`)
      res.send(pdf)
    })

    // ===== PÁGINA 1: HEADER Y RESUMEN EJECUTIVO =====
    
    // Header con branding
    doc.rect(0, 0, 595, 80).fill('#1e40af')
    doc.fillColor('white')
    doc.fontSize(20).text('SISTEMA DE RECURSOS HUMANOS', 30, 20, { align: 'center', width: 535 })
    doc.fontSize(16).text('Reporte de Empleados', 30, 45, { align: 'center', width: 535 })
    doc.fontSize(12).text(`Fecha de generación: ${new Date().toLocaleDateString('es-HN')}`, 30, 65, { align: 'center', width: 535 })
    
    // Reset colors
    doc.fillColor('black')
    
    // Información del reporte
    doc.fontSize(10).text('INFORMACIÓN DEL REPORTE:', 30, 100)
    doc.fontSize(9).text(`Tipo: Reporte de Empleados`, 30, 115)
    doc.fontSize(9).text(`Fecha de generación: ${new Date().toLocaleDateString('es-HN')}`, 30, 130)
    doc.fontSize(9).text(`Total de empleados: ${reportData.stats.totalEmployees}`, 30, 145)
    
    // Resumen ejecutivo
    doc.rect(30, 170, 535, 100).stroke()
    doc.fontSize(14).text('RESUMEN EJECUTIVO', 35, 180)
    
    doc.fontSize(10).text('Total Empleados:', 40, 200)
    doc.fontSize(10).text(reportData.stats.totalEmployees.toString(), 200, 200)
    
    doc.fontSize(10).text('Empleados Activos:', 40, 215)
    doc.fontSize(10).text(reportData.stats.activeEmployees.toString(), 200, 215)
    
    doc.fontSize(10).text('Empleados Inactivos:', 40, 230)
    doc.fontSize(10).text(reportData.stats.inactiveEmployees.toString(), 200, 230)
    
    doc.fontSize(10).text('Empleados Terminados:', 40, 245)
    doc.fontSize(10).text(reportData.stats.terminatedEmployees.toString(), 200, 245)
    
    doc.fontSize(10).text('Nómina Total:', 40, 260)
    doc.fontSize(10).text(`L. ${reportData.stats.totalSalary.toFixed(2)}`, 200, 260)
    
    doc.fontSize(10).text('Salario Promedio:', 40, 275)
    doc.fontSize(10).text(`L. ${reportData.stats.averageSalary.toFixed(2)}`, 200, 275)
    
    // ===== PÁGINA 2: ESTADÍSTICAS POR DEPARTAMENTO =====
    doc.addPage()
    
    doc.fontSize(14).text('ESTADÍSTICAS POR DEPARTAMENTO', 30, 30, { align: 'center', width: 535 })
    
    // Tabla de departamentos
    const headers = ['Departamento', 'Total Empleados', 'Activos', 'Nómina Total']
    const colWidths = [150, 100, 80, 100]
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
    reportData.departmentStats.forEach((stat: any) => {
      if (y > 750) {
        doc.addPage()
        y = 30
      }
      
      const values = [
        stat.department.name,
        stat.employeeCount.toString(),
        stat.activeCount.toString(),
        `L. ${stat.totalSalary.toFixed(2)}`
      ]
      
      values.forEach((val: any, i: number) => {
        const x = startX + colWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
        doc.rect(x, y, colWidths[i], rowHeight).stroke()
        doc.fontSize(7).text(val.toString(), x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
      })
      y += rowHeight
    })
    
    // ===== PÁGINA 3: LISTA DE EMPLEADOS =====
    doc.addPage()
    
    doc.fontSize(14).text('LISTA DE EMPLEADOS', 30, 30, { align: 'center', width: 535 })
    
    // Tabla de empleados
    const empHeaders = ['Código', 'Nombre', 'Departamento', 'Posición', 'Salario', 'Estado']
    const empColWidths = [60, 120, 80, 80, 80, 60]
    const empStartX = 30
    let empY = 70
    
    // Header tabla empleados
    empHeaders.forEach((h: string, i: number) => {
      const x = empStartX + empColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
      doc.rect(x, empY, empColWidths[i], rowHeight).fillAndStroke('#1e40af', '#000')
      doc.fillColor('white')
      doc.fontSize(8).text(h, x + 2, empY + 4, { width: empColWidths[i] - 4, align: 'center' })
      doc.fillColor('black')
    })
    empY += rowHeight
    
    // Datos de empleados
    reportData.employees.forEach((emp: any) => {
      if (empY > 750) {
        doc.addPage()
        empY = 30
      }
      
      const department = reportData.departments.find((d: any) => d.id === emp.department_id)
      
      const values = [
        emp.employee_code || emp.dni,
        emp.name,
        department?.name || 'Sin Departamento',
        emp.position,
        `L. ${(emp.base_salary || 0).toFixed(2)}`,
        emp.status
      ]
      
      values.forEach((val: any, i: number) => {
        const x = empStartX + empColWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0)
        doc.rect(x, empY, empColWidths[i], rowHeight).stroke()
        doc.fontSize(7).text(val.toString(), x + 2, empY + 4, { width: empColWidths[i] - 4, align: 'center' })
      })
      empY += rowHeight
    })
    
    // Pie de página
    doc.fontSize(8).text('Documento generado automáticamente - Sistema de Recursos Humanos', 30, 800, { align: 'center', width: 535 })
    doc.fontSize(8).text(`Fecha de generación: ${new Date().toLocaleString('es-HN')}`, 30, 815, { align: 'center', width: 535 })

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
    csvContent += `Fecha de generación: ${new Date().toLocaleDateString('es-HN')}\n\n`
    
    // Resumen ejecutivo
    csvContent += 'RESUMEN EJECUTIVO\n'
    csvContent += 'Métrica,Valor\n'
    csvContent += `Total Empleados,${reportData.stats.totalEmployees}\n`
    csvContent += `Empleados Activos,${reportData.stats.activeEmployees}\n`
    csvContent += `Empleados Inactivos,${reportData.stats.inactiveEmployees}\n`
    csvContent += `Empleados Terminados,${reportData.stats.terminatedEmployees}\n`
    csvContent += `Nómina Total,L. ${reportData.stats.totalSalary.toFixed(2)}\n`
    csvContent += `Salario Promedio,L. ${reportData.stats.averageSalary.toFixed(2)}\n\n`
    
    // Estadísticas por departamento
    csvContent += 'ESTADÍSTICAS POR DEPARTAMENTO\n'
    csvContent += 'Departamento,Total Empleados,Activos,Nómina Total\n'
    reportData.departmentStats.forEach((stat: any) => {
      csvContent += `"${stat.department.name}",${stat.employeeCount},${stat.activeCount},L. ${stat.totalSalary.toFixed(2)}\n`
    })
    csvContent += '\n'
    
    // Lista de empleados
    csvContent += 'LISTA DE EMPLEADOS\n'
    csvContent += 'Código,Nombre,Departamento,Posición,Email,Teléfono,Salario,Estado,Fecha Contratación\n'
    reportData.employees.forEach((emp: any) => {
      const department = reportData.departments.find((d: any) => d.id === emp.department_id)
      csvContent += `"${emp.employee_code || emp.dni}","${emp.name}","${department?.name || 'Sin Departamento'}","${emp.position}","${emp.email}","${emp.phone}",L. ${(emp.base_salary || 0).toFixed(2)},${emp.status},"${emp.hire_date}"\n`
    })
    
    // Configurar respuesta CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=reporte_empleados_${new Date().toISOString().split('T')[0]}.csv`)
    res.send(csvContent)
    
  } catch (error) {
    console.error('Error generando CSV de empleados:', error)
    throw error
  }
} 