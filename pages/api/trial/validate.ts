import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { getHondurasTimestamp, nowInHonduras } from '../../../lib/timezone'

/**
 * Trial Validate API - Valida y retorna información del trial
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

    // Crear cliente Supabase con permisos de admin
    const supabase = createAdminClient()
    if (!supabase) {
      console.error('❌ Error creando cliente Supabase')
      return res.status(500).json({ error: 'Error de conexión con la base de datos' })
    }

    // Buscar el usuario de acceso al trial
    const { data: trialUser, error: trialUserError } = await supabase
      .from('trial_access_users')
      .select('*')
      .eq('tenant_id', tenant)
      .eq('is_active', true)
      .single()

    if (trialUserError || !trialUser) {
      console.error('❌ Error buscando usuario de trial:', trialUserError)
      return res.status(404).json({ error: 'Trial no encontrado o inválido' })
    }

    // Buscar la empresa demo
    const { data: demoCompany, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', trialUser.company_id)
      .eq('is_active', true)
      .single()

    if (companyError || !demoCompany) {
      console.error('❌ Error buscando empresa demo:', companyError)
      return res.status(500).json({ error: 'Error interno del sistema' })
    }

    // Verificar que el trial no haya expirado (30 días desde creación)
    const trialExpiresAt = new Date(trialUser.created_at)
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 30)
    const now = nowInHonduras()

    if (trialExpiresAt < now) {
      console.log('⚠️ Trial expirado para tenant:', tenant)
      return res.status(410).json({ error: 'Trial expirado' })
    }

    // Actualizar estadísticas de acceso
    await supabase
      .from('trial_access_users')
      .update({ 
        last_access_at: getHondurasTimestamp(),
        access_count: (trialUser.access_count || 0) + 1
      })
      .eq('id', trialUser.id)

    // Contar empleados reales de la empresa demo
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id', { count: 'exact' })
      .eq('company_id', trialUser.company_id)
      .eq('status', 'active')

    let employeeCount: number
    if (employeesError) {
      console.error('❌ Error contando empleados:', employeesError)
      // Si hay error, usar el valor por defecto
      employeeCount = trialUser.empleados_solicitados || 0
    } else {
      employeeCount = employees?.length || 0
    }

    // Preparar datos para el dashboard
    const trialData = {
      empresa: trialUser.empresa_solicitante || 'Empresa Demo',
      nombre: trialUser.nombre,
      empleados: employeeCount,
      tenant_id: trialUser.tenant_id,
      trial_expires_at: trialExpiresAt.toISOString(),
      magic_link: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'https://humanosisu.net'}/trial-dashboard?tenant=${trialUser.tenant_id}&trial=true`
    }

    console.log('✅ Trial validado exitosamente para:', tenant)

    return res.status(200).json(trialData)

  } catch (error) {
    console.error('💥 Error validando trial:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
