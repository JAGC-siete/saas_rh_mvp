import type { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth-helpers'
import { notificationManager } from '../../../lib/notification-providers'
import { whatsappService } from '../../../lib/whatsapp-service'

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
    
    // Obtener configuración de notificaciones para la empresa
    const notificationConfig = await notificationManager.getConfigForCompany(userProfile.company_id)
    
    if (!notificationConfig) {
      console.error('❌ No se pudo obtener configuración de notificaciones para la empresa:', userProfile.company_id)
      // Fallback a enlace de WhatsApp
      const message = encodeURIComponent(
        `Hola! Aquí tienes el enlace para descargar tu ${type === 'recibo' ? 'recibo de pago' : 'planilla'} del período ${periodo} Q${quincena}:\n\n${url}\n\nEste enlace es válido solo para usuarios autorizados de la empresa.`
      )
      
      const waLink = `https://wa.me/${cleanPhone}?text=${message}`

      return res.status(200).json({ 
        sent: false, 
        provider: 'link', 
        url: waLink,
        message: 'Configuración no disponible. Enlace de WhatsApp generado como fallback.',
        phone: cleanPhone,
        type,
        periodo,
        quincena,
        errorCode: 'WHATSAPP_CONFIG_MISSING'
      })
    }

    // Validar proveedor de WhatsApp
    const whatsappValidation = await notificationManager.validateWhatsAppProvider(notificationConfig.whatsappProvider)
    if (!whatsappValidation.valid) {
      console.error('❌ Proveedor de WhatsApp no válido:', whatsappValidation.error)
      // Fallback a enlace de WhatsApp
      const message = encodeURIComponent(
        `Hola! Aquí tienes el enlace para descargar tu ${type === 'recibo' ? 'recibo de pago' : 'planilla'} del período ${periodo} Q${quincena}:\n\n${url}\n\nEste enlace es válido solo para usuarios autorizados de la empresa.`
      )
      
      const waLink = `https://wa.me/${cleanPhone}?text=${message}`

      return res.status(200).json({ 
        sent: false, 
        provider: 'link', 
        url: waLink,
        message: 'Proveedor de WhatsApp no válido. Enlace generado como fallback.',
        phone: cleanPhone,
        type,
        periodo,
        quincena,
        errorCode: 'WHATSAPP_CONFIG_MISSING'
      })
    }

    // Intentar envío real de WhatsApp
    const message = `Hola! Aquí tienes el enlace para descargar tu ${type === 'recibo' ? 'recibo de pago' : 'planilla'} del período ${periodo} Q${quincena}:\n\n${url}\n\nEste enlace es válido solo para usuarios autorizados de la empresa.`

    const whatsappResult = await whatsappService.sendWhatsApp(notificationConfig, {
      phone: cleanPhone,
      message,
      type: 'text'
    })

    if (whatsappResult.success) {
      console.log('✅ WhatsApp enviado exitosamente:', {
        messageId: whatsappResult.messageId,
        provider: whatsappResult.provider,
        retryCount: whatsappResult.retryCount,
        companyId: userProfile.company_id
      })

      return res.status(200).json({ 
        sent: true, 
        id: whatsappResult.messageId, 
        provider: whatsappResult.provider,
        retryCount: whatsappResult.retryCount,
        message: 'WhatsApp enviado exitosamente',
        phone: cleanPhone,
        type,
        periodo,
        quincena
      })
    } else {
      console.error('❌ Error enviando WhatsApp:', {
        error: whatsappResult.error,
        errorCode: whatsappResult.errorCode,
        provider: whatsappResult.provider,
        retryCount: whatsappResult.retryCount
      })

      // Fallback a enlace de WhatsApp
      const encodedMessage = encodeURIComponent(message)
      const waLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`

      return res.status(200).json({ 
        sent: false, 
        provider: 'link', 
        url: waLink,
        message: 'Error enviando WhatsApp. Enlace generado como fallback.',
        phone: cleanPhone,
        type,
        periodo,
        quincena,
        error: whatsappResult.error,
        errorCode: whatsappResult.errorCode,
        retryCount: whatsappResult.retryCount
      })
    }

  } catch (e: any) {
    console.error('❌ Error en send-whatsapp:', e)
    return res.status(500).json({ 
      error: e?.message || 'Internal error',
      message: 'Error interno del servidor'
    })
  }
}


