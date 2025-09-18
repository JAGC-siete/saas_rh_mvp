import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

interface EmployeeProfileResponse {
  employee: {
    id: string
    name: string
    dni_masked: string
    role: string
    email?: string
    phone?: string
    hire_date?: string
    department?: {
      id: string
      name: string
    }
    work_schedule?: {
      id: string
      name: string
      monday_start?: string
      monday_end?: string
      tuesday_start?: string
      tuesday_end?: string
      wednesday_start?: string
      wednesday_end?: string
      thursday_start?: string
      thursday_end?: string
      friday_start?: string
      friday_end?: string
      saturday_start?: string
      saturday_end?: string
      sunday_start?: string
      sunday_end?: string
    }
    base_salary_masked: boolean // Don't expose actual salary
    status: string
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create Supabase client (handles auth automatically via cookies)
    const supabase = createClient(req, res)
    
    // Agregar filtro por employee_id de la sesión
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('employee_id')
      .eq('id', user.id)
      .single();

    if (!profile?.employee_id) return res.status(403).json({ error: 'No employee linked' });

    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('id', profile.employee_id)
      .single();

    return res.status(200).json(data);

  } catch (error) {
    if (error instanceof Error && error.message.startsWith('EMPLOYEE_')) {
      // Authentication error already handled
      return
    }

    logger.error('Employee profile API error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
