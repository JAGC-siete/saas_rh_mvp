import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createAdminClient()
  const { last5 } = req.body

  if (!last5 || !/^\d{5}$/.test(last5)) {
    return res.status(400).json({ error: 'Formato de DNI inválido. Proporcione exactamente 5 dígitos.' })
  }

  try {
    // Search for employee by last 5 digits of DNI
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select(`
        *,
        companies!inner(name),
        departments(name),
        work_schedules(
          monday_start, monday_end,
          tuesday_start, tuesday_end,
          wednesday_start, wednesday_end,
          thursday_start, thursday_end,
          friday_start, friday_end,
          saturday_start, saturday_end,
          sunday_start, sunday_end
        )
      `)
      .ilike('dni', `%${last5}`)
      .eq('status', 'active')

    if (employeeError) {
      console.error('Error de búsqueda de empleado:', employeeError)
      return res.status(500).json({ error: 'Error de base de datos durante la búsqueda de empleado' })
    }

    if (!employees || employees.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado con esos dígitos de DNI' })
    }

    if (employees.length > 1) {
      return res.status(400).json({ error: 'Múltiples empleados encontrados con esos dígitos de DNI. Contacte a RH.' })
    }

    const employee = employees[0]

    // Get today's attendance record
    const today = new Date().toISOString().split('T')[0]
    const { data: attendanceRecord, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .single()

    if (attendanceError && attendanceError.code !== 'PGRST116') {
      console.error('Error de búsqueda de asistencia:', attendanceError)
      return res.status(500).json({ error: 'Error de base de datos durante la búsqueda de asistencia' })
    }

    // Determine today's schedule
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayName = dayNames[dayOfWeek]
    
    let checkinTime = '08:00'
    let checkoutTime = '17:00'
    
    if (employee.work_schedules) {
      checkinTime = (employee.work_schedules as any)[`${todayName}_start`] || '08:00'
      checkoutTime = (employee.work_schedules as any)[`${todayName}_end`] || '17:00'
    }

    // Format employee data
    const employeeInfo = {
      id: employee.id,
      name: employee.name,
      dni: employee.dni,
      position: employee.position || employee.role,
      checkin_time: checkinTime,
      checkout_time: checkoutTime,
      company_name: employee.companies?.name || 'Paragon Honduras'
    }

    // Format attendance status
    const attendanceStatus = {
      hasCheckedIn: !!attendanceRecord?.check_in,
      hasCheckedOut: !!attendanceRecord?.check_out,
      checkInTime: attendanceRecord?.check_in ? 
        new Date(attendanceRecord.check_in).toLocaleTimeString('es-HN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }) : undefined,
      checkOutTime: attendanceRecord?.check_out ? 
        new Date(attendanceRecord.check_out).toLocaleTimeString('es-HN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }) : undefined
    }

    return res.status(200).json({
      employee: employeeInfo,
      attendance: attendanceStatus
    })

  } catch (error) {
    console.error('Error inesperado:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
