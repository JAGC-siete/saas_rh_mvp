import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { evaluateAndAwardAchievements } from '../../../lib/gamification-utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { employee_id, company_id, days_back = 60, admin_key } = req.body

    // Verificación simple con clave admin
    if (admin_key !== 'jorgegoku07sisu') {
      return res.status(401).json({ error: 'Invalid admin key' })
    }

    if (!employee_id && !company_id) {
      return res.status(400).json({ 
        error: 'Se requiere employee_id o company_id' 
      })
    }

    const supabase = createAdminClient()
    let employees: any[] = []

    if (employee_id) {
      // Procesar empleado específico
      const { data: employee, error } = await supabase
        .from('employees')
        .select('id, company_id, name')
        .eq('id', employee_id)
        .single()

      if (error || !employee) {
        return res.status(404).json({ error: 'Empleado no encontrado' })
      }
      employees = [employee]
    } else if (company_id) {
      // Procesar todos los empleados de la empresa
      const { data: companyEmployees, error } = await supabase
        .from('employees')
        .select('id, company_id, name')
        .eq('company_id', company_id)
        .eq('status', 'active')

      if (error) {
        return res.status(500).json({ error: 'Error obteniendo empleados' })
      }
      employees = companyEmployees || []
    }

    const results = []
    let totalAchievementsAwarded = 0

    for (const employee of employees) {
      try {
        console.log(`🔄 Procesando achievements para ${employee.name} (${employee.id})`)
        
        const newAchievements = await evaluateAndAwardAchievements(
          employee.id, 
          employee.company_id
        )

        results.push({
          employee_id: employee.id,
          employee_name: employee.name,
          achievements_awarded: newAchievements.length,
          achievements: newAchievements.map(a => ({
            name: a.achievement_type?.name,
            points: a.points_earned,
            earned_at: a.earned_at
          }))
        })

        totalAchievementsAwarded += newAchievements.length
      } catch (error) {
        console.error(`Error procesando ${employee.name}:`, error)
        results.push({
          employee_id: employee.id,
          employee_name: employee.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    return res.status(200).json({
      success: true,
      message: `Procesados ${employees.length} empleados`,
      total_achievements_awarded: totalAchievementsAwarded,
      results,
      summary: {
        employees_processed: employees.length,
        employees_with_achievements: results.filter(r => r.achievements_awarded > 0).length,
        total_achievements: totalAchievementsAwarded
      }
    })

  } catch (error) {
    console.error('Error en reprocess-achievements:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
