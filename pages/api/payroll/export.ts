import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 🔒 AUTENTICACIÓN REQUERIDA
    const supabase = createClient(req, res)
    // ✅ Get user with getUser() to validate token with Supabase server
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

    console.log(`📊 Exportando ${payrollRecords.length} registros de nómina para ${periodo}`)

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

// PDF flows moved to /api/payroll/report and /api/payroll/receipt