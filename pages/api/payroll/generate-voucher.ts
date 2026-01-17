import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { generateEmployeeReceiptPDF } from '../../../lib/payroll/receipt'
import { getHondurasTimestamp } from '../../../lib/timezone'
import { 
  getTaxBracketsForYear, 
  calculateISR, 
  calculateIHSS, 
  calculateRAP 
} from '../../../lib/tax/honduras-tax'

interface VoucherData {
  employee_id: string
  periodo: string
  quincena: number
  incluirDeducciones: boolean
  adj_bonus?: number
  adj_discount?: number
  note?: string
}

interface VoucherPreview {
  employee_id: string
  employee_code: string
  name: string
  department: string
  position: string
  periodo: string
  quincena: number
  days_worked: number
  base_salary: number
  gross_salary: number
  ihss: number
  rap: number
  isr: number
  total_deductions: number
  net_salary: number
  adj_bonus: number
  adj_discount: number
  final_net: number
  note: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AUTENTICACIÓN REQUERIDA
    // AUTENTICACIÓN ESTANDARIZADA - Usar requireCompanyAccess
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)
    
    // Verificar roles específicos para generar voucher
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para generar voucher'
      })
    }

    console.log('Usuario autenticado para generación de voucher:', { 
      userId: user.id, 
      role: role,
      companyId: companyId 
    })

    const { employee_id, periodo, quincena, incluirDeducciones, adj_bonus = 0, adj_discount = 0, note = '' }: VoucherData = req.body
    
    // Validaciones
    if (!employee_id || !periodo || !quincena) {
      return res.status(400).json({ 
        error: 'Missing required fields: employee_id, periodo, quincena' 
      })
    }
    
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (formato: YYYY-MM)' })
    }
    
    if (![1, 2].includes(quincena)) {
      return res.status(400).json({ error: 'Quincena inválida (debe ser 1 o 2)' })
    }

    // Validar que el usuario pertenezca a la empresa
    if (!companyId) {
      return res.status(403).json({ 
        error: 'No autorizado',
        message: 'Usuario no tiene empresa asignada'
      })
    }

    // Obtener información del empleado
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, base_salary, department_id, position, bank_name, bank_account, company_id, status')
      .eq('id', employee_id)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .single()

    if (empError || !employee) {
      console.error('Error obteniendo empleado:', empError)
      return res.status(404).json({ 
        error: 'Empleado no encontrado o no autorizado',
        message: 'El empleado no existe o no pertenece a su empresa'
      })
    }

    console.log('Empleado encontrado para voucher:', {
      employeeId: employee.id,
      name: employee.name,
      companyId: employee.company_id
    })

    // Obtener departamento del empleado
    let departmentName = 'Sin Departamento'
    if (employee.department_id) {
      const { data: dept } = await supabase
        .from('departments')
        .select('name')
        .eq('id', employee.department_id)
        .single()
      if (dept) departmentName = dept.name
    }

    // Calcular fechas del período
    const [year, month] = periodo.split('-').map(Number)
    const ultimoDia = new Date(year, month, 0).getDate()
    const fechaInicio = quincena === 1 ? `${periodo}-01` : `${periodo}-16`
    const fechaFin = quincena === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`
    
    // Obtener constantes fiscales para el año del período
    const taxConstants = await getTaxBracketsForYear(year)
    
    // Calcular días trabajados por quincena
    const daysInQuincena = quincena === 1 ? 15 : (ultimoDia - 15)
    
    // Calcular salario bruto QUINCENAL (salario mensual ÷ 2)
    const grossSalary = employee.base_salary / 2
    
    // Calcular deducciones
    let ihss = 0, rap = 0, isr = 0, totalDeductions = 0
    
    if (incluirDeducciones) {
      // APLICAR DEDUCCIONES SOLO UNA VEZ AL MES (en Q2) - Usando tabla fiscal del año correspondiente
      if (quincena === 2) {
        ihss = calculateIHSS(employee.base_salary, taxConstants)  // Deducción mensual completa
        rap = calculateRAP(employee.base_salary, taxConstants)    // Deducción mensual completa
        isr = calculateISR(employee.base_salary, taxConstants.isr_brackets)    // Deducción mensual completa
      }
      totalDeductions = ihss + rap + isr
    }
    
    // Calcular salario neto base
    const baseNetSalary = grossSalary - totalDeductions
    
    // Aplicar ajustes (bonos/descuentos)
    const finalNetSalary = baseNetSalary + adj_bonus - adj_discount

    // Crear preview del voucher
    const voucherPreview: VoucherPreview = {
      employee_id: employee.id,
      employee_code: employee.employee_code || 'N/A',
      name: employee.name,
      department: departmentName,
      position: employee.position || 'N/A',
      periodo,
      quincena,
      days_worked: daysInQuincena,
      base_salary: employee.base_salary,
      gross_salary: grossSalary,
      ihss,
      rap,
      isr,
      total_deductions: totalDeductions,
      net_salary: baseNetSalary,
      adj_bonus,
      adj_discount,
      final_net: finalNetSalary,
      note
    }

    console.log('Voucher preview generado:', {
      employee: employee.name,
      periodo,
      quincena,
      grossSalary,
      totalDeductions,
      finalNetSalary
    })

    // Si es solo preview, devolver los datos
    if (req.body.action === 'preview') {
      return res.status(200).json({
        success: true,
        action: 'preview',
        voucher: voucherPreview,
        message: 'Preview del voucher generado exitosamente'
      })
    }

    // Si es generar PDF, crear el voucher definitivo
    if (req.body.action === 'generate') {
      // Generar PDF del voucher
      const pdf = await generateEmployeeReceiptPDF({
        employee_code: voucherPreview.employee_code,
        employee_name: voucherPreview.name,
        department: voucherPreview.department,
        position: voucherPreview.position,
        period_start: fechaInicio,
        period_end: fechaFin,
        days_worked: voucherPreview.days_worked,
        base_salary: voucherPreview.gross_salary,
        income_tax: voucherPreview.isr,
        professional_tax: voucherPreview.rap,
        social_security: voucherPreview.ihss,
        total_deductions: voucherPreview.total_deductions,
        net_salary: voucherPreview.final_net,
        bank_name: employee.bank_name,
        bank_account: employee.bank_account
      }, periodo, quincena)

      // Guardar registro del voucher generado
      const { error: saveError } = await supabase
        .from('payroll_records')
        .upsert({
          employee_id: employee.id,
          period_start: fechaInicio,
          period_end: fechaFin,
          period_type: 'quincenal',
          base_salary: employee.base_salary,
          gross_salary: voucherPreview.gross_salary,
          income_tax: voucherPreview.isr,
          social_security: voucherPreview.ihss,
          professional_tax: voucherPreview.rap,
          total_deductions: voucherPreview.total_deductions,
          net_salary: voucherPreview.final_net,
          days_worked: voucherPreview.days_worked,
          days_absent: 0,
          late_days: 0,
          status: 'approved',
          notes_on_ingress: voucherPreview.note || '',
          notes_on_deductions: `Voucher individual generado con ajustes: Bono +${adj_bonus}, Descuento -${adj_discount}`,
          metadata: { tax_year: year }, // Guardar año de tabla fiscal usada
          generated_by: user.id,
          generated_at: getHondurasTimestamp(),
          approved_at: getHondurasTimestamp(),
          approved_by: user.id
        }, { 
          onConflict: 'employee_id,period_start,period_end',
          ignoreDuplicates: false 
        })

      if (saveError) {
        console.error('Error guardando voucher:', saveError)
        // Continuar aunque falle el guardado
      }

      console.log('✅ Voucher PDF generado exitosamente para:', employee.name)

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename=voucher_${voucherPreview.employee_code}_${periodo}_q${quincena}.pdf`)
      return res.send(pdf)
    }

    // Acción por defecto: devolver preview
    return res.status(200).json({
      success: true,
      action: 'preview',
      voucher: voucherPreview,
      message: 'Preview del voucher generado exitosamente'
    })

  } catch (error: any) {
    console.error('❌ Error en generate-voucher:', error)
    return res.status(500).json({ 
      error: error?.message || 'Internal error',
      message: 'Error interno del servidor'
    })
  }
}
