import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

// Horarios por defecto por departamento
const DEFAULT_SCHEDULES = {
  'hr': { start: '08:00', end: '17:00' },
  'manager': { start: '08:00', end: '17:00' },
  'customer_service': { start: '08:00', end: '17:00' },
  'customer_support': { start: '08:00', end: '17:00' },
  'sales': { start: '08:00', end: '17:00' },
  'marketing': { start: '08:00', end: '17:00' },
  'finance': { start: '08:00', end: '17:00' },
  'accounting': { start: '08:00', end: '17:00' },
  'it': { start: '08:00', end: '17:00' },
  'operations': { start: '08:00', end: '17:00' },
  'logistics': { start: '08:00', end: '17:00' },
  'warehouse': { start: '07:00', end: '16:00' }, // Horario diferente para warehouse
  'maintenance': { start: '07:00', end: '16:00' }, // Horario diferente para maintenance
  'security': { start: '06:00', end: '18:00' }, // Horario extendido para seguridad
  'cleaning': { start: '06:00', end: '15:00' }, // Horario temprano para limpieza
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { last5, employee_id } = req.body

    if (!last5 && !employee_id) {
      return res.status(400).json({ error: 'Either last5 or employee_id required' })
    }

    const supabase = createAdminClient()

    // Find employee
    let employee
    if (last5) {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments(name)
        `)
        .ilike('dni', `%${last5}`)
        .single()
      
      if (error || !data) {
        return res.status(404).json({ error: 'Employee not found' })
      }
      employee = data
    } else {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments(name)
        `)
        .eq('id', employee_id)
        .single()
      
      if (error || !data) {
        return res.status(404).json({ error: 'Employee not found' })
      }
      employee = data
    }

    // Check if this is the first time registering attendance
    const { data: previousRecords, error: recordsError } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('employee_id', employee.id)
      .lt('date', new Date().toISOString().split('T')[0])

    if (recordsError) {
      console.error('Error checking previous records:', recordsError)
      return res.status(500).json({ error: 'Error checking attendance history' })
    }

    const isFirstTime = previousRecords.length === 0

    if (!isFirstTime) {
      return res.status(200).json({ 
        isFirstTime: false,
        message: 'Not first time registration'
      })
    }

    // Get current work schedule if exists
    let currentSchedule = null
    if (employee.work_schedule_id) {
      const { data: schedule } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('id', employee.work_schedule_id)
        .single()
      
      currentSchedule = schedule
    }

    // Get department name
    const departmentName = employee.departments?.name?.toLowerCase() || 'unknown'
    
    // Get default schedule for department
    const defaultSchedule = DEFAULT_SCHEDULES[departmentName as keyof typeof DEFAULT_SCHEDULES] || 
                           DEFAULT_SCHEDULES['hr'] // Fallback to HR schedule

    // Determine if schedule needs verification
    const needsScheduleVerification = !currentSchedule || 
                                    currentSchedule.monday_start !== defaultSchedule.start ||
                                    currentSchedule.monday_end !== defaultSchedule.end

    return res.status(200).json({
      isFirstTime: true,
      employee: {
        id: employee.id,
        name: employee.name,
        employee_code: employee.employee_code,
        department: employee.departments?.name,
        department_id: employee.department_id
      },
      currentSchedule: currentSchedule ? {
        start: currentSchedule.monday_start,
        end: currentSchedule.monday_end
      } : null,
      defaultSchedule,
      needsScheduleVerification,
      welcomeMessage: `¡Bienvenido ${employee.name}! Este es tu primer registro en el sistema de asistencia.`
    })

  } catch (error) {
    console.error('Error in first-time check:', error)
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
} 