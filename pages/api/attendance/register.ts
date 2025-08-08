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
  
  // Si ya tiene entrada y salida para hoy, no permitir más registros
  if (existingRecord?.check_in && existingRecord?.check_out) {
    return 'ambiguous'
  }
  
  // Si tiene entrada pero no salida - puede ser check-out
  if (existingRecord?.check_in && !existingRecord?.check_out) {
    // Después de las 3 PM, definitivamente es salida
    if (hour >= 15) {
      return 'check_out'
    }
    // Antes de las 3 PM con entrada ya registrada es inusual
    return 'ambiguous'
  }
  
  // Si no tiene registro para hoy - puede ser check-in
  if (!existingRecord) {
    // Cualquier hora puede ser entrada (turnos diferentes)
    return 'check_in'
  }
  
  return 'ambiguous'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 🔓 REGISTRO PÚBLICO - Sin autenticación requerida
  console.log('🔓 Registro público de asistencia - sin autenticación requerida')

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
      .select('id, work_schedule_id, dni, name, status, company_id')
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
    console.log('✅ Empleado encontrado:', { id: employee.id, name: employee.name })

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

    // Determinar acción basada en hora y registros existentes
    let finalAction = intendedAction

    // Si ya tiene entrada y salida, no permitir más registros
    if (existingRecord?.check_in && existingRecord?.check_out) {
      console.log('⚠️ Ya tiene entrada y salida registradas hoy')
      return res.status(400).json({
        error: 'Ya completaste tu jornada',
        message: 'Ya tienes registrada tu entrada y salida para hoy.',
        suggestion: 'Si necesitas hacer una corrección, contacta a RRHH.'
      })
    }

    // Si tiene entrada pero no salida
    if (existingRecord?.check_in && !existingRecord?.check_out) {
      // Después de las 3 PM, definitivamente es salida
      if (hondurasTime.getHours() >= 15) {
        finalAction = 'check_out'
        console.log('🕒 Después de las 3 PM con entrada registrada - marcando salida')
      } else {
        // Antes de las 3 PM con entrada ya registrada
        console.log('⚠️ Ya tiene entrada registrada hoy')
        return res.status(400).json({
          error: 'Ya tienes entrada registrada',
          message: 'Ya marcaste tu entrada hoy. Marca tu salida después de las 3:00 PM.',
          suggestion: 'Tu horario de salida es a las 5:00 PM'
        })
      }
    }

    // Si no tiene registro para hoy
    if (!existingRecord) {
      // En la mañana (6 AM - 11 AM) es entrada normal
      if (hondurasTime.getHours() >= 6 && hondurasTime.getHours() <= 11) {
        finalAction = 'check_in'
        console.log('🌅 Entrada normal en horario matutino')
      }
      // Muy temprano (5-6 AM) es entrada temprana
      else if (hondurasTime.getHours() >= 5 && hondurasTime.getHours() < 6) {
        finalAction = 'check_in'
        console.log('⭐ Entrada temprana antes de las 6 AM')
      }
      // Después de las 3 PM es entrada tarde
      else if (hondurasTime.getHours() >= 15) {
        finalAction = 'check_in'
        console.log('🌆 Entrada tarde después de las 3 PM')
      }
      // Entre 11 AM y 3 PM es entrada tarde
      else if (hondurasTime.getHours() > 11 && hondurasTime.getHours() < 15) {
        finalAction = 'check_in'
        console.log('⏰ Entrada tarde entre 11 AM y 3 PM')
      }
    }

    // Validar conflictos finales
    if (finalAction === 'check_in' && existingRecord?.check_in) {
      console.log('⚠️ Conflicto: Ya tiene entrada registrada')
      return res.status(400).json({
        error: 'Ya tienes entrada registrada',
        message: 'Ya marcaste tu entrada hoy. Marca tu salida después de las 3:00 PM.',
        suggestion: 'Tu horario de salida es a las 5:00 PM'
      })
    }

    if (finalAction === 'check_out' && !existingRecord?.check_in) {
      console.log('⚠️ Conflicto: Intenta marcar salida sin entrada')
      return res.status(400).json({
        error: 'No tienes entrada registrada',
        message: 'No puedes marcar salida sin haber marcado entrada primero.',
        suggestion: 'Marca tu entrada entre las 6:00 AM y 11:00 AM'
      })
    }

    console.log('✅ Acción final determinada:', finalAction)

    if (finalAction === 'check_in') {
      // CHECK-IN: Registrar entrada con nueva lógica de validación
      console.log('📝 Registrando entrada...')
      
      // Calcular diferencia en minutos (positivo = tarde, negativo = temprano)
      const lateMinutes = Math.max(0, diffMinutes)
      const earlyMinutes = Math.max(0, -diffMinutes)
      
      // 🕵️ NUEVA LÓGICA DE VALIDACIÓN PARA CHECK-IN
      let checkInStatus = 'normal'
      let checkInMessage = ''
      let requiresJustification = false
      let requiresAuthorization = false
      
      if (earlyMinutes >= 120 && earlyMinutes <= 300) {
        // ⏳ Entrada temprana (⭐): Desde 2 horas antes hasta 5 minutos antes (120-300 min)
        checkInStatus = 'early'
        checkInMessage = 'Entrada temprana ⭐'
        } else if ((earlyMinutes >= 5 && earlyMinutes < 120) || (lateMinutes >= 0 && lateMinutes <= 5)) {
    // 🌅 Entrada normal: Desde 5 minutos antes hasta 5 minutos después
        checkInStatus = 'normal'
        checkInMessage = 'Entrada registrada normalmente 🌅'
      } else if (lateMinutes >= 6 && lateMinutes <= 20) {
        // ⏰ Entrada tarde (requiere justificación): 6-20 minutos tarde
        checkInStatus = 'late'
        checkInMessage = 'Entrada tardía ⏰, por favor justifica tu demora'
        requiresJustification = true
      } else if (lateMinutes >= 21 && lateMinutes <= 240) {
        // 🚫 Muy tarde (requiere autorización): 21 minutos hasta 4 horas tarde
        checkInStatus = 'very_late'
        checkInMessage = 'Estás fuera de tu horario. Tu registro requiere autorización especial. Pasa a gerencia para aclarar el asunto'
        requiresAuthorization = true
      } else {
        // Caso extremo: más de 4 horas tarde
        checkInStatus = 'extreme_late'
        checkInMessage = 'Registro fuera del horario laboral. Contacta a RRHH inmediatamente.'
        requiresAuthorization = true
      }
      
      // Validar justificación si es requerida
      if (requiresJustification && !justification) {
        console.log('⚠️ Llegada tarde sin justificación')
        return res.status(422).json({
          requireJustification: true,
          message: checkInMessage,
          lateMinutes,
          expectedTime: startTime,
          actualTime: hondurasTime.toLocaleTimeString(),
          status: checkInStatus
        })
      }
      
      // Validar autorización si es requerida
      if (requiresAuthorization) {
        console.log('🚫 Llegada muy tarde - requiere autorización')
        return res.status(403).json({
          requireAuthorization: true,
          message: checkInMessage,
          lateMinutes,
          expectedTime: startTime,
          actualTime: hondurasTime.toLocaleTimeString(),
          status: checkInStatus
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
          early_departure_minutes: earlyMinutes,
          justification: justification || null,
          status: checkInStatus
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
      // CHECK-OUT: Registrar salida con nueva lógica de validación
      console.log('📝 Registrando salida...')
      const expectedEnd = parseExpectedTime(endTime, hondurasTime)
      const earlyDepartureMinutes = Math.max(0, calculateMinutesDifference(expectedEnd, hondurasTime))
      
      // 🕵️ NUEVA LÓGICA DE VALIDACIÓN PARA CHECK-OUT
      let checkOutStatus = 'normal'
      let checkOutMessage = ''
      let requiresJustification = false
      
      // Verificar si es después de las 3:00 PM para salida temprana
      const currentHour = hondurasTime.getHours()
      const isAfter3PM = currentHour >= 15
      
      if (earlyDepartureMinutes >= 1 && isAfter3PM) {
        // ⏰ Salida temprana (requiere justificación): Desde 3:00 PM hasta 1 minuto antes
        checkOutStatus = 'early'
        checkOutMessage = 'Salida anticipada ⏰, por favor justifica tu salida'
        requiresJustification = true
      } else {
        // 🙌 Salida normal o puntual: Desde la hora exacta de salida en adelante
        checkOutStatus = 'normal'
        checkOutMessage = 'Gracias por tu trabajo hoy, te esperamos mañana temprano'
      }
      
      // Validar justificación si es requerida
      if (requiresJustification && !justification) {
        console.log('⚠️ Salida temprana sin justificación')
        return res.status(422).json({
          requireJustification: true,
          message: checkOutMessage,
          earlyDepartureMinutes,
          expectedTime: endTime,
          actualTime: hondurasTime.toLocaleTimeString(),
          status: checkOutStatus
        })
      }

      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({
          check_out: getHondurasTimeISO(),
          expected_check_out: endTime,
          early_departure_minutes: earlyDepartureMinutes,
          justification: justification || null,
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
      action: finalAction,
      timeDetection: intendedAction,
      employee: {
        name: employee.name
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
