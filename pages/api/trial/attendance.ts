import { NextApiRequest, NextApiResponse } from 'next'

/**
 * Trial Attendance API - SOLO DATOS DE PRUEBA
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
      return res.status(400).json({ error: 'Tenant requerido' })
    }

    // SOLO DATOS DE PRUEBA - NO DATOS REALES
    const demoData = {
      company: { 
        id: 'demo-company-id', 
        name: 'Empresa Demo', 
        subdomain: tenant 
      },
      period: { 
        startDate: '2025-08-01', 
        endDate: '2025-08-31' 
      },
      kpis: {
        totalEmployees: 25,
        present: 580,
        absent: 195,
        late: 87,
        onTime: 493,
        attendanceRate: 74.8,
        punctualityRate: 85.0
      },
      dailyStats: Array.from({ length: 31 }, (_, i) => ({
        date: `2025-08-${(i + 1).toString().padStart(2, '0')}`,
        attendanceCount: Math.floor(Math.random() * 20) + 15,
        attendanceRate: Math.floor(Math.random() * 30) + 60
      })),
      absentList: [
        { id: 'emp-1', name: 'Juan Pérez', team: 'Ventas', absentDays: 3 },
        { id: 'emp-2', name: 'María García', team: 'Marketing', absentDays: 2 },
        { id: 'emp-3', name: 'Carlos López', team: 'IT', absentDays: 1 }
      ],
      earlyList: [
        { id: 'emp-4', name: 'Ana Rodríguez', team: 'RH', delta_min: 15, check_in_time: '2025-08-15T07:30:00Z' },
        { id: 'emp-5', name: 'Luis Martínez', team: 'Finanzas', delta_min: 10, check_in_time: '2025-08-15T07:35:00Z' }
      ],
      lateList: [
        { id: 'emp-6', name: 'Sofia Torres', team: 'Ventas', delta_min: 5, check_in_time: '2025-08-15T08:05:00Z' },
        { id: 'emp-7', name: 'Roberto Silva', team: 'Marketing', delta_min: 12, check_in_time: '2025-08-15T08:12:00Z' }
      ],
      employeeStats: [
        { employee_id: 'emp-1', name: 'Juan Pérez', presentDays: 28, absentDays: 3, lateDays: 2 },
        { employee_id: 'emp-2', name: 'María García', presentDays: 29, absentDays: 2, lateDays: 1 },
        { employee_id: 'emp-3', name: 'Carlos López', presentDays: 30, absentDays: 1, lateDays: 0 }
      ]
    }

    return res.status(200).json(demoData)
  } catch (error) {
    console.error('💥 Error en trial attendance:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}


