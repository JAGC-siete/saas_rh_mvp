import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { validatePayrollExport, sanitizeFilename } from '../../../lib/security/payroll-validation'
import { withExportRateLimit } from '../../../lib/security/rate-limiting'
import { getCustomFields } from '../../../lib/payroll-client-specific'

// Usar exceljs para generar Excel (más seguro que xlsx)
import ExcelJS from 'exceljs'

// Aplicar rate limiting
const handlerWithSecurity = withExportRateLimit()(payrollExportHandler)

export default handlerWithSecurity

async function payrollExportHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // AUTENTICACIÓN ESTANDARIZADA - Usar requireCompanyAccess
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Verificar roles específicos para exportar nómina
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para exportar nómina'
      })
    }

    // VALIDACIÓN SEGURA CON ZOD
    const validation = validatePayrollExport(req.body)
    if (!validation.success) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        message: validation.error?.message,
        details: validation.error?.details,
        timestamp: new Date().toISOString()
      })
    }

    const { periodo, formato } = validation.data!

    // MIGRADO: Usar payroll_run_lines en lugar de payroll_records
    // Parse periodo to get year and month
    const [year, month] = periodo.split('-').map(Number)
    
    // Get payroll runs for this period
    const { data: payrollRuns, error: runsError } = await supabase
      .from('payroll_runs')
      .select('id')
      .eq('company_id', companyId)
      .eq('year', year)
      .eq('month', month)
    
    if (runsError || !payrollRuns || payrollRuns.length === 0) {
      return res.status(404).json({ 
        error: 'No hay registros',
        message: 'No se encontraron corridas de nómina para el período especificado'
      })
    }
    
    const runIds = payrollRuns.map((run: any) => run.id)
    
    // Get payroll lines with employee data
    const { data: payrollLines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select(`
        *,
        employees!payroll_run_lines_employee_id_fkey(
          name,
          dni,
          employee_code,
          base_salary,
          bank_name,
          bank_account,
          departments!employees_department_id_fkey(name)
        )
      `)
      .in('run_id', runIds)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (linesError || !payrollLines || payrollLines.length === 0) {
      return res.status(404).json({ 
        error: 'No hay registros',
        message: 'No se encontraron líneas de nómina para el período especificado'
      })
    }

    console.log(`Exportando ${payrollLines.length} líneas de nómina para ${periodo}`)

    if (formato === 'excel') {
      // Get custom fields configuration
      const customFieldsConfig = await getCustomFields(companyId, supabase)
      
      // Get full config from DB to get category information
      let pdfCustomFieldsConfig: Record<string, any> | undefined = undefined
      if (customFieldsConfig) {
        const { data: payrollConfig } = await supabase
          .from('company_payroll_configs')
          .select('custom_fields')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .single()
        
        if (payrollConfig?.custom_fields) {
          pdfCustomFieldsConfig = payrollConfig.custom_fields as Record<string, any>
        }
      }
      
      return exportToExcel(payrollLines, periodo, res, pdfCustomFieldsConfig)
    } else if (formato === 'pdf') {
      return res.status(400).json({ error: 'El PDF consolidado ahora está en /api/payroll/report' })
    } else if (formato === 'recibo-individual') {
      return res.status(400).json({ error: 'El recibo individual ahora está en /api/payroll/receipt' })
    } else {
      return res.status(400).json({ error: 'Formato no soportado. Use "excel"' })
    }

  } catch (error) {
    console.error('Error en exportación:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

async function exportToExcel(
  payrollLines: any[], 
  periodo: string, 
  res: NextApiResponse,
  customFieldsConfig?: Record<string, any>
) {
  try {
    // Extract custom fields by category
    const earningsFields: Array<{ name: string; label: string }> = []
    const deductionsFields: Array<{ name: string; label: string }> = []
    
    if (customFieldsConfig) {
      for (const [fieldName, fieldDef] of Object.entries(customFieldsConfig)) {
        const def = typeof fieldDef === 'string' 
          ? { label: fieldDef, category: 'earnings' as const, type: 'number' as const, required: false, default: 0 }
          : fieldDef
        
        if (def.category === 'earnings') {
          earningsFields.push({ name: fieldName, label: def.label || fieldName })
        } else if (def.category === 'deductions') {
          deductionsFields.push({ name: fieldName, label: def.label || fieldName })
        }
      }
    }
    
    // Helper to get custom field value from metadata
    const getCustomFieldValue = (line: any, fieldName: string): number => {
      if (!line.metadata || !line.metadata[fieldName]) {
        return 0
      }
      const value = line.metadata[fieldName]
      if (typeof value === 'number') {
        return value
      } else if (typeof value === 'boolean') {
        return value ? 1 : 0
      }
      return parseFloat(String(value)) || 0
    }
    
    // Preparar datos para Excel
    const excelData = payrollLines.map(line => {
      const baseData: Record<string, any> = {
        'Código': line.employees?.employee_code || line.employees?.dni || '',
        'Nombre': line.employees?.name || '',
        'Departamento': line.employees?.departments?.name || 'Sin Departamento',
        'Banco': line.employees?.bank_name || '',
        'Cuenta': line.employees?.bank_account || '',
        'Salario Base': Number(line.employees?.base_salary) || 0,
        'Horas Trabajadas': Number(line.eff_hours) || 0,
        'Días Trabajados': (Number(line.eff_hours) || 0) / 8,
        'Salario Bruto': Number(line.eff_bruto) || 0,
        'ISR': Number(line.eff_isr) || 0,
        'IHSS': Number(line.eff_ihss) || 0,
        'RAP': Number(line.eff_rap) || 0,
        'Salario Neto': Number(line.eff_neto) || 0,
        'Editado': line.edited ? 'Sí' : 'No',
        'Generado': new Date(line.created_at).toLocaleDateString('es-HN')
      }
      
      // Add custom earnings fields
      for (const field of earningsFields) {
        baseData[field.label] = getCustomFieldValue(line, field.name)
      }
      
      // Add custom deductions fields
      for (const field of deductionsFields) {
        baseData[field.label] = getCustomFieldValue(line, field.name)
      }
      
      // Calculate total deductions (statutory + custom)
      const statutoryDeductions = (Number(line.eff_ihss) || 0) + 
                                  (Number(line.eff_rap) || 0) + 
                                  (Number(line.eff_isr) || 0)
      const customDeductions = deductionsFields.reduce((sum, field) => 
        sum + getCustomFieldValue(line, field.name), 0)
      baseData['Total Deducciones'] = statutoryDeductions + customDeductions
      
      return baseData
    })

    // Preparar datos de resumen
    const totalBruto = excelData.reduce((sum, r) => sum + (r['Salario Bruto'] || 0), 0)
    const totalDeducciones = excelData.reduce((sum, r) => sum + (r['Total Deducciones'] || 0), 0)
    const totalNeto = excelData.reduce((sum, r) => sum + (r['Salario Neto'] || 0), 0)
    const totalEmpleados = excelData.length

    const resumenData = [
      { 'Concepto': 'Total Empleados', 'Valor': totalEmpleados },
      { 'Concepto': 'Total Salario Bruto', 'Valor': totalBruto },
      { 'Concepto': 'Total Deducciones', 'Valor': totalDeducciones },
      { 'Concepto': 'Total Salario Neto', 'Valor': totalNeto },
      { 'Concepto': 'Promedio Salario Neto', 'Valor': totalEmpleados > 0 ? totalNeto / totalEmpleados : 0 }
    ]

    // Preparar datos por departamento
    const deptData: { [key: string]: any } = {}
    excelData.forEach(row => {
      const dept = row['Departamento'] || 'Sin Departamento'
      if (!deptData[dept]) {
        deptData[dept] = {
          empleados: 0,
          totalBruto: 0,
          totalDeducciones: 0,
          totalNeto: 0
        }
      }
      deptData[dept].empleados++
      deptData[dept].totalBruto += row['Salario Bruto'] || 0
      deptData[dept].totalDeducciones += row['Total Deducciones'] || 0
      deptData[dept].totalNeto += row['Salario Neto'] || 0
    })

    const deptSheetData = Object.entries(deptData).map(([dept, data]: [string, any]) => ({
      'Departamento': dept,
      'Empleados': data.empleados,
      'Total Bruto': data.totalBruto,
      'Total Deducciones': data.totalDeducciones,
      'Total Neto': data.totalNeto,
      'Promedio Neto': data.totalNeto / data.empleados
    }))

    // Crear workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Nómina')
    
    // Build column definitions dynamically
    const columnDefs: Array<{ header: string; key: string; width: number }> = [
      { header: 'Código', key: 'Código', width: 12 },
      { header: 'Nombre', key: 'Nombre', width: 25 },
      { header: 'Departamento', key: 'Departamento', width: 20 },
      { header: 'Banco', key: 'Banco', width: 15 },
      { header: 'Cuenta', key: 'Cuenta', width: 20 },
      { header: 'Salario Base', key: 'Salario Base', width: 12 },
      { header: 'Horas Trabajadas', key: 'Horas Trabajadas', width: 12 },
      { header: 'Días Trabajados', key: 'Días Trabajados', width: 12 }
    ]
    
    // Add custom earnings columns
    for (const field of earningsFields) {
      columnDefs.push({ header: field.label, key: field.label, width: 15 })
    }
    
    // Add standard columns
    columnDefs.push(
      { header: 'Salario Bruto', key: 'Salario Bruto', width: 12 },
      { header: 'ISR', key: 'ISR', width: 10 },
      { header: 'IHSS', key: 'IHSS', width: 10 },
      { header: 'RAP', key: 'RAP', width: 10 }
    )
    
    // Add custom deductions columns
    for (const field of deductionsFields) {
      columnDefs.push({ header: field.label, key: field.label, width: 15 })
    }
    
    // Add final columns
    columnDefs.push(
      { header: 'Total Deducciones', key: 'Total Deducciones', width: 15 },
      { header: 'Salario Neto', key: 'Salario Neto', width: 12 },
      { header: 'Editado', key: 'Editado', width: 10 },
      { header: 'Generado', key: 'Generado', width: 12 }
    )
    
    worksheet.columns = columnDefs

    // Agregar datos
    excelData.forEach(row => {
      worksheet.addRow(row)
    })

    // Estilo para el encabezado
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Agregar hoja de resumen
    const resumenSheet = workbook.addWorksheet('Resumen')
    resumenSheet.columns = [
      { header: 'Concepto', key: 'Concepto', width: 25 },
      { header: 'Valor', key: 'Valor', width: 15 }
    ]

    resumenData.forEach(row => {
      resumenSheet.addRow(row)
    })

    // Estilo para el resumen
    resumenSheet.getRow(1).font = { bold: true }
    resumenSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Agregar hoja por departamento
    const deptSheet = workbook.addWorksheet('Por Departamento')
    deptSheet.columns = [
      { header: 'Departamento', key: 'Departamento', width: 20 },
      { header: 'Empleados', key: 'Empleados', width: 12 },
      { header: 'Total Bruto', key: 'Total Bruto', width: 15 },
      { header: 'Total Deducciones', key: 'Total Deducciones', width: 15 },
      { header: 'Total Neto', key: 'Total Neto', width: 15 },
      { header: 'Promedio Neto', key: 'Promedio Neto', width: 15 }
    ]

    deptSheetData.forEach(row => {
      deptSheet.addRow(row)
    })

    // Estilo para departamentos
    deptSheet.getRow(1).font = { bold: true }
    deptSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // Generar buffer
    const excelBuffer = await workbook.xlsx.writeBuffer()

    // Sanitizar nombre de archivo
    const safeFilename = sanitizeFilename(`nomina_paragon_${periodo}.xlsx`)
    
    // Enviar respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=${safeFilename}`)
    res.send(excelBuffer)

  } catch (error) {
    console.error('Error generando Excel:', error)
    return res.status(500).json({ error: 'Error generando archivo Excel' })
  }
}

// PDF flows moved to /api/payroll/report and /api/payroll/receipt