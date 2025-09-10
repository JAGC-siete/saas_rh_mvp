import { NextApiRequest, NextApiResponse } from 'next'
import { requireRoles } from '../../../lib/auth/api-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Use new authentication helper with role requirements
    const { supabase, companyId, role } = await requireRoles(req, res, [
      'super_admin', 'company_admin', 'hr_manager'
    ])

    const { periodo, quincena } = req.query
    
    let query = supabase
      .from('payroll_records')
      .select(`
        *,
        employees!payroll_records_employee_id_fkey(name, dni, base_salary, company_id)
      `)
      .eq('employees.company_id', companyId)
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