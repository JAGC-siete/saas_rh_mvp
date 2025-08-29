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

    console.log('Usuario autenticado para envío de voucher por WhatsApp:', { 
      userId: user.id, 
      role: userProfile?.role,
      companyId: userProfile?.company_id 
    })

    // FEATURE EN DESARROLLO - WhatsApp no implementado aún
    return res.status(200).json({ 
      sent: false, 
      provider: 'development',
      message: 'Feature en desarrollo - We will implement that later. Forget it for now.',
      feature_status: 'in_development',
      estimated_completion: 'Q2 2025',
      current_workaround: 'Use email delivery instead',
      note: 'Individual voucher WhatsApp delivery is not yet implemented'
    })

  } catch (e: any) {
    console.error('❌ Error en send-voucher-whatsapp:', e)
    return res.status(500).json({ 
      error: e?.message || 'Internal error',
      message: 'Error interno del servidor'
    })
  }
}
