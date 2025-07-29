import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { last5, dni, justification } = req.body
    
    // Validación de parámetros de entrada
    if (!last5 && !dni) {
      console.error('Parámetros faltantes: dni o last5')
      return res.status(400).json({ error: 'Debe enviar dni o last5' })
    }

    const supabase = createAdminClient()

    // PASO 1: Verificar existencia de tablas requeridas
    console.log('🔍 Verificando existencia de tablas requeridas...')
    const requiredTables = ['employees', 'work_schedules', 'attendance_records']
    for (const table of requiredTables) {
      const { error: tableError } = await supabase.from(table).select('id').limit(1)
      if (tableError) {
        console.error(`❌ Tabla faltante o inaccesible: ${table}`, tableError)
        return res.status(500).json({ 
          error: `Error de base de datos: Tabla ${table} no disponible`,
          details: tableError.message 
        })
      }
    }
    console.log('✅ Todas las tablas requeridas están disponibles')

    // PASO 2: Validar existencia del empleado (público, sin company_id)
    console.log('🔍 Buscando empleado...', { dni, last5 })
    let employeeQuery = supabase
      .from('employees')
      .select('id, work_schedule_id, dni, name, status, position, company_id')
      .eq('status', 'active')

    if (dni) {
      employeeQuery = employeeQuery.eq('dni', dni)
    } else {
      // Buscar por last5 (últimos 5 dígitos del DNI)
      employeeQuery = employeeQuery.ilike('dni', `%${last5}`)
    }

    const { data: employees, error: empError } = await employeeQuery

    if (empError) {
      console.error('❌ Error consultando empleados:', empError)
      return res.status(500).json({ 
        error: 'Error consultando empleados',
        details: empError.message 
      })
    }

    if (!employees || employees.length === 0) {
      console.error('❌ Empleado no encontrado:', { dni, last5 })
      return res.status(404).json({ 
        error: 'Empleado no registrado',
        message: 'El empleado no existe en el sistema o no está activo'
      })
    }

    if (employees.length > 1) {
      console.error('❌ Múltiples empleados encontrados:', { dni, last5, count: employees.length })
      return res.status(400).json({ 
        error: 'Múltiples empleados encontrados',
        message: 'Contacte a Recursos Humanos para resolver la duplicación'
      })
    }

    const employee = employees[0]
    console.log('✅ Empleado encontrado:', { id: employee.id, name: employee.name, position: employee.position })

    // PASO 3: Validar work_schedule_id
    if (!employee.work_schedule_id) {
      console.error('❌ Empleado sin work_schedule_id:', employee)
      return res.status(400).json({ 
        error: 'Empleado sin horario asignado',
        message: 'El empleado no tiene un horario de trabajo configurado'
      })
    }

    // PASO 4: Obtener horario asignado
    console.log('🔍 Obteniendo horario asignado...', { work_schedule_id: employee.work_schedule_id })
    const { data: schedule, error: schedError } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('id', employee.work_schedule_id)
      .single()

    if (schedError || !schedule) {
      console.error('❌ Horario no encontrado:', schedError)
      return res.status(400).json({ 
        error: 'Horario no encontrado',
        message: 'El horario de trabajo no está configurado correctamente'
      })
    }
    console.log('✅ Horario obtenido:', schedule)

    // PASO 5: Comparar hora actual con horario esperado
    const now = new Date()
    const dayOfWeek = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase()
    const startKey = `${dayOfWeek}_start`
    const endKey = `${dayOfWeek}_end`
    const startTime = schedule[startKey]
    const endTime = schedule[endKey]

    if (!startTime || !endTime) {
      console.error('❌ Horario no definido para el día:', { dayOfWeek, schedule })
      return res.status(400).json({ 
        error: 'Horario no definido para hoy',
        message: 'No hay horario configurado para este día de la semana'
      })
    }

    // Parsear horas y calcular diferencia
    const [startHour, startMin] = startTime.split(':').map(Number)
    const expectedStart = new Date(now)
    expectedStart.setHours(startHour, startMin, 0, 0)
    
    const diffMinutes = Math.floor((now.getTime() - expectedStart.getTime()) / 60000)
    
    let status: 'Temprano' | 'A tiempo' | 'Tarde'
    if (diffMinutes < -5) {
      status = 'Temprano'
    } else if (diffMinutes <= 5) {
      status = 'A tiempo'
    } else {
      status = 'Tarde'
    }

    console.log('⏰ Comparación de horarios:', {
      horaActual: now.toLocaleTimeString(),
      horaEsperada: startTime,
      diferenciaMinutos: diffMinutes,
      status
    })

    // PASO 6: Registrar asistencia
    // Usar zona horaria de Honduras (UTC-6)
    const hondurasTime = new Date(now.getTime() - (6 * 60 * 60 * 1000)) // UTC-6
    const today = hondurasTime.toISOString().split('T')[0]
    console.log('📅 Fecha Honduras para registro:', today)
    
    const { data: existingRecord, error: attError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', today)
      .single()

    if (attError && attError.code !== 'PGRST116') {
      console.error('❌ Error consultando asistencia:', attError)
      return res.status(500).json({ 
        error: 'Error consultando asistencia',
        details: attError.message 
      })
    }

    if (!existingRecord) {
      // CHECK-IN: Primera vez hoy
      console.log('📝 Registrando entrada...')
      const lateMinutes = Math.max(0, diffMinutes)
      
      if (lateMinutes > 5 && !justification) {
        console.log('⚠️ Llegada tarde sin justificación')
        return res.status(422).json({
          requireJustification: true,
          message: '⏰ Has llegado tarde. Por favor justifica tu demora.',
          lateMinutes,
          expectedTime: startTime,
          actualTime: now.toLocaleTimeString()
        })
      }

      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: employee.id,
          date: today,
          check_in: now.toISOString(),
          expected_check_in: startTime,
          late_minutes: lateMinutes,
          justification: justification || null,
          status: lateMinutes > 5 ? 'late' : 'present'
        })

      if (insertError) {
        console.error('❌ Error registrando entrada:', insertError)
        return res.status(500).json({ 
          error: 'Error registrando entrada',
          details: insertError.message 
        })
      }
      console.log('✅ Entrada registrada exitosamente')

    } else if (!existingRecord.check_out) {
      // CHECK-OUT: Tiene entrada pero no salida
      console.log('📝 Registrando salida...')
      const [endHour, endMin] = endTime.split(':').map(Number)
      const expectedEnd = new Date(now)
      expectedEnd.setHours(endHour, endMin, 0, 0)
      const earlyDepartureMinutes = Math.max(0, Math.floor((expectedEnd.getTime() - now.getTime()) / 60000))

      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({
          check_out: now.toISOString(),
          expected_check_out: endTime,
          early_departure_minutes: earlyDepartureMinutes,
          updated_at: now.toISOString()
        })
        .eq('id', existingRecord.id)

      if (updateError) {
        console.error('❌ Error registrando salida:', updateError)
        return res.status(500).json({ 
          error: 'Error registrando salida',
          details: updateError.message 
        })
      }
      console.log('✅ Salida registrada exitosamente')

    } else {
      // Ya completó asistencia hoy
      console.log('⚠️ Asistencia ya completada para hoy')
      return res.status(400).json({ 
        error: '📌 Ya has registrado entrada y salida para hoy',
        message: 'Tu asistencia del día ya está completa'
      })
    }

    // PASO 7: Feedback gamificado
    console.log('🎮 Generando feedback gamificado...')
    const { data: recentRecords, error: recError } = await supabase
      .from('attendance_records')
      .select('id, status, created_at')
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (recError) {
      console.error('❌ Error consultando historial de asistencia:', recError)
    }

    let gamification = ''
    if (recentRecords && recentRecords.length > 0) {
      const lateCount = recentRecords.filter(r => r.status === 'late').length
      const presentCount = recentRecords.filter(r => r.status === 'present').length
      
      if (lateCount >= 3) {
        gamification = '⚠️ Has llegado tarde varias veces. ¡Intenta mejorar!'
      } else if (presentCount >= 5) {
        gamification = '🏅 ¡Excelente asistencia! Sigue así.'
      } else if (presentCount >= 3) {
        gamification = '👍 Buena puntualidad. ¡Mantén el ritmo!'
      }
    }

    // PASO 8: Mensaje final
    let message = ''
    if (status === 'Temprano') {
      message = '🎉 ¡Felicidades! Llegaste temprano'
    } else if (status === 'A tiempo') {
      message = '✅ Entrada registrada a tiempo'
    } else {
      message = '📝 Entrada tardía registrada'
    }

    if (gamification) {
      message += `\n${gamification}`
    }

    console.log('✅ Registro de asistencia completado:', { message, status, gamification })

    return res.status(200).json({ 
      message, 
      status, 
      gamification,
      employee: {
        name: employee.name,
        position: employee.position
      }
    })

  } catch (error) {
    console.error('❌ Error general en registro de asistencia:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.'
    })
  }
}
