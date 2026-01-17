import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Supabase URL and service role key are required.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // Verificar que es super admin
    await requireSuperAdmin(req, res)

    const { request_id, reason } = req.body

    if (!request_id) {
      return res.status(400).json({ error: 'ID de solicitud requerido.' })
    }

    // Buscar solicitud
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('affiliate_requests')
      .select('*')
      .eq('id', request_id)
      .single()

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' })
    }

    // Validar que está en estado correcto (no puede rechazar si ya está aprobado)
    if (request.status === 'approved') {
      return res.status(400).json({ error: 'No se puede rechazar una solicitud ya aprobada.' })
    }

    // Actualizar status a rejected
    const { error: updateError } = await supabaseAdmin
      .from('affiliate_requests')
      .update({
        status: 'rejected',
        metadata: {
          ...(request.metadata || {}),
          rejection_reason: reason || 'No especificado',
          rejected_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id)

    if (updateError) {
      console.error('Error rechazando solicitud:', updateError)
      return res.status(500).json({ error: 'Error rechazando la solicitud.' })
    }

    // Opcional: Enviar email de rechazo (implementar si es necesario)
    // Por ahora solo actualizamos el estado

    return res.status(200).json({ 
      success: true, 
      message: 'Solicitud rechazada exitosamente.' 
    })
  } catch (error: any) {
    console.error('Error rechazando solicitud de afiliado:', error)
    return res.status(500).json({ error: error.message || 'Error procesando el rechazo.' })
  }
}








