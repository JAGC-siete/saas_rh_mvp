import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth-helpers'

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
    const origin = req.headers.origin || 'http://localhost:3000'

    console.log('Usuario autenticado para envío de email:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    const { to, type = 'planilla', periodo, quincena, employeeId } = req.body || {}
    
    // Validaciones
    if (!to || !periodo) {
      return res.status(400).json({ error: 'Missing to or periodo' })
    }
    
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (formato: YYYY-MM)' })
    }

    if (![1, 2].includes(quincena)) {
      return res.status(400).json({ error: 'Quincena inválida (debe ser 1 o 2)' })
    }

    // Validar que el usuario pertenezca a la empresa
    if (!userProfile?.company_id) {
      return res.status(403).json({ 
        error: 'No autorizado',
        message: 'Usuario no tiene empresa asignada'
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || ''
    const originUrl = baseUrl ? (baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`) : ''

    let downloadPath = ''
    if (type === 'recibo') {
      if (!employeeId || !quincena) {
        return res.status(400).json({ 
          error: 'Missing employeeId or quincena for recibo' 
        })
      }
      downloadPath = `/api/payroll/receipt?periodo=${encodeURIComponent(periodo)}&quincena=${encodeURIComponent(quincena)}&employeeId=${encodeURIComponent(employeeId)}`
    } else {
      if (!quincena) {
        return res.status(400).json({ 
          error: 'Missing quincena for planilla' 
        })
      }
      downloadPath = `/api/payroll/report?periodo=${encodeURIComponent(periodo)}&quincena=${encodeURIComponent(quincena)}`
    }

    const downloadUrl = originUrl ? `${originUrl}${downloadPath}` : downloadPath

    // Validar credenciales SMTP
    const apiKey = process.env['RESEND_API_KEY'] || ''
    const fromEmail = process.env.RESEND_FROM || 'noreply@cloudhr.hn'
    
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY missing - no se puede enviar email')
      return res.status(200).json({ 
        sent: false, 
        reason: 'RESEND_API_KEY missing', 
        downloadUrl,
        message: 'Credenciales SMTP no configuradas. Use el enlace para descarga manual.'
      })
    }

    console.log('📧 Intentando enviar email con Resend:', {
      to,
      from: fromEmail,
      type,
      periodo,
      quincena,
      companyId: userProfile.company_id
    })

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      
      const subject = type === 'recibo' 
        ? `Recibo de pago ${periodo} Q${quincena} - ${userProfile.company_id ? 'Empresa' : 'Sistema'}`
        : `Planilla ${periodo} Q${quincena} - ${userProfile.company_id ? 'Empresa' : 'Sistema'}`
      
      const body = `Hola,

Puedes descargar el ${type === 'recibo' ? 'recibo de pago' : 'planilla'} en el siguiente enlace seguro:
${downloadUrl}

Este enlace es válido solo para usuarios autorizados de la empresa.

Saludos.`

      const result = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        text: body,
      })

      if ((result as any)?.error) {
        console.error('❌ Error de Resend:', (result as any).error)
        return res.status(500).json({ 
          error: 'Send failed', 
          details: (result as any).error?.message || 'Error desconocido de Resend',
          downloadUrl 
        })
      }

      console.log('✅ Email enviado exitosamente:', {
        id: (result as any)?.id,
        to,
        type,
        companyId: userProfile.company_id
      })

      return res.status(200).json({ 
        sent: true, 
        id: (result as any)?.id, 
        downloadUrl,
        message: 'Email enviado exitosamente'
      })

    } catch (resendError: any) {
      console.error('❌ Error enviando email con Resend:', resendError)
      return res.status(500).json({ 
        error: 'Send failed', 
        details: resendError?.message || 'Error interno de Resend',
        downloadUrl,
        message: 'Error al enviar email. Use el enlace para descarga manual.'
      })
    }

  } catch (e: any) {
    console.error('❌ Error general en send-email:', e)
    return res.status(500).json({ 
      error: e?.message || 'Internal error',
      message: 'Error interno del servidor'
    })
  }
}


