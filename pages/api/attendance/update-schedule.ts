import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { employee_id, start_time, end_time, department_id } = req.body

    if (!employee_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'employee_id, start_time, and end_time are required' })
    }

    const supabase = createAdminClient()

    // First, check if employee exists
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employee_id)
      .single()

    if (empError || !employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Check if work schedule already exists
    let workScheduleId = employee.work_schedule_id

    if (!workScheduleId) {
      // Create new work schedule
      const { data: newSchedule, error: scheduleError } = await supabase
        .from('work_schedules')
        .insert({
          company_id: employee.company_id,
          name: `Horario de ${employee.name}`,
          monday_start: start_time,
          monday_end: end_time,
          tuesday_start: start_time,
          tuesday_end: end_time,
          wednesday_start: start_time,
          wednesday_end: end_time,
          thursday_start: start_time,
          thursday_end: end_time,
          friday_start: start_time,
          friday_end: end_time,
          saturday_start: null,
          saturday_end: null,
          sunday_start: null,
          sunday_end: null,
          break_duration: 60,
          timezone: 'America/Tegucigalpa'
        })
        .select('id')
        .single()

      if (scheduleError) {
        console.error('Error creating work schedule:', scheduleError)
        return res.status(500).json({ error: 'Error creating work schedule' })
      }

      workScheduleId = newSchedule.id

      // Update employee with new work schedule
      const { error: updateError } = await supabase
        .from('employees')
        .update({ work_schedule_id: workScheduleId })
        .eq('id', employee_id)

      if (updateError) {
        console.error('Error updating employee:', updateError)
        return res.status(500).json({ error: 'Error updating employee' })
      }
    } else {
      // Update existing work schedule
      const { error: updateScheduleError } = await supabase
        .from('work_schedules')
        .update({
          monday_start: start_time,
          monday_end: end_time,
          tuesday_start: start_time,
          tuesday_end: end_time,
          wednesday_start: start_time,
          wednesday_end: end_time,
          thursday_start: start_time,
          thursday_end: end_time,
          friday_start: start_time,
          friday_end: end_time,
          updated_at: new Date().toISOString()
        })
        .eq('id', workScheduleId)

      if (updateScheduleError) {
        console.error('Error updating work schedule:', updateScheduleError)
        return res.status(500).json({ error: 'Error updating work schedule' })
      }
    }

    // Log the schedule update
    await supabase
      .from('audit_logs')
      .insert({
        company_id: employee.company_id,
        user_id: employee_id,
        action: 'schedule_updated',
        table_name: 'work_schedules',
        record_id: workScheduleId,
        old_values: employee.work_schedule_id ? { 
          start: employee.work_schedule_id ? 'existing' : 'none',
          end: employee.work_schedule_id ? 'existing' : 'none'
        } : null,
        new_values: { start: start_time, end: end_time },
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
      })

    return res.status(200).json({
      success: true,
      message: 'Horario actualizado correctamente',
      work_schedule_id: workScheduleId,
      schedule: {
        start: start_time,
        end: end_time
      }
    })

  } catch (error) {
    console.error('Error updating schedule:', error)
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
} 