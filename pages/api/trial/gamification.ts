import { NextApiRequest, NextApiResponse } from 'next'

/**
 * Trial Gamification API - SOLO DATOS DE PRUEBA
 * NO consulta la base de datos real
 * NO expone información del cliente
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tenant, limit = '20' } = req.query
    if (!tenant || typeof tenant !== 'string') {
      return res.status(400).json({ error: 'Tenant requerido' })
    }

    // SOLO DATOS DE PRUEBA - NO DATOS REALES
    const demoData = {
      company: { 
        id: 'demo-company-id', 
        name: 'Empresa Demo', 
        subdomain: tenant 
      },
      leaderboard: [
        {
          rank: 1,
          employee_id: 'emp-1',
          name: 'Juan Pérez',
          employee_code: 'EMP001',
          department_id: 'dept-1',
          total_points: 1250
        },
        {
          rank: 2,
          employee_id: 'emp-2',
          name: 'María García',
          employee_code: 'EMP002',
          department_id: 'dept-2',
          total_points: 1180
        },
        {
          rank: 3,
          employee_id: 'emp-3',
          name: 'Carlos López',
          employee_code: 'EMP003',
          department_id: 'dept-3',
          total_points: 1120
        },
        {
          rank: 4,
          employee_id: 'emp-4',
          name: 'Ana Rodríguez',
          employee_code: 'EMP004',
          department_id: 'dept-4',
          total_points: 1050
        },
        {
          rank: 5,
          employee_id: 'emp-5',
          name: 'Luis Martínez',
          employee_code: 'EMP005',
          department_id: 'dept-5',
          total_points: 980
        }
      ],
      departmentPoints: [
        { department_id: 'Ventas', points: 2850 },
        { department_id: 'Marketing', points: 2230 },
        { department_id: 'IT', points: 1980 },
        { department_id: 'RH', points: 1750 },
        { department_id: 'Finanzas', points: 1620 }
      ]
    }

    return res.status(200).json(demoData)
  } catch (error) {
    console.error('💥 Error en trial gamification:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}


