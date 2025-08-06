import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient, createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { 
  getHondurasTime, 
  getHondurasTimeISO, 
  getTodayInHonduras,
  getCurrentDayOfWeek,
  parseExpectedTime,
  getAttendanceStatus,
  calculateMinutesDifference
} from '../../../lib/timezone'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 🔒 AUTENTICACIÓN REQUERIDA
  try {
    const supabase = createClient(req, res)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return res.status(401).json({ 
        error: 'No autorizado',
        message: 'Debe iniciar sesión para registrar asistencia'
      })
    }

    // Verificar que el usuario tiene permisos para registrar asistencia
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, permissions, company_id')
      .eq('id', session.user.id)
      .single()

    if (!userProfile) {
      return res.status(403).json({ 
        error: 'Perfil no encontrado',
        message: 'Su perfil de usuario no está configurado correctamente'
      })
    }

    // Verificar permisos (admin, manager, o employee pueden registrar asistencia)
    const allowedRoles = ['admin', 'manager', 'employee']
    if (!allowedRoles.includes(userProfile.role)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para registrar asistencia'
      })
    }

    console.log('🔐 Usuario autenticado:', { 
      userId: session.user.id, 
      role: userProfile.role,
      companyId: userProfile.company_id 
    })
  } catch (authError) {
    console.error('❌ Error de autenticación:', authError)
    return res.status(500).json({ 
      error: 'Error de autenticación',
      message: 'No se pudo verificar la autenticación'
    })
  }

  try {
    const { last5, dni, justification } = req.body

    logger.info('Attendance registration attempt', {
      hasLast5: !!last5,
      hasDni: !!dni,
      hasJustification: !!justification
    })

    // Validación de parámetros de entrada
    if (!last5 && !dni) {
      logger.warn('Missing parameters for attendance registration')
      return res.status(400).json({ error: 'Debe enviar dni o last5' })
    }

    const supabase = createAdminClient()

    // PASO 1: Verificar existencia de tablas requeridas
    logger.debug('Verifying required tables')
    const requiredTables = ['employees', 'work_schedules', 'attendance_records']
    for (const table of requiredTables) {
      const { error: tableError } = await supabase.from(table).select('id').limit(1)
      if (tableError) {
        logger.error('Required table missing or inaccessible', tableError, { table })
        return res.status(500).json({ 
          error: `Error de base de datos: Tabla ${table} no disponible`,
          details: tableError.message 
        })
      }
    }
    logger.debug('All required tables are available')

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

    // PASO 5: Comparar hora actual con horario esperado (usando zona horaria de Honduras)
    const hondurasTime = getHondurasTime()
    const dayOfWeek = getCurrentDayOfWeek()
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

    // Parsear horas y calcular diferencia usando hora de Honduras
    const expectedStart = parseExpectedTime(startTime, hondurasTime)
    const diffMinutes = calculateMinutesDifference(hondurasTime, expectedStart)
    const status = getAttendanceStatus(hondurasTime, expectedStart)

    console.log('⏰ Comparación de horarios:', {
      horaActual: hondurasTime.toLocaleTimeString(),
      horaEsperada: startTime,
      diferenciaMinutos: diffMinutes,
      status
    })

    // PASO 6: Registrar asistencia
    // Usar zona horaria de Honduras correctamente
    const today = getTodayInHonduras()
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
          actualTime: hondurasTime.toLocaleTimeString()
        })
      }

      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: employee.id,
          date: today,
          check_in: getHondurasTimeISO(),
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
      const expectedEnd = parseExpectedTime(endTime, hondurasTime)
      const earlyDepartureMinutes = Math.max(0, calculateMinutesDifference(expectedEnd, hondurasTime))

      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({
          check_out: getHondurasTimeISO(),
          expected_check_out: endTime,
          early_departure_minutes: earlyDepartureMinutes,
          updated_at: getHondurasTimeISO()
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

    // PASO 7: Feedback gamificado - Análisis semanal del mes actual
    console.log('🎮 Generando feedback gamificado...')
    
    // Obtener el primer día del mes actual usando fecha de Honduras
    const firstDayOfMonth = new Date(hondurasTime.getFullYear(), hondurasTime.getMonth(), 1)
    const lastDayOfMonth = new Date(hondurasTime.getFullYear(), hondurasTime.getMonth() + 1, 0)
    
    // Obtener registros del mes actual
    const { data: monthlyRecords, error: monthlyError } = await supabase
      .from('attendance_records')
      .select('id, status, date, created_at')
      .eq('employee_id', employee.id)
      .gte('date', firstDayOfMonth.toISOString().split('T')[0])
      .lte('date', lastDayOfMonth.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (monthlyError) {
      console.error('❌ Error consultando historial mensual de asistencia:', monthlyError)
    }

    let gamification = ''
    if (monthlyRecords && monthlyRecords.length > 0) {
      // Agrupar por semana
      const weeklyStats = new Map()
      
      monthlyRecords.forEach(record => {
        const recordDate = new Date(record.date)
        const weekNumber = Math.ceil((recordDate.getDate() + new Date(recordDate.getFullYear(), recordDate.getMonth(), 1).getDay()) / 7)
        const weekKey = `${recordDate.getFullYear()}-${recordDate.getMonth() + 1}-W${weekNumber}`
        
        if (!weeklyStats.has(weekKey)) {
          weeklyStats.set(weekKey, { late: 0, present: 0, total: 0 })
        }
        
        const weekData = weeklyStats.get(weekKey)
        weekData.total++
        
        if (record.status === 'late') {
          weekData.late++
        } else {
          weekData.present++
        }
      })
      
      // Analizar patrones semanales
      let weeksWithLateArrivals = 0
      let weeksWithGoodAttendance = 0
      
      weeklyStats.forEach((weekData) => {
        if (weekData.late >= 3) {
          weeksWithLateArrivals++
        } else if (weekData.present >= 3) {
          weeksWithGoodAttendance++
        }
      })
      
      // Generar feedback basado en patrones semanales
      if (weeksWithLateArrivals >= 2) {
        gamification = '⚠️ We noticed repeated tardiness this month. Please improve your punctuality.'
      } else if (weeksWithLateArrivals === 1) {
        gamification = '⚠️ You had one week with multiple late arrivals. Please be more punctual.'
      } else if (weeksWithGoodAttendance >= 3) {
        gamification = '🏆 Excellent consistency this month! Keep up the great work!'
      } else if (weeksWithGoodAttendance >= 2) {
        gamification = '👍 Good attendance pattern this month. Keep it up!'
      } else if (weeksWithGoodAttendance >= 1) {
        gamification = '✅ You had a good week. Try to maintain this consistency.'
      }
    }

    // PASO 8: Mensaje final en inglés
    let message = ''
    if (status === 'Temprano') {
      message = '🎉 You\'re an exemplary employee!'
    } else if (status === 'A tiempo') {
      message = '✅ Great! You\'re on time.'
    } else {
      message = '📝 Please be punctual. Let us know what happened.'
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
