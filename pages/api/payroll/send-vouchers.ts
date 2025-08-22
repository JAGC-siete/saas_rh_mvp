import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { generateEmployeeReceiptPDF } from '../../../lib/payroll/receipt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await authenticateUser(req, res, ['can_view_payroll', 'can_export_payroll'])
    if (!auth.success || !auth.user || !auth.userProfile) {
      return res.status(401).json({ error: auth.error || 'Unauthorized', message: auth.message })
    }

    const { periodo, quincena, delivery, draft_overrides, options } = req.body

    if (!periodo || !/^[0-9]{4}-[0-9]{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
    }
    if (![1, 2].includes(Number(quincena))) {
      return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
    }
    if (delivery !== 'email') {
      return res.status(400).json({ error: 'Solo se soporta delivery por email' })
    }

    const supabase = createClient(req, res)
    const companyId = auth.userProfile.company_id

    // Obtener empleados activos
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, email, base_salary, department_id')
      .eq('company_id', companyId)
      .eq('status', 'active')

    if (empError) {
      return res.status(500).json({ error: 'Error cargando empleados' })
    }

    if (!employees || employees.length === 0) {
      return res.status(400).json({ error: 'No hay empleados activos' })
    }

    // Obtener registros de nómina existentes o crear preview
    const { data: payrollRecords, error: payrollError } = await supabase
      .from('payroll_records')
      .select('*')
      .eq('company_id', companyId)
      .gte('period_start', `${periodo}-01`)
      .lte('period_start', `${periodo}-31`)

    if (payrollError) {
      return res.status(500).json({ error: 'Error cargando registros de nómina' })
    }

    const results = {
      sent: true,
      summary: { total: employees.length, ok: 0, failed: 0 },
      failed: [] as Array<{ employee_id: string, reason: string }>
    }

    // Procesar cada empleado
    for (const employee of employees) {
      try {
        // Buscar registro de nómina existente o usar draft_overrides
        let payrollData = payrollRecords?.find(r => r.employee_id === employee.id)
        let draftOverride = draft_overrides?.find((d: any) => d.employee_id === employee.id)

        if (!payrollData) {
          // Crear datos de preview si no hay registro
          const dailyRate = employee.base_salary / 30
          const lastDay = new Date(Number(periodo.split('-')[0]), Number(periodo.split('-')[1]), 0).getDate()
          const daysInQuincena = quincena === 1 ? 15 : (lastDay - 15)
          const grossSalary = dailyRate * daysInQuincena
          
          // Cálculos básicos de deducciones (simplificados)
          const ihss = Math.min(employee.base_salary, 11903.13) * 0.05 / 2
          const rap = Math.max(0, employee.base_salary - 11903.13) * 0.015 / 2
          const isr = 0 // Simplificado para preview
          
          payrollData = {
            employee_id: employee.id,
            period_start: `${periodo}-${quincena === 1 ? '01' : '16'}`,
            period_end: `${periodo}-${quincena === 1 ? '15' : '31'}`,
            base_salary: employee.base_salary,
            gross_salary: grossSalary,
            social_security: ihss,
            professional_tax: rap,
            income_tax: isr,
            total_deductions: ihss + rap + isr,
            net_salary: grossSalary - (ihss + rap + isr),
            days_worked: daysInQuincena
          } as any
        }

        // Aplicar overrides del draft si existen
        if (draftOverride) {
          payrollData.gross_salary += (draftOverride.adj_bonus || 0)
          payrollData.total_deductions += (draftOverride.adj_discount || 0)
          payrollData.net_salary = payrollData.gross_salary - payrollData.total_deductions
        }

        // Generar PDF del recibo
        const receiptPDF = await generateEmployeeReceiptPDF({
          employee_code: employee.employee_code,
          employee_name: employee.name,
          department: employee.department_id,
          position: 'Empleado',
          period_start: payrollData.period_start,
          period_end: payrollData.period_end,
          days_worked: payrollData.days_worked,
          base_salary: payrollData.base_salary,
          income_tax: payrollData.income_tax,
          professional_tax: payrollData.professional_tax,
          social_security: payrollData.social_security,
          total_deductions: payrollData.total_deductions,
          net_salary: payrollData.net_salary
        }, periodo, quincena)

        // Enviar por email usando Resend
        if (employee.email && options?.attach_pdf) {
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'noreply@humanosisu.net',
              to: employee.email,
              subject: `Recibo de Nómina - ${periodo} Q${quincena} - Paragon Honduras`,
              html: `
                <h2>Recibo de Nómina Quincenal</h2>
                <p>Estimado/a ${employee.name},</p>
                <p>Adjunto encontrará su recibo de nómina para el período ${periodo} Q${quincena}.</p>
                <p><strong>Resumen:</strong></p>
                <ul>
                  <li>Salario Bruto: L. ${payrollData.gross_salary.toFixed(2)}</li>
                  <li>Total Deducciones: L. ${payrollData.total_deductions.toFixed(2)}</li>
                  <li>Salario Neto: L. ${payrollData.net_salary.toFixed(2)}</li>
                </ul>
                <p>Saludos,<br>Departamento de Recursos Humanos<br>Paragon Honduras</p>
              `,
              attachments: [{
                filename: `recibo_${employee.employee_code}_${periodo}_q${quincena}.pdf`,
                content: receiptPDF.toString('base64')
              }]
            })
          })

          if (emailResponse.ok) {
            results.summary.ok++
          } else {
            results.summary.failed++
            results.failed.push({ employee_id: employee.id, reason: 'email_failed' })
          }
        } else if (!employee.email) {
          results.summary.failed++
          results.failed.push({ employee_id: employee.id, reason: 'no_email' })
        } else {
          results.summary.ok++
        }
      } catch (error: any) {
        console.error(`Error procesando empleado ${employee.id}:`, error)
        results.summary.failed++
        results.failed.push({ employee_id: employee.id, reason: error.message || 'unknown_error' })
      }
    }

    return res.status(200).json(results)
  } catch (error: any) {
    console.error('Error en send-vouchers:', error)
    return res.status(500).json({ error: error.message || 'Error interno del servidor' })
  }
}
