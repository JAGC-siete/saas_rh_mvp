import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
<<<<<<< HEAD
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
=======
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
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
        )
      `)
      .ilike('dni', `%${last5}`)
      .eq('status', 'active')

<<<<<<< HEAD
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
=======
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
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', today)
<<<<<<< HEAD
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
=======
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

>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
    const employeeInfo = {
      id: employee.id,
      name: employee.name,
      dni: employee.dni,
<<<<<<< HEAD
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
=======
      position: employee.position,
      checkin_time: checkinTime,
      checkout_time: checkoutTime,
      company_name: (employee.companies as any)?.name || 'N/A'
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
    }

    return res.status(200).json({
      employee: employeeInfo,
      attendance: attendanceStatus
    })

  } catch (error) {
<<<<<<< HEAD
    console.error('Error inesperado:', error)
=======
    console.error('Lookup error:', error)
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
