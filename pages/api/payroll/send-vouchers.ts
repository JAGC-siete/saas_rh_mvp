import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { notificationManager } from '../../../lib/notification-providers'
import { emailService } from '../../../lib/email-service'
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
import { generateEmployeeReceiptPDF } from '../../../lib/payroll/receipt'
import { buildVoucherFromRunLine } from '../../../lib/payroll/voucher-from-run-line'
import { resolveCanonicalVoucherRunLineId } from '../../../lib/payroll/resolve-voucher-run-line'
import { buildVoucherPdfOptions, withCompanyMoneyOptions } from '../../../lib/payroll/voucher-pdf-options'
import { resolveReportConfig } from '../../../lib/reports/column-resolver'
import { resolvePayrollDeductionMode } from '../../../lib/payroll/deduction-mode'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const auth = await authenticateUser(req, res, ['can_view_payroll', 'can_export_payroll'])
    if (!auth.success || !auth.user || !auth.userProfile) {
      return res.status(401).json({ error: auth.error || 'Unauthorized', message: auth.message })
    }

    const { periodo, quincena, delivery, options } = req.body

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

    const notificationConfig = await notificationManager.getConfigForCompany(companyId)
    if (!notificationConfig) {
      return res.status(500).json({ error: 'Configuración de notificaciones no disponible' })
    }

    const [yearStr, monthStr] = periodo.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    const { data: payrollConfig } = await supabase
      .from('company_payroll_configs')
      .select('metadata, payment_frequency')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .maybeSingle()

    const metadata = (payrollConfig?.metadata as Record<string, unknown> | null) ?? {}
    const paymentFrequency =
      payrollConfig?.payment_frequency ?? (metadata.payment_frequency as string | undefined)
    const companyMode = resolvePayrollDeductionMode(metadata, paymentFrequency)

    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('id, year, month, quincena, status, tipo')
      .eq('company_id', companyId)
      .eq('year', year)
      .eq('month', month)
      .eq('quincena', Number(quincena))
      .eq('tipo', companyMode)
      .in('status', ['authorized', 'distributed', 'paid'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (runError) {
      return res.status(500).json({ error: 'Error cargando corrida de nómina' })
    }
    if (!run?.id) {
      return res.status(404).json({
        error: 'Corrida liberada no encontrada',
        message: 'No hay una planilla autorizada/distribuida para ese período',
      })
    }

    const { data: lines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select(
        `
        id,
        employee_id,
        eff_hours,
        eff_bruto,
        eff_ihss,
        eff_rap,
        eff_isr,
        eff_neto,
        employees!inner(
          id,
          name,
          email,
          phone
        )
      `
      )
      .eq('run_id', run.id)
      .eq('company_id', companyId)

    if (linesError) {
      return res.status(500).json({ error: 'Error cargando líneas de nómina' })
    }
    if (!lines || lines.length === 0) {
      return res.status(400).json({ error: 'No hay líneas de nómina para enviar' })
    }

    const voucherReportConfig = await resolveReportConfig(companyId, 'voucher', supabase)
    const { data: mailCompany } = await supabase
      .from('companies')
      .select('country_code')
      .eq('id', companyId)
      .maybeSingle()
    const voucherPdfOptions = withCompanyMoneyOptions(
      buildVoucherPdfOptions(voucherReportConfig),
      mailCompany?.country_code
    )

    const periodLabel = `${periodo} Q${quincena}`
    const attachPdf = options?.attach_pdf !== false

    const results = {
      sent: true,
      summary: { total: lines.length, ok: 0, failed: 0 },
      failed: [] as Array<{ employee_id: string; reason: string }>,
    }

    for (const line of lines) {
      try {
        const employee = (line as any).employees
        if (!employee) {
          results.summary.failed++
          results.failed.push({ employee_id: line.employee_id, reason: 'no_employee' })
          continue
        }

        let emailSent = false
        let whatsappSent = false

        if ((delivery === 'email' || delivery === 'both') && employee.email) {
          const canonicalLineId = await resolveCanonicalVoucherRunLineId(
            supabase,
            companyId,
            line.id
          )
          const voucherData = await buildVoucherFromRunLine(supabase, companyId, canonicalLineId)

          const receiptData = {
            employeeName: employee.name,
            periodLabel,
            hoursWorked: line.eff_hours,
            grossSalary: line.eff_bruto,
            ihss: line.eff_ihss,
            rap: line.eff_rap,
            isr: line.eff_isr,
            netSalary: voucherData.record.net_salary,
            countryCode: mailCompany?.country_code,
          }

          const emailPayload: Parameters<typeof emailService.sendEmail>[1] = {
            to: employee.email,
            subject: buildPayrollReceiptEmailSubject(periodLabel),
            text: `${buildPayrollReceiptEmailText(receiptData)}${
              attachPdf ? '\n\nAdjunto: recibo de pago en PDF.' : ''
            }`,
            html: buildPayrollReceiptEmailHtml(receiptData),
          }

          if (attachPdf) {
            const pdfBuffer = await generateEmployeeReceiptPDF(
              voucherData.record,
              voucherData.periodo,
              voucherData.quincena,
              companyId,
              voucherData.companyName,
              voucherData.periodLabel,
              voucherPdfOptions
            )
            emailPayload.attachments = [
              {
                filename: voucherData.filename,
                content: pdfBuffer,
              },
            ]
          }

          const emailResult = await emailService.sendEmail(notificationConfig, emailPayload)

          if (emailResult.success) {
            await incrementUsage(supabase, companyId, 'send_voucher')
            emailSent = true
          } else {
            console.error(`Error enviando email a ${employee.email}:`, emailResult.error)
          }
        }

        if ((delivery === 'whatsapp' || delivery === 'both') && employee.phone) {
          console.log(`WhatsApp en desarrollo para ${employee.phone}`)
        }

        if (emailSent || whatsappSent) {
          results.summary.ok++
        } else {
          results.summary.failed++
          const reasons: string[] = []
          if (!employee.email && (delivery === 'email' || delivery === 'both')) reasons.push('no_email')
          if (!employee.phone && (delivery === 'whatsapp' || delivery === 'both')) reasons.push('no_phone')
          if (!emailSent && !whatsappSent) reasons.push('delivery_failed')
          results.failed.push({
            employee_id: employee.id || line.employee_id,
            reason: reasons.join(', ') || 'delivery_failed',
          })
        }
      } catch (error: any) {
        console.error(`Error procesando línea ${line.id}:`, error)
        results.summary.failed++
        results.failed.push({
          employee_id: line.employee_id,
          reason: error.message || 'unknown_error',
        })
      }
    }

    return res.status(200).json(results)
  } catch (error: any) {
    console.error('Error en send-vouchers:', error)
    return res.status(500).json({ error: error.message || 'Error interno del servidor' })
  }
}
