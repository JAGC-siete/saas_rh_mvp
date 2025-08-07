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

// Smart time detection function
function detectIntendedAction(currentTime: Date, existingRecord: any): 'check_in' | 'check_out' | 'ambiguous' {
  const hour = currentTime.getHours()
  const minute = currentTime.getMinutes()
  const totalMinutes = hour * 60 + minute
  
  // Time ranges in minutes from midnight
  const earlyMorningStart = 1 * 60      // 1:00 AM
  const morningEnd = 11 * 60           // 11:00 AM  
  const afternoonStart = 16 * 60       // 4:00 PM
  const lateNightEnd = 23 * 60 + 59    // 11:59 PM
  
  // If no existing record, time determines action
  if (!existingRecord) {
    if ((totalMinutes >= earlyMorningStart && totalMinutes <= morningEnd)) {
      return 'check_in'
    } else if (totalMinutes >= afternoonStart && totalMinutes <= lateNightEnd) {
      // Late evening could be check-in for night shifts, check-out for day shifts
      return 'ambiguous'
    } else {
      // 11 AM - 4 PM: unusual time, could be late check-in or early check-out
      return 'ambiguous'
    }
  }
  
  // If has check-in but no check-out
  if (existingRecord && !existingRecord.check_out) {
    if (totalMinutes >= afternoonStart && totalMinutes <= lateNightEnd) {
      return 'check_out'
    } else if (totalMinutes >= earlyMorningStart && totalMinutes <= morningEnd) {
      // Morning time with existing check-in - unusual, might be duplicate
      return 'ambiguous'
    } else {
      // Midday: could be early check-out
      return 'check_out'
    }
  }
  
  return 'ambiguous'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 🔒 AUTENTICACIÓN OPCIONAL - Permitir registro público por DNI
  let authenticatedUser = null
  let userProfile = null
  
  try {
    const supabase = createClient(req, res)
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user) {
      // Si hay sesión, verificar permisos
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, permissions, company_id')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        authenticatedUser = session.user
        userProfile = profile
        console.log('🔐 Usuario autenticado:', { 
          userId: session.user.id, 
          role: profile.role,
          companyId: profile.company_id 
        })
      }
    } else {
      console.log('🌐 Registro público - sin autenticación')
    }
  } catch (authError) {
    console.log('⚠️ Error de autenticación (continuando como público):', authError)
    // Continuar sin autenticación para registro público
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
      .select('id, work_schedule_id, dni, name, status, role, company_id')
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
    console.log('✅ Empleado encontrado:', { id: employee.id, name: employee.name, role: employee.role })

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

    // PASO 6.1: Smart Time Detection - Detect intended action based on time of day
    const intendedAction = detectIntendedAction(hondurasTime, existingRecord)
    console.log('🧠 Smart Detection:', {
      hora: hondurasTime.toLocaleTimeString(),
      accionDetectada: intendedAction,
      tieneRegistroExistente: !!existingRecord,
      tieneSalida: !!existingRecord?.check_out
    })

    // Handle ambiguous cases with intelligent defaults
    let finalAction: 'check_in' | 'check_out' = 'check_in'
    
    if (intendedAction === 'ambiguous') {
      // Use existing business logic for ambiguous cases
      if (!existingRecord) {
        finalAction = 'check_in'
        console.log('🤔 Tiempo ambiguo - defaulting to check-in (no record exists)')
      } else if (!existingRecord.check_out) {
        finalAction = 'check_out'
        console.log('🤔 Tiempo ambiguo - defaulting to check-out (has check-in)')
      }
    } else {
      finalAction = intendedAction
    }

    // Handle conflicts between smart detection and existing records
    if (finalAction === 'check_in' && existingRecord && !existingRecord.check_out) {
      console.log('⚠️ Conflicto detectado: Usuario quiere check-in pero ya tiene entrada')
      return res.status(400).json({
        error: 'Ya tienes entrada registrada hoy',
        message: 'Parece que quieres marcar entrada, pero ya tienes una entrada registrada hoy. ¿Quizás quieres marcar salida?',
        suggestion: 'Si quieres marcar salida, inténtalo después de las 4:00 PM'
      })
    }

    if (finalAction === 'check_out' && !existingRecord) {
      console.log('⚠️ Conflicto detectado: Usuario quiere check-out pero no tiene entrada')
      return res.status(400).json({
        error: 'No tienes entrada registrada hoy',
        message: 'Parece que quieres marcar salida, pero no tienes entrada registrada hoy. Debes marcar entrada primero.',
        suggestion: 'Marca tu entrada primero entre las 7:00 AM y 11:00 AM'
      })
    }

    console.log('✅ Acción final determinada:', finalAction)

    if (finalAction === 'check_in') {
      // CHECK-IN: Registrar entrada
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

    } else if (finalAction === 'check_out') {
      // CHECK-OUT: Registrar salida (smart detection)
      console.log('📝 Registrando salida...')
      const expectedEnd = parseExpectedTime(endTime, hondurasTime)
      const earlyDepartureMinutes = Math.max(0, calculateMinutesDifference(expectedEnd, hondurasTime))

      const { data: updateData, error: updateError } = await supabase
        .from('attendance_records')
        .update({
          check_out: getHondurasTimeISO(),
          expected_check_out: endTime,
          early_departure_minutes: earlyDepartureMinutes,
          updated_at: getHondurasTimeISO()
        })
        .eq('id', existingRecord.id)
        .select()
        .single()

      if (!updateData) {
        console.error('❌ No se pudo actualizar el registro:', { existingRecord })
        return res.status(500).json({ 
          error: 'Error registrando salida',
          message: 'No se pudo actualizar el registro de asistencia'
        })
      }

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
      
      // Generar feedback basado en patrones semanales y tipo de acción
      if (weeksWithLateArrivals >= 2) {
        gamification = '⚠️ Hemos notado tardanzas recurrentes este mes. Por favor mejora tu puntualidad.'
      } else if (weeksWithLateArrivals === 1) {
        gamification = '⚠️ Tuviste una semana con múltiples llegadas tarde. Sé más puntual.'
      } else if (weeksWithGoodAttendance >= 3) {
        gamification = '🏆 ¡Excelente consistencia este mes! ¡Sigue así!'
      } else if (weeksWithGoodAttendance >= 2) {
        gamification = '👍 Buen patrón de asistencia este mes. ¡Continúa!'
      } else if (weeksWithGoodAttendance >= 1) {
        gamification = '✅ Tuviste una buena semana. Trata de mantener esta consistencia.'
      }
    }

    // PASO 8: Mensaje personalizado basado en acción y estado
    let message = ''
    let actionMessage = ''
    
    // Mensajes específicos por tipo de acción
    if (finalAction === 'check_in') {
      if (status === 'Temprano') {
        actionMessage = '� ¡Entrada registrada! Llegaste temprano, eres ejemplar.'
      } else if (status === 'A tiempo') {
        actionMessage = '✅ ¡Entrada registrada! Llegaste puntual.'
      } else {
        actionMessage = '📝 Entrada registrada, pero llegaste tarde. Justifica tu demora.'
      }
    } else if (finalAction === 'check_out') {
      const hour = hondurasTime.getHours()
      if (hour >= 17) { // 5 PM or later
        actionMessage = '🏠 ¡Salida registrada! Que tengas una buena tarde.'
      } else if (hour >= 12) { // Noon to 5 PM
        actionMessage = '🕐 Salida registrada a mediodía. Que tengas un buen resto del día.'
      } else {
        actionMessage = '🌅 Salida temprana registrada.'
      }
    }

    // Combinar mensaje de acción con gamificación
    message = actionMessage
    if (gamification) {
      message += `\n\n${gamification}`
    }

    // Agregar consejos inteligentes basados en hora y patrón
    const hour = hondurasTime.getHours()
    let smartTip = ''
    
    if (finalAction === 'check_in' && hour >= 10) {
      smartTip = '\n💡 Consejo: Intenta llegar antes de las 9:00 AM para mejores resultados.'
    } else if (finalAction === 'check_in' && hour <= 7) {
      smartTip = '\n⭐ ¡Excelente! Llegaste muy temprano, eso demuestra dedicación.'
    } else if (finalAction === 'check_out' && hour <= 16) {
      smartTip = '\n⏰ Salida temprana detectada. Asegúrate de completar tus horas.'
    }
    
    if (smartTip) {
      message += smartTip
    }

    console.log('✅ Registro de asistencia completado:', { 
      message, 
      status, 
      gamification, 
      finalAction,
      intendedAction 
    })

    return res.status(200).json({ 
      message, 
      status, 
      gamification,
      action: finalAction,
      timeDetection: intendedAction,
      employee: {
        name: employee.name,
        role: employee.role
      },
      timestamp: getHondurasTimeISO(),
      workSchedule: {
        expectedStart: startTime,
        expectedEnd: endTime,
        dayOfWeek: dayOfWeek
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
