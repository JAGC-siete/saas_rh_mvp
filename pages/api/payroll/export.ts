import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

// Usar exceljs para generar Excel (más seguro que xlsx)
import ExcelJS from 'exceljs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN REQUERIDA
    const supabase = createClient(req, res)
    // Get user with getUser() to validate token with Supabase server
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ 
        error: 'No autorizado',
        message: 'Debe iniciar sesión para exportar nómina'
      })
    }

    // Verificar permisos del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, permissions, company_id')
      .eq('id', user.id)
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

    console.log(`Exportando ${payrollRecords.length} registros de nómina para ${periodo}`)

    if (formato === 'excel') {
      return exportToExcel(payrollRecords, periodo, res)
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

async function exportToExcel(payrollRecords: any[], periodo: string, res: NextApiResponse) {
  try {
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

    // Preparar datos de resumen
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

    // Preparar datos por departamento
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

    // Crear workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Nómina')
    
    // Agregar datos a la hoja principal
    worksheet.columns = [
      { header: 'Código', key: 'Código', width: 12 },
      { header: 'Nombre', key: 'Nombre', width: 25 },
      { header: 'Departamento', key: 'Departamento', width: 15 },
      { header: 'Posición', key: 'Posición', width: 20 },
      { header: 'Banco', key: 'Banco', width: 15 },
      { header: 'Cuenta', key: 'Cuenta', width: 20 },
      { header: 'Período Inicio', key: 'Período Inicio', width: 12 },
      { header: 'Período Fin', key: 'Período Fin', width: 12 },
      { header: 'Salario Base', key: 'Salario Base', width: 12 },
      { header: 'Días Trabajados', key: 'Días Trabajados', width: 12 },
      { header: 'Días Ausente', key: 'Días Ausente', width: 12 },
      { header: 'Días Tardanza', key: 'Días Tardanza', width: 12 },
      { header: 'Salario Bruto', key: 'Salario Bruto', width: 12 },
      { header: 'ISR', key: 'ISR', width: 10 },
      { header: 'IHSS', key: 'IHSS', width: 10 },
      { header: 'RAP', key: 'RAP', width: 10 },
      { header: 'Total Deducciones', key: 'Total Deducciones', width: 15 },
      { header: 'Salario Neto', key: 'Salario Neto', width: 12 },
      { header: 'Estado', key: 'Estado', width: 10 },
      { header: 'Notas Ingresos', key: 'Notas Ingresos', width: 30 },
      { header: 'Notas Deducciones', key: 'Notas Deducciones', width: 30 },
      { header: 'Generado', key: 'Generado', width: 12 }
    ]

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

    // Enviar respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=nomina_paragon_${periodo}.xlsx`)
    res.send(excelBuffer)

  } catch (error) {
    console.error('Error generando Excel:', error)
    return res.status(500).json({ error: 'Error generando archivo Excel' })
  }
}

// PDF flows moved to /api/payroll/report and /api/payroll/receipt