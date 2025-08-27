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

    console.log('Usuario autenticado para envío de WhatsApp:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    const { phone, type = 'planilla', periodo, quincena, employeeId } = req.body || {}
    
    // Validaciones
    if (!phone || !periodo || !quincena) {
      return res.status(400).json({ 
        error: 'Missing phone/periodo/quincena' 
      })
    }
    
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      return res.status(400).json({ error: 'Periodo inválido (formato: YYYY-MM)' })
    }

    if (![1, 2].includes(quincena)) {
      return res.status(400).json({ error: 'Quincena inválida (debe ser 1 o 2)' })
    }

    // Validar formato de teléfono (E.164)
    if (!/^\d{10,15}$/.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ 
        error: 'Formato de teléfono inválido',
        message: 'Use formato E.164 (ej: 5049xxxxxxx)'
      })
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
      if (!employeeId) {
        return res.status(400).json({ 
          error: 'Missing employeeId for recibo' 
        })
      }
      downloadPath = `/api/payroll/receipt?periodo=${encodeURIComponent(periodo)}&quincena=${encodeURIComponent(quincena)}&employeeId=${encodeURIComponent(employeeId)}`
    } else {
      downloadPath = `/api/payroll/report?periodo=${encodeURIComponent(periodo)}&quincena=${encodeURIComponent(quincena)}`
    }
    
    const url = originUrl ? `${originUrl}${downloadPath}` : downloadPath

    // Limpiar teléfono para formato E.164
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Enlace click-to-chat. Para producción, integrar proveedor (Twilio/Meta WhatsApp Cloud API)
    const message = encodeURIComponent(
      `Hola! Aquí tienes el enlace para descargar tu ${type === 'recibo' ? 'recibo de pago' : 'planilla'} del período ${periodo} Q${quincena}:\n\n${url}\n\nEste enlace es válido solo para usuarios autorizados de la empresa.`
    )
    
    const waLink = `https://wa.me/${cleanPhone}?text=${message}`

    console.log('📱 Enlace WhatsApp generado:', {
      phone: cleanPhone,
      type,
      periodo,
      quincena,
      companyId: userProfile.company_id,
      waLink
    })

    return res.status(200).json({ 
      sent: false, 
      provider: 'link', 
      url: waLink,
      message: 'Enlace de WhatsApp generado. Copia y pega en WhatsApp o haz clic para abrir.',
      phone: cleanPhone,
      type,
      periodo,
      quincena
    })

  } catch (e: any) {
    console.error('❌ Error en send-whatsapp:', e)
    return res.status(500).json({ 
      error: e?.message || 'Internal error',
      message: 'Error interno del servidor'
    })
  }
}


