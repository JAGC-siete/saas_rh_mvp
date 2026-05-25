import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-helpers'
import { getResendFromNoreply } from '../../../lib/resend-from'
import {
  buildVoucherLinkEmailHtml,
  buildVoucherLinkEmailSubject,
  buildVoucherLinkEmailText,
} from '../../../lib/emails/payroll-receipt-email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // AUTENTICACIÓN REQUERIDA
    const authResult = await authenticateUser(req, res, ['can_export_payroll'])
    
    if (!authResult.success) {
      return res.status(401).json({ 
        error: authResult.error,
        message: authResult.message
      })
    }

    const { user, userProfile } = authResult
    const supabase = createClient(req, res)

    console.log('Usuario autenticado para envío de voucher por email:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    const { to, employee_id, periodo, quincena } = req.body || {}
    
    // Validaciones
    if (!to || !employee_id || !periodo || !quincena) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, employee_id, periodo, quincena' 
      })
    }
    
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (formato: YYYY-MM)' })
    }

    if (![1, 2].includes(quincena)) {
      return res.status(400).json({ error: 'Quincena inválida (debe ser 1 o 2)' })
    }

    // Validar formato de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ error: 'Formato de email inválido' })
    }

    // Validar que el usuario pertenezca a la empresa
    if (!userProfile?.company_id) {
      return res.status(403).json({ 
        error: 'No autorizado',
        message: 'Usuario no tiene empresa asignada'
      })
    }

    // Verificar que el empleado pertenezca a la empresa del usuario
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, company_id')
      .eq('id', employee_id)
      .eq('company_id', userProfile.company_id)
      .eq('status', 'active')
      .single()

    if (empError || !employee) {
      return res.status(404).json({ 
        error: 'Empleado no encontrado o no autorizado',
        message: 'El empleado no existe o no pertenece a su empresa'
      })
    }

    console.log('Empleado verificado para envío de voucher:', {
      employeeId: employee.id,
      name: employee.name,
      companyId: employee.company_id
    })

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || ''
    const origin = baseUrl ? (baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`) : ''

    // Generar enlace de descarga del voucher
    const downloadPath = `/api/payroll/generate-voucher`
    const downloadUrl = origin ? `${origin}${downloadPath}` : downloadPath

    // Validar credenciales SMTP
    const apiKey = process.env['RESEND_API_KEY'] || ''
    const fromEmail = getResendFromNoreply()
    
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY missing - no se puede enviar email')
      return res.status(200).json({ 
        sent: false, 
        reason: 'RESEND_API_KEY missing', 
        downloadUrl,
        message: 'Credenciales SMTP no configuradas. Use el enlace para descarga manual.',
        voucherInfo: {
          employee: employee.name,
          employee_code: employee.employee_code,
          periodo,
          quincena
        }
      })
    }

    console.log('📧 Intentando enviar voucher por email:', {
      to,
      from: fromEmail,
      employee: employee.name,
      periodo,
      quincena,
      companyId: userProfile.company_id
    })

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      
      const periodLabel = `${periodo} Q${quincena}`
      const voucherEmail = {
        employeeName: employee.name,
        employeeCode: employee.employee_code,
        periodLabel,
        downloadUrl,
      }

      const result = await resend.emails.send({
        from: fromEmail,
        to,
        subject: buildVoucherLinkEmailSubject(voucherEmail),
        text: buildVoucherLinkEmailText(voucherEmail),
        html: buildVoucherLinkEmailHtml(voucherEmail),
      })

      if ((result as any)?.error) {
        console.error('❌ Error de Resend:', (result as any).error)
        return res.status(500).json({ 
          error: 'Send failed', 
          details: (result as any).error?.message || 'Error desconocido de Resend',
          downloadUrl 
        })
      }

      console.log('✅ Voucher enviado por email exitosamente:', {
        id: (result as any)?.id,
        to,
        employee: employee.name,
        companyId: userProfile.company_id
      })

      return res.status(200).json({ 
        sent: true, 
        id: (result as any)?.id, 
        downloadUrl,
        message: 'Voucher enviado por email exitosamente',
        voucherInfo: {
          employee: employee.name,
          employee_code: employee.employee_code,
          periodo,
          quincena
        }
      })

    } catch (resendError: any) {
      console.error('❌ Error enviando voucher por email con Resend:', resendError)
      return res.status(500).json({ 
        error: 'Send failed', 
        details: resendError?.message || 'Error interno de Resend',
        downloadUrl,
        message: 'Error al enviar voucher por email. Use el enlace para descarga manual.',
        voucherInfo: {
          employee: employee.name,
          employee_code: employee.employee_code,
          periodo,
          quincena
        }
      })
    }

  } catch (e: any) {
    console.error('❌ Error general en send-voucher-email:', e)
    return res.status(500).json({ 
      error: e?.message || 'Internal error',
      message: 'Error interno del servidor'
    })
  }
}
