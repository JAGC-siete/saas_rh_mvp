import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)

    // Insert test work schedule first
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('work_schedules')
      .upsert({
        id: 'test-schedule-001',
        company_id: '00000000-0000-0000-0000-000000000001',
        name: 'Horario de Prueba',
        monday_start: '08:00',
        monday_end: '17:00',
        tuesday_start: '08:00',
        tuesday_end: '17:00',
        wednesday_start: '08:00',
        wednesday_end: '17:00',
        thursday_start: '08:00',
        thursday_end: '17:00',
        friday_start: '08:00',
        friday_end: '17:00'
      }, { onConflict: 'id' })

    if (scheduleError) {
      console.error('Error creating work schedule:', scheduleError)
      return res.status(500).json({ error: 'Error creating work schedule' })
    }

    // Insert test employee
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .upsert({
        id: 'test-emp-001',
        dni: 'TEST001',
        name: 'Empleado de Prueba',
        role: 'Tester',
        base_salary: 15000.0,
        bank_name: 'Test Bank',
        bank_account: '123456789',
        status: 'active',
        company_id: '00000000-0000-0000-0000-000000000001',
        work_schedule_id: 'test-schedule-001'
      }, { onConflict: 'dni' })

    if (employeeError) {
      console.error('Error creating employee:', employeeError)
      return res.status(500).json({ error: 'Error creating employee' })
    }

    res.status(200).json({ 
      success: true, 
      message: 'Test employee created successfully',
      employee: employeeData,
      schedule: scheduleData
    })

  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 