import { NextApiRequest, NextApiResponse } from 'next'
import { requireUser } from '../../../lib/auth/requireUser'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, userProfile } = await requireUser(req, res)
    
    if (!userProfile?.company_id) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    const companyId = userProfile.company_id

    switch (req.method) {
      case 'GET':
        const { data: employees, error: fetchError } = await supabase
          .from('employees')
          .select(`
            *,
            departments(name)
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
            departments(name)
          `)
          .single()

        if (createError) throw createError
        return res.status(201).json({ employee: newEmployee })

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Employees API error:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}