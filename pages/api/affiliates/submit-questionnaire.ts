import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit } from '../../../lib/security/rate-limiting'
import { env } from '../../../lib/env'

export default withRateLimit('general')(handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { token, questionnaireData, termsAccepted } = req.body

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Servicio no disponible. Intenta más tarde.' })
  }
  const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Validar token
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token de confirmación requerido.' })
  }

  // Validar que términos fueron aceptados
  if (!termsAccepted) {
    return res.status(400).json({ error: 'Debes aceptar los términos y condiciones para continuar.' })
  }

  // Validar questionnaireData
  if (!questionnaireData || typeof questionnaireData !== 'object') {
    return res.status(400).json({ error: 'Datos del cuestionario requeridos.' })
  }

  try {
    // Buscar solicitud por token
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('affiliate_requests')
      .select('id, email, status')
      .eq('confirmation_token', token)
      .single()

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Token inválido o expirado.' })
    }

    // Validar que está en estado correcto
    if (request.status !== 'pending_email_confirmation') {
      if (request.status === 'pending_approval') {
        return res.status(400).json({ error: 'Ya has completado el cuestionario. Tu solicitud está pendiente de aprobación.' })
      }
      if (request.status === 'approved') {
        return res.status(400).json({ error: 'Tu solicitud ya fue aprobada.' })
      }
      if (request.status === 'rejected') {
        return res.status(400).json({ error: 'Tu solicitud fue rechazada.' })
      }
    }

    // Actualizar solicitud con datos del cuestionario
    const { error: updateError } = await supabaseAdmin
      .from('affiliate_requests')
      .update({
        questionnaire_data: questionnaireData,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        status: 'pending_approval',
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id)

    if (updateError) {
      console.error('Error actualizando solicitud de afiliado:', updateError)
      return res.status(500).json({ error: 'Error guardando tu solicitud.' })
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Tu solicitud ha sido enviada. La revisaremos y te contactaremos pronto.' 
    })
  } catch (error: any) {
    console.error('Error en envío de cuestionario:', error)
    return res.status(500).json({ error: 'Error procesando tu solicitud.' })
  }
}








