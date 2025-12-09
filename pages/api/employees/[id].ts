import { NextApiRequest, NextApiResponse } from 'next'
import { requireUser } from '../../../lib/auth/requireUser'
import { normalizeEmployeeData } from '../../../lib/utils/normalize-employee-data';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, userProfile } = await requireUser(req, res)
    const { id } = req.query

    if (!userProfile?.company_id) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    const companyId = userProfile.company_id

    switch (req.method) {
      case 'PUT':
        const { 
          name, 
          email, 
          phone, 
          employee_code, 
          position, 
          department_id, 
          base_salary, 
          hire_date,
          status
        } = req.body
        
        if (!name) {
          return res.status(400).json({ error: 'Employee name is required' })
        }

        // Normalize employee data before update
        const updateData = normalizeEmployeeData({
          name,
          email,
          phone,
          employee_code,
          position,
          department_id,
          base_salary: base_salary || 0,
          hire_date,
          status: status || 'active'
        });

        const { data: updatedEmployee, error: updateError } = await supabase
          .from('employees')
          .update(updateData)
          .eq('id', id)
          .eq('company_id', companyId)
          .select(`
            *,
            departments(name)
          `)
          .single()

        if (updateError) throw updateError
        return res.json({ employee: updatedEmployee })

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from('employees')
          .delete()
          .eq('id', id)
          .eq('company_id', companyId)

        if (deleteError) throw deleteError
        return res.status(204).end()

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('Employee API error:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}