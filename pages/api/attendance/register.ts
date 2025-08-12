import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { 
  toHN,
  assertInsideHardWindow,
  overrideIfSaturdayHalfDay,
  decideCheckInRule,
  decideCheckOutRule,
  mapRule,
  distanceMeters,
  getCheckOutWindow,
  isDayOpenForPublic
} from '../../../lib/timezone'
import { CALL_CENTER_CONFIG, CALL_CENTER_MESSAGES, generateContextualMessage } from '../../../lib/call-center-config'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 🔓 REGISTRO PÚBLICO - Sin autenticación requerida
  console.log('🔓 Registro público de asistencia - sin autenticación requerida')

  try {
    const { 
      last5, 
      dni, 
      justification, 
      justification_category,
      lat, 
      lon, 
      device_id,
      source = 'public'
    } = req.body

    logger.info('Attendance registration attempt', {
      hasLast5: !!last5,
      hasDni: !!dni,
      hasJustification: !!justification,
      hasLocation: !!(lat && lon),
      source
    })

    // Validación de parámetros de entrada
    if (!last5 && !dni) {
      logger.warn('Missing parameters for attendance registration')
      return res.status(400).json({ error: 'Debe enviar dni o last5' })
    }

    const supabase = createAdminClient()

    // PASO 1: Verificar existencia de tablas requeridas
    logger.debug('Verifying required tables')
    const requiredTables = ['employees', 'work_schedules', 'attendance_records', 'companies']
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
      logger.error('Error searching for employee', empError)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }

    if (!employees || employees.length === 0) {
      logger.warn('No employee found with provided credentials')
      return res.status(404).json({ error: 'Empleado no encontrado o inactivo' })
    }

    if (employees.length > 1) {
      logger.warn('Multiple employees found with same credentials', { count: employees.length })
      return res.status(400).json({ error: 'Múltiples empleados encontrados. Use DNI completo.' })
    }

    const employee = employees[0]
    console.log('✅ Empleado encontrado:', { id: employee.id, name: employee.name, dni: employee.dni })

    // PASO 3: Obtener horario del empleado
    if (!employee.work_schedule_id) {
      logger.error('Employee has no work schedule assigned', { employeeId: employee.id })
      return res.status(400).json({ error: 'Empleado sin horario asignado. Contacte a RRHH.' })
    }

    const { data: schedule, error: schedError } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('id', employee.work_schedule_id)
      .single()

    if (schedError || !schedule) {
      logger.error('Error fetching work schedule', schedError)
      return res.status(500).json({ error: 'Error al obtener horario de trabajo' })
    }

    console.log('✅ Horario obtenido:', { scheduleId: schedule.id, name: schedule.name })

    // PASO 4: Obtener geofence de la empresa
    const { data: company, error: compError } = await supabase
      .from('companies')
      .select('geofence_center_lat, geofence_center_lon, geofence_radius_m')
      .eq('id', employee.company_id)
      .single()

    if (compError || !company) {
      logger.error('Error fetching company geofence', compError)
      return res.status(500).json({ error: 'Error al obtener configuración de empresa' })
    }

    // PASO 5: Validar geofence (bloquear si falla en público)
    let geofence_ok = true
    if (source === 'public' && lat && lon && company.geofence_center_lat && company.geofence_center_lon && company.geofence_radius_m) {
      const distance = distanceMeters(
        [lat, lon], 
        [company.geofence_center_lat, company.geofence_center_lon]
      )
      geofence_ok = distance <= company.geofence_radius_m

      if (!geofence_ok) {
        logger.warn('Geofence validation failed', {
          employeeId: employee.id,
          distance,
          radius: company.geofence_radius_m,
          source
        })
        
        // En público, bloquear si falla geofence
        return res.status(403).json({ 
          message: 'Fuera de zona autorizada',
          error: 'geofence_failed'
        })
      }
    }

    // PASO 6: Obtener tiempo actual y convertir a Honduras
    const nowUtc = new Date()
    const nowLocal = toHN(nowUtc)
    
    console.log('🕐 Tiempo actual:', { 
      utc: nowUtc.toISOString(), 
      local: nowLocal.time, 
      date: nowLocal.date, 
      dow: nowLocal.dow 
    })

    // PASO 7: Obtener horario esperado para el día actual
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayName = dayNames[nowLocal.dow]
    const expectedIn = schedule[`${todayName}_start`] || schedule.monday_start || '08:00'
    const expectedOut = schedule[`${todayName}_end`] || schedule.monday_end || '17:00'

    // Aplicar override para sábado (medio día 08:00-12:00)
    const adjustedExpectedIn = overrideIfSaturdayHalfDay(expectedIn, schedule, nowLocal)
    const adjustedExpectedOut = nowLocal.dow === 6 ? '12:00' : expectedOut

    console.log('📅 Horario esperado:', { 
      day: todayName, 
      expectedIn: adjustedExpectedIn, 
      expectedOut: adjustedExpectedOut 
    })

    // PASO 8: Validar ventanas duras según política Call Center
    const checkInWindow = { 
      open: schedule.checkin_open || CALL_CENTER_CONFIG.windows.check_in_open, 
      close: schedule.checkin_close || CALL_CENTER_CONFIG.windows.check_in_close 
    }

    // PASO 9: Buscar registro existente para hoy
    const { data: existingRecord, error: recordError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', nowLocal.date)
      .single()

    if (recordError && recordError.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('Error checking existing attendance record', recordError)
      return res.status(500).json({ error: 'Error al verificar registro existente' })
    }

    // PASO 10: LÓGICA ROBUSTA de decisión de acción (Call Center v1)
    let action: 'check_in' | 'check_out'
    let decisionReason: string
    
    // REGLA PRIMARIA: Estado del día (robusto para call center)
    if (existingRecord) {
      if (!existingRecord.check_out) {
        // Ya tiene check_in pero NO check_out ⇒ este evento es check_out
        action = 'check_out'
        decisionReason = 'REGLA_PRIMARIA: Ya tiene entrada, próximo evento es salida'
        console.log('🎯 REGLA PRIMARIA: Ya tiene entrada, este evento es check-out')
      } else {
        // Ya tiene entrada Y salida registradas
        return res.status(400).json({ 
          error: 'Ya tiene entrada y salida registradas para hoy',
          suggestion: 'No se permiten registros adicionales en el mismo día'
        })
      }
    } else {
      // No hay registro para hoy ⇒ determinar por contexto
      action = 'check_in'
      decisionReason = 'REGLA_SECUNDARIA: Sin registro previo, evento es entrada'
      console.log('🎯 REGLA SECUNDARIA: Sin registro previo, evento es entrada')
    }
    
    // Validar que el día esté abierto para registro público
    if (!isDayOpenForPublic(nowLocal)) {
      return res.status(400).json({
        error: CALL_CENTER_MESSAGES.closed_day,
        currentTime: nowLocal.time,
        dayOfWeek: nowLocal.dow,
        decisionReason: decisionReason
      })
    }

              console.log('🎯 Acción detectada:', {
      action,
      currentTime: nowLocal.time,
      hasExistingRecord: !!existingRecord,
      hasCheckOut: !!existingRecord?.check_out,
      existingRecordId: existingRecord?.id || 'N/A',
      employeeId: employee.id,
      decisionReason: decisionReason
    })
    
    // VALIDACIÓN ANTI-DUPLICADOS ROBUSTA
    if (action === 'check_in' && existingRecord && existingRecord.check_in) {
      return res.status(400).json({
        error: 'Registro duplicado detectado',
        message: 'Ya tiene un check-in registrado para hoy',
        suggestion: 'Si necesita corregir su registro, contacte a RR.HH',
        existingRecord: {
          checkInTime: existingRecord.check_in,
          status: existingRecord.status
        }
      })
    }

    // PASO 11: Procesar check-in o check-out con validación robusta
    if (action === 'check_in') {
      // VALIDACIÓN SIMPLIFICADA: Solo bloquear check-in muy tarde
      const currentHour = nowLocal.time.split(':')[0]
      const currentHourNum = parseInt(currentHour)
      
      if (currentHourNum > 11) {
        console.log('⚠️ Intento de check-in fuera de horario, sugiriendo check-out')
        return res.status(400).json({
          error: 'Horario de check-in cerrado',
          currentTime: nowLocal.time,
          suggestion: 'Es hora de check-out, no de check-in. Use su DNI para marcar salida.',
          action: 'check_out'
        })
      }

      // Aplicar reglas de check-in
      const rules = {
        grace: schedule.grace_minutes || 5,
        late_to_inclusive: schedule.late_to_inclusive || 20,
        oor_from: schedule.oor_from_minutes || 21
      }

      const { rule, lateMinutes, msgKey, needJust } = decideCheckInRule(nowLocal, adjustedExpectedIn, rules)

      // Validar justificación si es necesaria
      if (needJust && !justification) {
        const contextualMessage = getContextualMessage('check_in', msgKey, nowLocal.time, nowLocal.dow);
        
        console.log('⚠️ Justificación requerida para check-in:', {
          employeeId: employee.id,
          rule: rule,
          messageKey: msgKey,
          currentTime: nowLocal.time
        });
        
        return res.status(422).json({
          requireJustification: true,
          messageKey: msgKey,
          message: contextualMessage.mainMessage,
          contextualMessage: contextualMessage.contextualMessage,
          helpfulTip: contextualMessage.helpfulTip,
          emoji: contextualMessage.emoji,
          action: 'check_in',
          currentTime: nowLocal.time,
          rule: rule,
          suggestion: 'Envíe la justificación junto con su solicitud'
        });
      }

      // UPSERT attendance_records (corregido para usar campo 'date')
      const { data: record, error: insertError } = await supabase
        .from('attendance_records')
        .upsert({
          employee_id: employee.id,
          date: nowLocal.date, // Corregido: usar 'date' no 'local_date'
          check_in: nowUtc,
          expected_check_in: adjustedExpectedIn,
          status: rule === 'late' || rule === 'oor' ? 'late_in' : 'present',
          rule_applied_in: mapRule(rule),
          late_minutes: lateMinutes,
          tz: 'America/Tegucigalpa',
          tz_offset_minutes: -360,
          justification: justification || null,
          justification_category: justification_category || null
        }, {
          onConflict: 'employee_id,date' // Corregido: usar 'date' no 'local_date'
        })
        .select()
        .single()

      if (insertError) {
        logger.error('Error inserting attendance record', insertError)
        return res.status(500).json({ error: 'Error al registrar asistencia' })
      }

      // Insertar evento de check-in
      const { error: eventError } = await supabase
        .from('attendance_events')
        .insert({
          employee_id: employee.id,
          event_type: 'check_in',
          ts_utc: nowUtc,
          rule_applied: rule,
          justification: justification || null,
          justification_category: justification_category || null,
          source,
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress,
          device_id: device_id || null,
          lat: lat || null,
          lon: lon || null,
          geofence_ok,
          ref_record_id: record.id
        })

      if (eventError) {
        logger.error('Error inserting attendance event', eventError)
        // No fallar si no se puede insertar el evento
      }

      // Aplicar puntos y rachas
      await applyPointsAndStreaks(employee.id, rule, nowLocal, supabase)

      const contextualMessage = getContextualMessage('check_in', msgKey, nowLocal.time, nowLocal.dow);
      
      return res.status(200).json({
        requireJustification: needJust,
        messageKey: msgKey,
        message: contextualMessage.mainMessage,
        contextualMessage: contextualMessage.contextualMessage,
        helpfulTip: contextualMessage.helpfulTip,
        emoji: contextualMessage.emoji,
        action: 'check_in',
        currentTime: nowLocal.time,
        data: record
      })

    } else { // check_out
      // CHECK-OUT SIMPLIFICADO: Solo registro, sin validaciones ni justificaciones
      console.log('📤 Check-out simplificado: Solo registro de salida')
      
      // No validamos ventanas ni reglas complejas para check-out
      // Solo registramos la hora de salida
      
      const rule = 'simple_checkout' // Regla simplificada
      const msgKey = 'check_out_success'
      const needJust = false // No requiere justificación
      
      console.log('📤 Check-out simplificado procesado:', { 
        rule, 
        msgKey,
        needJust: false
      })

      let record: any;

      // CASO 1: Orphan checkout (sin check-in previo) - Simplificado
      if (!existingRecord) {
        console.log('⚠️ Orphan checkout detectado: Creando registro simple');
        
        const { data: newRecord, error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            employee_id: employee.id,
            date: nowLocal.date,
            check_in: null, // Sin check-in previo
            check_out: nowUtc,
            expected_check_in: adjustedExpectedIn,
            expected_check_out: adjustedExpectedOut,
            status: 'simple_checkout', // Estado simplificado
            rule_applied_out: 'simple_checkout',
            tz: 'America/Tegucigalpa',
            tz_offset_minutes: -360
          })
          .select()
          .single();

        if (insertError) {
          logger.error('Error creating orphan checkout record', insertError);
          return res.status(500).json({ 
            error: 'Error al crear registro de salida',
            suggestion: 'Contacte a RR.HH para asistencia'
          });
        }
        
        record = newRecord;
        console.log('✅ Orphan checkout registrado exitosamente');
        
      } else {
        // CASO 2: Actualizar registro existente - Simplificado
        const { data: updatedRecord, error: updateError } = await supabase
          .from('attendance_records')
          .update({
            check_out: nowUtc,
            expected_check_out: adjustedExpectedOut,
            rule_applied_out: 'simple_checkout',
            updated_at: nowUtc
          })
          .eq('id', existingRecord.id)
          .select()
          .single();

        if (updateError) {
          logger.error('Error updating attendance record', updateError);
          return res.status(500).json({ error: 'Error al registrar salida' });
        }
        
        record = updatedRecord;
      }

      // Validar que el record existe antes de continuar
      if (!record || !record.id) {
        logger.error('Record is null or missing ID after check-out processing');
        return res.status(500).json({ error: 'Error interno: Record no válido' });
      }

      // Insertar evento de check-out simplificado
      const { error: eventError } = await supabase
        .from('attendance_events')
        .insert({
          employee_id: employee.id,
          event_type: 'check_out',
          ts_utc: nowUtc,
          rule_applied: 'simple_checkout',
          source,
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress,
          device_id: device_id || null,
          lat: lat || null,
          lon: lon || null,
          geofence_ok,
          ref_record_id: record.id
        });

      if (eventError) {
        logger.error('Error inserting attendance event', eventError);
        // No fallar si no se puede insertar el evento
      }
      
      // Log exitoso del check-out simplificado
      console.log('✅ Check-out simplificado completado:', {
        employeeId: employee.id,
        employeeName: employee.name,
        recordId: record.id,
        timestamp: nowLocal.time
      });
      
      return res.status(200).json({
        requireJustification: false,
        messageKey: 'check_out_success',
        message: '✅ Salida registrada exitosamente',
        action: 'check_out',
        currentTime: nowLocal.time,
        data: record,
        success: true
      });
    }

  } catch (error) {
    logger.error('Unexpected error in attendance registration', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

// Función auxiliar para calcular minutos de salida temprana
function calculateEarlyDepartureMinutes(currentTime: string, expectedTime: string): number {
  const [currentHour, currentMin] = currentTime.split(':').map(Number)
  const [expectedHour, expectedMin] = expectedTime.split(':').map(Number)
  
  const currentMinutes = currentHour * 60 + currentMin
  const expectedMinutes = expectedHour * 60 + expectedMin
  
  return Math.max(0, expectedMinutes - currentMinutes)
}

// Función auxiliar para obtener mensajes contextuales personalizados
function getContextualMessage(
  action: 'check_in' | 'check_out',
  messageKey: string,
  currentTime: string,
  dayOfWeek: number
): {
  mainMessage: string;
  contextualMessage: string;
  helpfulTip: string;
  emoji: string;
} {
  // Mapear messageKey a rule para la función contextual
  const ruleMap: Record<string, string> = {
    'early': 'early',
    'on_time': 'on_time',
    'late': 'late',
    'oor': 'oor',
    'early_out': 'early_out',
    'on_time_out': 'on_time_out',
    'overtime_out': 'overtime',
    'oor_out': 'oor_out'
  };
  
  const rule = ruleMap[messageKey] || messageKey;
  
  return generateContextualMessage(action, rule, currentTime, dayOfWeek);
}

// Función para aplicar puntos y rachas
async function applyPointsAndStreaks(employeeId: string, rule: string, nowLocal: any, supabase: any) {
  try {
    // Obtener puntuación actual del empleado
    const { data: score, error: scoreError } = await supabase
      .from('employee_scores')
      .select('*')
      .eq('employee_id', employeeId)
      .single()

    if (scoreError && scoreError.code !== 'PGRST116') {
      logger.error('Error fetching employee score', scoreError)
      return
    }

    // Calcular puntos según la regla
    let pointsToAdd = 0
    switch (rule) {
      case 'early':
        pointsToAdd = 3
        break
      case 'on_time':
        pointsToAdd = 2
        break
      case 'overtime':
        pointsToAdd = 3
        break
      case 'late':
        pointsToAdd = 0 // Sin puntos por tardanza
        break
      default:
        pointsToAdd = 1 // Punto base
    }

    // Actualizar o crear puntuación
    if (score) {
      const { error: updateError } = await supabase
        .from('employee_scores')
        .update({
          total_points: score.total_points + pointsToAdd,
          weekly_points: score.weekly_points + pointsToAdd,
          monthly_points: score.monthly_points + pointsToAdd,
          early_arrival_count: score.early_arrival_count + (rule === 'early' ? 1 : 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', score.id)

      if (updateError) {
        logger.error('Error updating employee score', updateError)
      }
      } else {
      const { error: insertError } = await supabase
        .from('employee_scores')
        .insert({
          employee_id: employeeId,
          company_id: null, // Se puede obtener del empleado si es necesario
          total_points: pointsToAdd,
          weekly_points: pointsToAdd,
          monthly_points: pointsToAdd,
          early_arrival_count: rule === 'early' ? 1 : 0,
          punctuality_streak: rule === 'late' ? 0 : 1
        })

      if (insertError) {
        logger.error('Error creating employee score', insertError)
      }
    }
  } catch (error) {
    logger.error('Error applying points and streaks', error)
  }
}
