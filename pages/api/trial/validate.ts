import { NextApiRequest, NextApiResponse } from 'next'

/**
 * Trial Validate API - SOLO DATOS DE PRUEBA
 * NO consulta la base de datos real
 * NO expone información del cliente
 */
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

    // SOLO DATOS DE PRUEBA - NO DATOS REALES
    const demoData = {
      empresa: 'Empresa Demo',
      nombre: 'Usuario de Prueba',
      empleados: 25,
      tenant_id: tenant,
      trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
      magic_link: '#'
    }

    console.log('✅ Trial validado exitosamente para:', tenant)

    return res.status(200).json(demoData)

  } catch (error) {
    console.error('💥 Error validando trial:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
