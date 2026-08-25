import { NextApiRequest, NextApiResponse } from 'next'

const DEMO_EMPLOYEES = [
  {
    id: 'demo-emp-1',
    name: 'Ana López',
    status: 'active',
    employee_code: 'D-001',
    department: 'Operaciones',
    base_salary: 18500,
  },
  {
    id: 'demo-emp-2',
    name: 'Carlos Méndez',
    status: 'active',
    employee_code: 'D-002',
    department: 'Ventas',
    base_salary: 16200,
  },
  {
    id: 'demo-emp-3',
    name: 'María Castillo',
    status: 'inactive',
    employee_code: 'D-003',
    department: 'Administración',
    base_salary: 14000,
  },
]

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!req.cookies['demo_ok']) {
    return res.status(401).json({ error: 'Demo access required' })
  }

  return res.status(200).json({ data: DEMO_EMPLOYEES })
}
