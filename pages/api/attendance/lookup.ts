import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { last5 } = req.body

    if (!last5 || !/^\d{5}$/.test(last5)) {
      return res.status(400).json({ error: 'Los últimos 5 dígitos del DNI son requeridos' })
    }

    // Use admin client for public lookup
    const supabase = createAdminClient()

    // Find employee by last 5 digits of DNI
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select(`
        id,
        name,
        dni,
        position,
        status,
        companies!inner (
          name
        ),
        work_schedules (
          monday_start,
          monday_end,
          tuesday_start,
          tuesday_end,
          wednesday_start,
          wednesday_end,
          thursday_start,
          thursday_end,
          friday_start,
          friday_end,
          saturday_start,
          saturday_end,
          sunday_start,
          sunday_end
        )
      `)
      .ilike('dni', `%${last5}`)
      .eq('status', 'active')

    if (empError) {
      console.error('Database error:', empError)
      return res.status(500).json({ error: 'Error en la base de datos' })
    }

    if (!employees || employees.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado con esos dígitos del DNI' })
    }

    if (employees.length > 1) {
      return res.status(400).json({ error: 'Múltiples empleados encontrados. Contacte a RH.' })
    }

    const employee = employees[0]
    const today = new Date().toISOString().split('T')[0]
    const dayOfWeek = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Get work schedule for today
    const schedule = employee.work_schedules
    let checkinTime = '08:00'
    let checkoutTime = '17:00'

    if (schedule) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const todayName = dayNames[dayOfWeek]
      checkinTime = (schedule as any)[`${todayName}_start`] || '08:00'
      checkoutTime = (schedule as any)[`${todayName}_end`] || '17:00'
    }

    // Check today's attendance
    const { data: attendanceRecords, error: attError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .limit(1)

    if (attError) {
      console.error('Attendance lookup error:', attError)
      return res.status(500).json({ error: 'Error consultando asistencia' })
    }

    const todayAttendance = attendanceRecords?.[0]

    const attendanceStatus = {
      hasCheckedIn: !!todayAttendance?.check_in,
      hasCheckedOut: !!todayAttendance?.check_out,
      checkInTime: todayAttendance?.check_in ? 
        new Date(todayAttendance.check_in).toLocaleTimeString('es-HN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }) : null,
      checkOutTime: todayAttendance?.check_out ? 
        new Date(todayAttendance.check_out).toLocaleTimeString('es-HN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }) : null
    }

    const employeeInfo = {
      id: employee.id,
      name: employee.name,
      dni: employee.dni,
      position: employee.position,
      checkin_time: checkinTime,
      checkout_time: checkoutTime,
      company_name: (employee.companies as any)?.name || 'N/A'
    }

    return res.status(200).json({
      employee: employeeInfo,
      attendance: attendanceStatus
    })

  } catch (error) {
    console.error('Lookup error:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
