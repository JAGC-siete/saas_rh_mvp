import { NextApiRequest, NextApiResponse } from 'next'

/**
 * Trial Payroll API - SOLO DATOS DE PRUEBA
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
      summary: {
        employees: 25,
        totalGross: 1250000,
        totalIHSS: 62500,
        totalRAP: 18750,
        totalISR: 125000,
        totalDeductions: 206250,
        totalNet: 1043750,
        totalDaysWorked: 620,
        totalDaysAbsent: 155,
        totalLateDays: 45
      },
      records: [
        {
          employee_id: 'emp-1',
          name: 'Juan Pérez',
          department_id: 'dept-1',
          monthly_salary: 50000,
          days_worked: 28,
          days_absent: 3,
          late_days: 2,
          gross_salary: 46667,
          ihss: 2500,
          rap: 750,
          isr: 5000,
          total_deductions: 8250,
          net_salary: 38417
        },
        {
          employee_id: 'emp-2',
          name: 'María García',
          department_id: 'dept-2',
          monthly_salary: 45000,
          days_worked: 29,
          days_absent: 2,
          late_days: 1,
          gross_salary: 43500,
          ihss: 2250,
          rap: 675,
          isr: 4500,
          total_deductions: 7425,
          net_salary: 36075
        },
        {
          employee_id: 'emp-3',
          name: 'Carlos López',
          department_id: 'dept-3',
          monthly_salary: 40000,
          days_worked: 30,
          days_absent: 1,
          late_days: 0,
          gross_salary: 40000,
          ihss: 2000,
          rap: 600,
          isr: 4000,
          total_deductions: 6600,
          net_salary: 33400
        }
      ]
    }

    return res.status(200).json(demoData)
  } catch (error) {
    console.error('💥 Error en trial payroll:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}


