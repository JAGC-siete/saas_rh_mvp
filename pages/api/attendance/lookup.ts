import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createAdminClient()
  const { last5 } = req.body

  // 1. Verificar existencia de tablas requeridas
  const requiredTables = ['employees', 'work_schedules', 'attendance_records']
  for (const table of requiredTables) {
    const { error: tableError } = await supabase.from(table).select('id').limit(1)
    if (tableError) {
      console.error(`Tabla faltante o inaccesible: ${table}`, tableError)
      return res.status(500).json({ error: `Tabla faltante: ${table}` })
    }
  }

  // 2. Buscar empleado por últimos 5 dígitos del DNI (público)
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, work_schedule_id, dni, name, company_id')
    .like('dni', `%${last5}`)
    .eq('status', 'active')
    .single()
  if (empError || !employee) {
    console.error('Empleado no encontrado', empError)
    return res.status(404).json({ error: 'Empleado no encontrado' })
  }

  // 3. Validar existencia de work_schedule_id
  if (!employee.work_schedule_id) {
    console.error('Empleado sin work_schedule_id', employee)
    return res.status(400).json({ error: 'Empleado sin horario asignado' })
  }

  // 4. Obtener horario asignado
  const { data: schedule, error: schedError } = await supabase
    .from('work_schedules')
    .select('*')
    .eq('id', employee.work_schedule_id)
    .single()
  if (schedError || !schedule) {
    console.error('Horario no encontrado', schedError)
    return res.status(400).json({ error: 'Horario no encontrado' })
  }

  // 5. Comparar hora actual con horario esperado
  const now = new Date()
  const dayOfWeek = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase() // e.g. 'monday'
  const startKey = `${dayOfWeek}_start`
  const endKey = `${dayOfWeek}_end`
  const startTime = schedule[startKey]
  const endTime = schedule[endKey]

  if (!startTime || !endTime) {
    console.error('Horario no definido para el día', { dayOfWeek, schedule })
    return res.status(400).json({ error: 'Horario no definido para hoy' })
  }

  // Parsear horas (formato HH:mm)
  const [startHour, startMin] = startTime.split(':').map(Number)
  const expectedStart = new Date(now)
  expectedStart.setHours(startHour, startMin, 0, 0)

  let status: 'Temprano' | 'A tiempo' | 'Tarde'
  const diffMinutes = Math.floor((now.getTime() - expectedStart.getTime()) / 60000)
  if (diffMinutes < -5) status = 'Temprano'
  else if (diffMinutes <= 5) status = 'A tiempo'
  else status = 'Tarde'

  // 6. Feedback gamificado: contar llegadas tarde/ejemplares
  const { data: recentRecords, error: recError } = await supabase
    .from('attendance_records')
    .select('id, status, created_at')
    .eq('employee_id', employee.id)
    .order('created_at', { ascending: false })
    .limit(10)
  if (recError) {
    console.error('Error consultando registros recientes', recError)
    return res.status(500).json({ error: 'Error consultando historial de asistencia' })
  }

  const lateCount = recentRecords?.filter(r => r.status === 'Tarde').length || 0
  const onTimeCount = recentRecords?.filter(r => r.status === 'A tiempo').length || 0

  let gamification: string | null = null
  if (lateCount >= 3) gamification = 'Atención: Varias llegadas tarde detectadas.'
  else if (onTimeCount >= 5) gamification = '¡Excelente! Has sido puntual varias veces seguidas.'

  // 7. Retornar feedback
  return res.status(200).json({
    message: "Attendance lookup successful",
    employee: {
      id: employee.id,
      name: employee.name,
      dni: employee.dni,
      position: 'Empleado',
      company_name: 'Mi Empresa'
    },
    attendance: {
      hasCheckedIn: false,
      hasCheckedOut: false,
      checkInTime: null,
      checkOutTime: null
    },
    schedule: { start: startTime, end: endTime },
    status,
    gamification
  })
}
