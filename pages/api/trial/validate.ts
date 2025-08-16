import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tenant } = req.query

    if (!tenant || typeof tenant !== 'string') {
      return res.status(400).json({ error: 'Tenant ID requerido' })
    }

    console.log('🔍 Validando trial para tenant:', tenant)

    // Crear cliente Supabase con permisos de admin
    const supabase = createAdminClient()
    if (!supabase) {
      console.error('❌ Error creando cliente Supabase')
      return res.status(500).json({ error: 'Error de conexión con la base de datos' })
    }

    // Buscar la activación del trial
    const { data: activacion, error: activacionError } = await supabase
      .from('activaciones')
      .select('*')
      .eq('tenant_id', tenant)
      .eq('status', 'trial_pending_data')
      .single()

    if (activacionError || !activacion) {
      console.error('❌ Error buscando activación:', activacionError)
      return res.status(404).json({ error: 'Trial no encontrado o inválido' })
    }

    // Verificar que el trial no haya expirado
    const trialExpiresAt = new Date(activacion.trial_expires_at)
    const now = new Date()

    if (trialExpiresAt < now) {
      console.log('⚠️ Trial expirado para tenant:', tenant)
      return res.status(410).json({ error: 'Trial expirado' })
    }

    // Preparar datos para el dashboard
    const trialData = {
      empresa: activacion.empresa,
      nombre: activacion.contacto_nombre,
      empleados: activacion.empleados,
      tenant_id: activacion.tenant_id,
      trial_expires_at: activacion.trial_expires_at,
      magic_link: activacion.magic_link
    }

    console.log('✅ Trial validado exitosamente para:', tenant)

    return res.status(200).json(trialData)

  } catch (error) {
    console.error('💥 Error validando trial:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
