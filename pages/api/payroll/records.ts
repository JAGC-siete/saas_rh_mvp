import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Validar autenticación
    const supabase = createClient(req, res)
    // Get user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = session.user.id

    // Verificar permisos del usuario
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', userId)
      .single()

    if (!userProfile || !['company_admin', 'hr_manager', 'super_admin'].includes(userProfile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    const { periodo, quincena } = req.query
    
    let query = supabase
      .from('payroll_records')
      .select(`
        *,
        employees!inner(name, dni, base_salary)
      `)
      .order('period_start', { ascending: false })
      .limit(50)

    // Filtrar por período si se especifica
    if (periodo && typeof periodo === 'string') {
      if (!/^\d{4}-\d{2}$/.test(periodo)) {
        return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' })
      }
      
      const [year, month] = periodo.split('-').map(Number)
      const ultimoDia = new Date(year, month, 0).getDate()
      
      if (quincena && typeof quincena === 'string') {
        const q = parseInt(quincena)
        if (![1, 2].includes(q)) {
          return res.status(400).json({ error: 'Quincena inválida (1 o 2)' })
        }
        
        const fechaInicio = q === 1 ? `${periodo}-01` : `${periodo}-16`
        const fechaFin = q === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`
        
        query = query
          .eq('period_start', fechaInicio)
          .eq('period_end', fechaFin)
      } else {
        // Filtrar por mes completo
        const fechaInicio = `${periodo}-01`
        const fechaFin = `${periodo}-${ultimoDia}`
        
        query = query
          .gte('period_start', fechaInicio)
          .lte('period_end', fechaFin)
      }
    }

    const { data: payrollRecords, error } = await query

    if (error) {
      console.error('❌ Error obteniendo registros de nómina:', error)
      return res.status(500).json({ error: 'Error obteniendo registros de nómina' })
    }

    console.log(`✅ Registros de nómina obtenidos: ${payrollRecords.length}`)

    return res.status(200).json({
      message: 'Registros de nómina obtenidos exitosamente',
      records: payrollRecords,
      total: payrollRecords.length
    })

  } catch (error) {
    console.error('❌ Error general obteniendo registros de nómina:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.'
    })
  }
} 