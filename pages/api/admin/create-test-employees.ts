import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

const TEST_EMPLOYEES = [
  {
    dni: '123456789012345',
    name: 'Ana María González',
    employee_code: 'EMP001',
    department: 'hr',
    position: 'HR Manager',
    base_salary: 2500
  },
  {
    dni: '234567890123456',
    name: 'Carlos Rodríguez',
    employee_code: 'EMP002',
    department: 'customer_service',
    position: 'Customer Service Rep',
    base_salary: 1800
  },
  {
    dni: '345678901234567',
    name: 'María José López',
    employee_code: 'EMP003',
    department: 'warehouse',
    position: 'Warehouse Operator',
    base_salary: 1600
  },
  {
    dni: '456789012345678',
    name: 'Juan Carlos Pérez',
    employee_code: 'EMP004',
    department: 'manager',
    position: 'Department Manager',
    base_salary: 3000
  },
  {
    dni: '567890123456789',
    name: 'Laura Fernández',
    employee_code: 'EMP005',
    department: 'it',
    position: 'Software Developer',
    base_salary: 2800
  },
  {
    dni: '678901234567890',
    name: 'Roberto Silva',
    employee_code: 'EMP006',
    department: 'marketing',
    position: 'Marketing Specialist',
    base_salary: 2200
  },
  {
    dni: '789012345678901',
    name: 'Carmen Torres',
    employee_code: 'EMP007',
    department: 'finance',
    position: 'Financial Analyst',
    base_salary: 2400
  },
  {
    dni: '890123456789012',
    name: 'Diego Morales',
    employee_code: 'EMP008',
    department: 'sales',
    position: 'Sales Representative',
    base_salary: 2000
  },
  {
    dni: '901234567890123',
    name: 'Patricia Vargas',
    employee_code: 'EMP009',
    department: 'operations',
    position: 'Operations Coordinator',
    base_salary: 2100
  },
  {
    dni: '012345678901234',
    name: 'Fernando Ruiz',
    employee_code: 'EMP010',
    department: 'legal',
    position: 'Legal Assistant',
    base_salary: 2300
  }
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createAdminClient()

    // Get company ID (assuming first company)
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .limit(1)

    if (!companies || companies.length === 0) {
      return res.status(400).json({ error: 'No company found. Please create a company first.' })
    }

    const companyId = companies[0].id

    // Get departments
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name')
      .eq('company_id', companyId)

    if (!departments || departments.length === 0) {
      return res.status(400).json({ error: 'No departments found. Please create departments first.' })
    }

    const departmentMap = departments.reduce((acc, dept) => {
      acc[dept.name.toLowerCase()] = dept.id
      return acc
    }, {} as Record<string, string>)

    const createdEmployees = []

    for (const employeeData of TEST_EMPLOYEES) {
      const departmentId = departmentMap[employeeData.department] || departments[0].id

      const { data: employee, error } = await supabase
        .from('employees')
        .insert({
          company_id: companyId,
          department_id: departmentId,
          dni: employeeData.dni,
          name: employeeData.name,
          employee_code: employeeData.employee_code,
          position: employeeData.position,
          base_salary: employeeData.base_salary,
          status: 'active',
          hire_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (error) {
        console.error(`Error creating employee ${employeeData.name}:`, error)
        continue
      }

      createdEmployees.push({
        id: employee.id,
        name: employee.name,
        dni: employee.dni,
        last5: employee.dni.slice(-5),
        department: employeeData.department
      })
    }

    return res.status(200).json({
      message: `Created ${createdEmployees.length} test employees`,
      employees: createdEmployees,
      testDNIs: createdEmployees.map(emp => emp.last5)
    })

  } catch (error) {
    console.error('Error creating test employees:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 