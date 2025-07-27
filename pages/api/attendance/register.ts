import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { last5, justification } = req.body

    if (!last5 || !/^\d{5}$/.test(last5)) {
      return res.status(400).json({ error: 'Los últimos 5 dígitos del DNI son requeridos' })
    }

    // Use admin client for public registration
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

    if (empError || !employees || employees.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' })
    }

    if (employees.length > 1) {
      return res.status(400).json({ error: 'Múltiples empleados encontrados. Contacte a RH.' })
    }

    const employee = employees[0]
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5)
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.

    // Get work schedule for today
    const schedule = employee.work_schedules
    let expectedCheckIn = '08:00'
    let expectedCheckOut = '17:00'

    if (schedule) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const todayName = dayNames[dayOfWeek]
      expectedCheckIn = (schedule as any)[`${todayName}_start`] || '08:00'
      expectedCheckOut = (schedule as any)[`${todayName}_end`] || '17:00'
    }

    // Check existing attendance record for today
    const { data: existingRecord, error: attError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .single()

    if (attError && attError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Attendance query error:', attError)
      return res.status(500).json({ error: 'Error consultando asistencia' })
    }

    if (!existingRecord) {
      // CHECK-IN: First time today
      
      // Calculate if late
      const [expectedHour, expectedMin] = expectedCheckIn.split(':').map(Number)
      const [currentHour, currentMin] = currentTime.split(':').map(Number)
      const expectedMinutes = expectedHour * 60 + expectedMin
      const currentMinutes = currentHour * 60 + currentMin
      const lateMinutes = Math.max(0, currentMinutes - expectedMinutes)

      // Require justification if more than 5 minutes late
      if (lateMinutes > 5 && !justification) {
        return res.status(422).json({
          requireJustification: true,
          message: '⏰ Has llegado tarde. Por favor justifica tu demora.',
          lateMinutes
        })
      }

      // Insert check-in record
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: employee.id,
          date: today,
          check_in: now.toISOString(),
          expected_check_in: expectedCheckIn,
          late_minutes: lateMinutes,
          justification: justification || null,
          status: lateMinutes > 5 ? 'late' : 'present'
        })

      if (insertError) {
        console.error('Check-in insert error:', insertError)
        return res.status(500).json({ error: 'Error registrando entrada' })
      }

      const message = lateMinutes <= 5 
        ? '✅ Entrada registrada correctamente'
        : lateMinutes <= 0
        ? '🎉 ¡Felicidades! Llegaste temprano'
        : '📝 Entrada tardía registrada con justificación'

      return res.status(200).json({ 
        message, 
        type: 'check-in',
        lateMinutes 
      })

    } else if (!existingRecord.check_out) {
      // CHECK-OUT: Has checked in but not out
      
      // Calculate early departure
      const [expectedHour, expectedMin] = expectedCheckOut.split(':').map(Number)
      const [currentHour, currentMin] = currentTime.split(':').map(Number)
      const expectedMinutes = expectedHour * 60 + expectedMin
      const currentMinutes = currentHour * 60 + currentMin
      const earlyDepartureMinutes = Math.max(0, expectedMinutes - currentMinutes)

      // Update record with check-out
      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({
          check_out: now.toISOString(),
          expected_check_out: expectedCheckOut,
          early_departure_minutes: earlyDepartureMinutes,
          updated_at: now.toISOString()
        })
        .eq('id', existingRecord.id)

      if (updateError) {
        console.error('Check-out update error:', updateError)
        return res.status(500).json({ error: 'Error registrando salida' })
      }

      const message = earlyDepartureMinutes > 5
        ? '🔄 Salida anticipada registrada'
        : earlyDepartureMinutes <= 0
        ? '⏰ Salida tardía registrada'
        : '✅ Salida registrada correctamente'

      return res.status(200).json({ 
        message, 
        type: 'check-out',
        earlyDepartureMinutes 
      })

    } else {
      // Already completed attendance for today
      return res.status(400).json({ 
        error: '📌 Ya has registrado entrada y salida para hoy'
      })
    }

  } catch (error) {
    console.error('Attendance registration error:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
