import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { notificationManager } from '../../../lib/notification-providers'
import { emailService } from '../../../lib/email-service'
import { createEmployeeSalaryClient } from '../../../lib/security/employee-data-access'
import {
  getBillingErrorCode,
  incrementUsage,
  requirePaidPlanForBulkVoucherEmail,
} from '../../../lib/billing/enforce'
import {
  BULK_VOUCHER_EMAIL_PAID_FEATURE_CODE,
  BULK_VOUCHER_EMAIL_TRIAL_MESSAGE,
} from '../../../lib/billing/messages'
import {
  buildPayrollReceiptEmailHtml,
  buildPayrollReceiptEmailSubject,
  buildPayrollReceiptEmailText,
} from '../../../lib/emails/payroll-receipt-email'
import { calculateIHSS, calculateRAP, getTaxBracketsForYear } from '../../../lib/tax/honduras-tax'

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
    if (!['email', 'whatsapp', 'both'].includes(delivery)) {
      return res.status(400).json({ error: 'Delivery debe ser: email, whatsapp, o both' })
    }

    const supabase = createClient(req, res)
    const salaryClient = createEmployeeSalaryClient()
    const companyId = auth.userProfile.company_id

    if (!companyId) {
      return res.status(400).json({ error: 'Usuario no tiene empresa asignada' })
    }

    if (delivery === 'email' || delivery === 'both') {
      try {
        await requirePaidPlanForBulkVoucherEmail(supabase, companyId)
      } catch (billingError: any) {
        if (billingError?.message === BULK_VOUCHER_EMAIL_PAID_FEATURE_CODE) {
          return res.status(getBillingErrorCode(BULK_VOUCHER_EMAIL_PAID_FEATURE_CODE)).json({
            error: BULK_VOUCHER_EMAIL_PAID_FEATURE_CODE,
            code: BULK_VOUCHER_EMAIL_PAID_FEATURE_CODE,
            message: BULK_VOUCHER_EMAIL_TRIAL_MESSAGE,
          })
        }
        throw billingError
      }
    }

    // Obtener configuración de notificaciones para la empresa
    const notificationConfig = await notificationManager.getConfigForCompany(companyId)
    if (!notificationConfig) {
      return res.status(500).json({ error: 'Configuración de notificaciones no disponible' })
    }

    // Obtener empleados activos
    const { data: employees, error: empError } = await salaryClient
      .from('employees')
      .select('id, name, employee_code, email, phone, base_salary, department_id')
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

    const payrollYear = Number(periodo.split('-')[0])
    const taxConstants = await getTaxBracketsForYear(payrollYear, 'HND')

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
          
          // Cálculos básicos de deducciones (preview cuando no hay registro de nómina)
          const ihss = (calculateIHSS(employee.base_salary, taxConstants) / 2)
          const rap = (calculateRAP(employee.base_salary, taxConstants) / 2)
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
        if (draftOverride && payrollData) {
          payrollData.gross_salary += (draftOverride.adj_bonus || 0)
          payrollData.total_deductions = (payrollData.total_deductions ?? 0) + (draftOverride.adj_discount || 0)
          payrollData.net_salary = payrollData.gross_salary - (payrollData.total_deductions ?? 0)
        }

        // Generar PDF del recibo - removed unused variable
        // const receiptPDF = await generateEmployeeReceiptPDF({
        //   employee_code: employee.employee_code,
        //   employee_name: employee.name,
        //   department: employee.department_id,
        //   position: 'Empleado',
        //   period_start: payrollData.period_start,
        //   period_end: payrollData.period_end,
        //   days_worked: payrollData.days_worked,
        //   base_salary: payrollData.base_salary,
        //   income_tax: payrollData.income_tax,
        //   professional_tax: payrollData.professional_tax,
        //   social_security: payrollData.social_security,
        //   total_deductions: payrollData.total_deductions,
        //   net_salary: payrollData.net_salary
        // }, periodo, quincena)

        let emailSent = false
        let whatsappSent = false

        // Enviar por email si está habilitado
        if ((delivery === 'email' || delivery === 'both') && employee.email && options?.attach_pdf) {
          try {
            const periodLabel = `${periodo} Q${quincena}`
            const receiptData = {
              employeeName: employee.name,
              periodLabel,
              grossSalary: payrollData?.gross_salary ?? 0,
              ihss: payrollData?.social_security ?? 0,
              rap: payrollData?.professional_tax ?? 0,
              isr: payrollData?.income_tax ?? 0,
              netSalary: payrollData?.net_salary ?? 0,
            }

            const emailResult = await emailService.sendEmail(notificationConfig, {
              to: employee.email,
              subject: buildPayrollReceiptEmailSubject(periodLabel),
              text: buildPayrollReceiptEmailText(receiptData),
              html: buildPayrollReceiptEmailHtml(receiptData),
            })

            if (emailResult.success) {
              await incrementUsage(supabase, companyId, 'send_voucher')
              emailSent = true
              console.log(`✅ Email enviado a ${employee.email}:`, emailResult.messageId)
            } else {
              console.error(`❌ Error enviando email a ${employee.email}:`, emailResult.error)
            }
          } catch (error: any) {
            console.error(`❌ Error crítico enviando email a ${employee.email}:`, error)
          }
        }

        // Enviar por WhatsApp si está habilitado
        if ((delivery === 'whatsapp' || delivery === 'both') && employee.phone) {
          // FEATURE EN DESARROLLO - WhatsApp no implementado aún
          console.log(`🚧 WhatsApp en desarrollo para ${employee.phone} - Feature will be implemented later`)
          
          // Comentado temporalmente hasta que WhatsApp esté implementado
          /*
          try {
            const whatsappResult = await whatsappService.sendWhatsApp(notificationConfig, {
              phone: employee.phone,
              message: `Recibo de Nómina - ${periodo} Q${quincena}

Estimado/a ${employee.name},

Su recibo de nómina está listo:
• Salario Bruto: L. ${payrollData.gross_salary.toFixed(2)}
• Total Deducciones: L. ${payrollData.total_deductions.toFixed(2)}
• Salario Neto: L. ${payrollData.net_salary.toFixed(2)}

Para descargar el PDF completo, revise su email o contacte a RRHH.

Saludos,
Humano SISU`,
              type: 'text'
            })

            if (whatsappResult.success) {
              whatsappSent = true
              console.log(`✅ WhatsApp enviado a ${employee.phone}:`, whatsappResult.messageId)
            } else {
              console.error(`❌ Error enviando WhatsApp a ${employee.phone}:`, whatsappResult.error)
            }
          } catch (error: any) {
            console.error(`❌ Error crítico enviando WhatsApp a ${employee.phone}:`, error)
          }
          */
        }

        // Contar como exitoso si al menos un método funcionó
        if (emailSent || whatsappSent) {
          results.summary.ok++
        } else {
          results.summary.failed++
          const reasons = []
          if (!employee.email && (delivery === 'email' || delivery === 'both')) reasons.push('no_email')
          if (!employee.phone && (delivery === 'whatsapp' || delivery === 'both')) reasons.push('no_phone')
          if (!emailSent && !whatsappSent) reasons.push('delivery_failed')
          
          results.failed.push({ 
            employee_id: employee.id, 
            reason: reasons.join(', ') || 'delivery_failed' 
          })
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
