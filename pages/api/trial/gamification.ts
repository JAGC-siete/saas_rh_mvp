import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tenant, limit = '20' } = req.query
    if (!tenant || typeof tenant !== 'string') {
      return res.status(400).json({ error: 'Tenant requerido' })
    }

    const supabase = createAdminClient()

    // Resolve company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, subdomain')
      .eq('subdomain', tenant)
      .single()

    if (companyError || !company) {
      return res.status(404).json({ error: 'Empresa (tenant) no encontrada' })
    }

    // Fetch leaderboard-like data from employee_scores (if exists), else synthesize from attendance
    const { data: scores, error: scoresError } = await supabase
      .from('employee_scores')
      .select('employee_id, company_id, total_points')
      .eq('company_id', company.id)
      .order('total_points', { ascending: false })
      .limit(Number(limit))

    if (scoresError && !String(scoresError.message || '').includes('does not exist')) {
      return res.status(500).json({ error: 'Error obteniendo puntajes', details: scoresError })
    }

    const employeeIds = (scores || []).map((s: any) => s.employee_id)
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, employee_code, department_id')
      .eq('company_id', company.id)
      .in('id', employeeIds.length > 0 ? employeeIds : ['00000000-0000-0000-0000-000000000000'])

    if (empError) {
      return res.status(500).json({ error: 'Error obteniendo empleados', details: empError })
    }

    const employeeById = new Map((employees || []).map((e: any) => [e.id, e]))
    const leaderboard = (scores || []).map((s: any, index: number) => {
      const e = employeeById.get(s.employee_id)
      return {
        rank: index + 1,
        employee_id: s.employee_id,
        name: e?.name || 'N/A',
        employee_code: e?.employee_code || '',
        department_id: e?.department_id || null,
        total_points: s.total_points || 0,
      }
    })

    // Department points aggregation (simple sum)
    const pointsByDept = new Map<string, number>()
    for (const row of leaderboard) {
      const dept = row.department_id || 'sin-departamento'
      pointsByDept.set(dept, (pointsByDept.get(dept) || 0) + (row.total_points || 0))
    }
    const departmentPoints = Array.from(pointsByDept.entries()).map(([dept, points]) => ({ department_id: dept, points }))

    return res.status(200).json({
      company: { id: company.id, name: company.name, subdomain: company.subdomain },
      leaderboard,
      departmentPoints,
    })
  } catch (error) {
    console.error('💥 Error en trial gamification:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}


