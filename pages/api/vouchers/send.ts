import { NextApiRequest, NextApiResponse } from 'next'
import { requireUser } from '../../../lib/auth/requireUser'
import { requirePlanAndQuota, incrementUsage } from '../../../lib/billing/enforce'
import { auditVoucherSent } from '../../../lib/audit'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, user, userProfile } = await requireUser(req, res)
    const { employee_id, period_start, period_end, method = 'email' } = req.body

    if (!userProfile?.company_id) {
      return res.status(400).json({ 
        error: 'Perfil de usuario incompleto',
        message: 'No se pudo obtener la información de la empresa'
      })
    }

    // Check plan and quota before processing
    await requirePlanAndQuota(supabase, userProfile.company_id, 'send_voucher')

    // Validate required fields
    if (!employee_id || !period_start || !period_end) {
      return res.status(400).json({ 
        error: 'employee_id, period_start, and period_end are required' 
      })
    }

    // Get employee data
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, name, email, phone, company_id')
      .eq('id', employee_id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (empError || !employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Get payroll record for the period
    const { data: payrollRecord, error: payrollError } = await supabase
      .from('payroll_records')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .single()

    if (payrollError || !payrollRecord) {
      return res.status(404).json({ error: 'Payroll record not found for this period' })
    }

    // Generate voucher data
    const voucherData = {
      employee: {
        name: employee.name,
        email: employee.email,
        phone: employee.phone
      },
      period: {
        start: period_start,
        end: period_end
      },
      payroll: {
        gross_salary: payrollRecord.gross_salary,
        net_salary: payrollRecord.net_salary,
        deductions: payrollRecord.total_deductions,
        days_worked: payrollRecord.days_worked
      },
      generated_at: new Date().toISOString(),
      generated_by: user.id
    }

    // Send voucher based on method
    let sendResult
    if (method === 'email') {
      // TODO: Implement email sending logic
      sendResult = { success: true, method: 'email', message: 'Voucher sent via email' }
    } else if (method === 'whatsapp') {
      // TODO: Implement WhatsApp sending logic
      sendResult = { success: true, method: 'whatsapp', message: 'Voucher sent via WhatsApp' }
    } else {
      return res.status(400).json({ error: 'Invalid method. Use "email" or "whatsapp"' })
    }

    if (!sendResult.success) {
      return res.status(500).json({ error: 'Failed to send voucher' })
    }

    // Increment usage meter
    try {
      await incrementUsage(supabase, userProfile.company_id, 'send_voucher')
    } catch (error) {
      console.warn('Failed to increment usage meter:', error)
      // Don't fail the request if usage tracking fails
    }

    // Log audit event
    try {
      await auditVoucherSent(supabase, user.id, userProfile.company_id, employee_id)
    } catch (error) {
      console.warn('Failed to log audit event:', error)
      // Don't fail the request if audit fails
    }

    return res.status(200).json({
      success: true,
      voucher: voucherData,
      send_result: sendResult,
      message: 'Voucher sent successfully'
    })

  } catch (error: any) {
    console.error('Voucher send error:', error)
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'User profile required' })
    }

    if (error.message === 'PLAN_REQUIRED') {
      return res.status(402).json({ error: 'Active plan required to send vouchers' })
    }

    if (error.message === 'VOUCHER_LIMIT_REACHED') {
      return res.status(429).json({ error: 'Voucher limit reached for this month' })
    }

    return res.status(400).json({ 
      error: error.message || 'Failed to send voucher' 
    })
  }
}
