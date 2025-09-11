import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)
    
    // Check if user has permission to manage employees
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions to manage employees' })
    }

    switch (req.method) {
      case 'GET':
        const { data: employees, error: fetchError } = await supabase
          .from('employees')
          .select(`
            *,
            departments!employees_department_id_fkey(name)
          `)
          .eq('company_id', companyId)
          .order('name')

        if (fetchError) throw fetchError
        return res.json({ employees })

      case 'POST':
        const { 
          name, 
          email, 
          phone, 
          employee_code, 
          position, 
          department_id, 
          base_salary, 
          hire_date 
        } = req.body
        
        if (!name) {
          return res.status(400).json({ error: 'Employee name is required' })
        }

        const { data: newEmployee, error: createError } = await supabase
          .from('employees')
          .insert([{
            company_id: companyId,
            name,
            email: email || null,
            phone: phone || null,
            employee_code: employee_code || null,
            position: position || null,
            department_id: department_id || null,
            base_salary: base_salary || 0,
            hire_date: hire_date || null
          }])
          .select(`
            *,
            departments!employees_department_id_fkey(name)
          `)
          .single()

        if (createError) throw createError
        return res.status(201).json({ employee: newEmployee })

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Employees API error:', error)
    
    // Handle specific authentication errors
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'User profile required' })
    }
    if (error.message === 'COMPANY_ACCESS_REQUIRED') {
      return res.status(400).json({ error: 'Company access required. Please contact administrator to assign you to a company.' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}