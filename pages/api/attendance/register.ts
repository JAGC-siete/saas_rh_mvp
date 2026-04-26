import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { 
   toHN, overrideIfSaturdayHalfDay, decideCheckInRule, mapRule, distanceMeters, nowInHonduras, getHondurasTimestamp } from '../../../lib/timezone'
import { CALL_CENTER_MESSAGES, generateContextualMessage } from '../../../lib/call-center-config'
import { withAttendancePublicRateLimit } from '../../../lib/security/rate-limiting'
import { getTrustedClientIp } from '../../../lib/security/trusted-client-ip'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 🔓 REGISTRO PÚBLICO - Sin autenticación requerida
  const clientIp = getTrustedClientIp(req)
  const userAgent = (req.headers['user-agent'] || 'unknown').toString().substring(0, 120)

  try {
    const { 
      last5, 
      dni, 
      company_id,  // Nuevo: para desambiguar en multi-cliente
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
      source,
      ip: clientIp
    })

    // Validación de parámetros de entrada
    const last5Str = typeof last5 === 'string' ? last5.trim() : ''
    const dniStr = typeof dni === 'string' ? dni.trim() : ''
    const companyIdStr = typeof company_id === 'string' ? company_id.trim() : ''

    if (!last5Str && !dniStr) {
      logger.warn('Missing parameters for attendance registration')
      return res.status(400).json({ error: 'Debe enviar dni o last5' })
    }

    // Validaciones estrictas para endpoint público (anti-abuso)
    const sourceStr = typeof source === 'string' ? source : 'public'
    const isPublic = sourceStr === 'public'

    if (isPublic) {
      // Si se usa last5 (parcial), exigir company_id para evitar enumeración/multi-tenant leakage
      if (last5Str && !dniStr && !companyIdStr) {
        logger.warn('Attendance public request missing company_id for last5 flow', { ip: clientIp })
        return res.status(400).json({
          error: 'company_id es requerido cuando se usa last5',
          hint: 'Envíe company_id para desambiguar empresa'
        })
      }

      // Exigir geolocalización para controles de geofence en modo público
      if (lat == null || lon == null) {
        logger.warn('Attendance public request missing location', { ip: clientIp })
        return res.status(400).json({ error: 'lat y lon son requeridos para registro público' })
      }
      if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) {
        return res.status(400).json({ error: 'lat y lon deben ser números' })
      }

      // Limitar tamaño de justificación para evitar payload abuse
      if (typeof justification === 'string' && justification.length > 500) {
        return res.status(400).json({ error: 'Justificación demasiado larga (máx 500 caracteres)' })
      }
    }

    const supabase = createAdminClient()

    // PASO 1: Verificar existencia de tablas requeridas
    logger.debug('Verifying required tables')
    const requiredTables = ['employees', 'work_schedules', 'attendance_records', 'companies']
    for (const table of requiredTables) {
      const { error: tableError } = await supabase.from(table as any).select('id').limit(1)
      if (tableError) {
        logger.error('Required table missing or inaccessible', tableError, { table })
        return res.status(500).json({ 
          error: `Error de base de datos: Tabla ${table} no disponible`,
          details: tableError.message 
        })
      }
    }
    logger.debug('All required tables are available')

    // PASO 2: Validar existencia del empleado con soporte multi-cliente
    logger.debug('Searching employee for attendance registration', {
      hasDni: !!dniStr,
      hasLast5: !!last5Str,
      hasCompanyId: !!companyIdStr,
      ip: clientIp
    })
    let employeeQuery = supabase
      .from('employees')
      .select('id, work_schedule_id, dni, name, status, company_id, employee_code, role, departments:department_id(name)')
      .eq('status', 'active')

    if (dniStr) {
      employeeQuery = employeeQuery.eq('dni', dniStr)
    } else {
      // Buscar por last5 (últimos 5 dígitos del DNI)
      employeeQuery = employeeQuery.ilike('dni', `%${last5Str}`)
    }

    const { data: employeesData, error: empError } = await employeeQuery

    if (empError) {
      logger.error('Error searching for employee', empError)
      return res.status(500).json({ error: 'Error interno del servidor' })
    }

    if (!employeesData || employeesData.length === 0) {
      logger.warn('No employee found with provided credentials')
      return res.status(404).json({ error: 'Empleado no encontrado o inactivo' })
    }

    // MEJORA: Manejar múltiples empleados con el mismo last5 digits
    let employees = employeesData
    
    if (employees.length > 1) {
      logger.warn('Multiple employees found with same credentials', { count: employees.length, company_id })
      
      // Si se proporcionó company_id, usar para filtrar
      if (companyIdStr) {
        const filteredEmployees = employees.filter(e => e.company_id === companyIdStr)
        
        if (filteredEmployees.length === 1) {
          logger.info('Using company_id to disambiguate employee match', { company_id: companyIdStr })
          // Continuar con el empleado filtrado reemplazando la lista
          employees = filteredEmployees
        } else if (filteredEmployees.length === 0) {
          return res.status(404).json({ 
            error: 'Empleado no encontrado en la empresa especificada',
            company_id: companyIdStr
          })
        } else {
          // Si aún hay múltiples, continuar con el filtrado
          employees = filteredEmployees
        }
      }
      
      // Si aún hay múltiples, devolver sugerencias para que el usuario seleccione
      if (employees.length > 1) {
        // Obtener información de las empresas para ayudar a identificar
        const companyIds = [...new Set(employees.map(e => e.company_id).filter(Boolean))]
        let companyInfo: Record<string, any> = {}
        
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from('companies')
            .select('id, name, subdomain')
            .in('id', companyIds)
          
          if (companies) {
            companies.forEach(c => {
              companyInfo[c.id] = c
            })
          }
        }

        // Preparar sugerencias con información útil
        const suggestions = employees.map(emp => ({
          employee_id: emp.id,
          dni: emp.dni,
          name: emp.name,
          employee_code: emp.employee_code,
          role: emp.role,
          company_name: companyInfo[emp.company_id]?.name || 'Empresa no identificada',
          department_name: Array.isArray(emp.departments) ? emp.departments[0]?.name || 'Sin departamento' : 'Sin departamento',
          company_id: emp.company_id
        }))

        return res.status(409).json({ 
          error: 'Múltiples empleados encontrados',
          message: `Se encontraron ${employees.length} empleados con los mismos últimos dígitos del DNI`,
          suggestions: suggestions,
          requireCompanySelection: true,
          action: 'select_employee',
          hint: 'Si trabajas en una empresa específica, puedes proporcionar su ID'
        })
      }
    }

    const employee = employees[0]
    logger.info('Employee matched for attendance registration', { 
      id: employee.id, 
      company_id: employee.company_id,
      work_schedule_id: employee.work_schedule_id 
    })

    // P0: No permitir continuar si el empleado no tiene company_id (evitar mezcla de tenants)
    if (!employee.company_id) {
      logger.error('Employee missing company_id; refusing public attendance registration', {
        employeeId: employee.id,
        ip: clientIp
      })
      // Best-effort audit insert (no fallar el request si audit falla)
      try {
        await supabase.from('audit_logs').insert({
          user_id: 'anonymous',
          company_id: null,
          action: 'attendance_register_missing_company_id',
          resource: 'attendance_register',
          resource_id: employee.id,
          details: { source: sourceStr, ip: clientIp, userAgent },
          ip_address: clientIp,
          user_agent: userAgent,
          timestamp: new Date().toISOString(),
          severity: 'critical'
        } as any)
      } catch {}
      return res.status(500).json({
        error: 'Empleado sin empresa asignada. Contacte a RRHH.',
        code: 'EMPLOYEE_COMPANY_MISSING'
      })
    }

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

    logger.debug('Work schedule loaded', { scheduleId: schedule.id })

    // PASO 4: Obtener geofence de la empresa
    const { data: company, error: compError } = await supabase
      .from('companies')
      .select('geofence_center_lat, geofence_center_lon, geofence_radius_m')
      .eq('id', employee.company_id ?? '')
      .single()

    if (compError || !company) {
      logger.error('Error fetching company geofence', compError)
      return res.status(500).json({ error: 'Error al obtener configuración de empresa' })
    }

    // PASO 5: Validar geofence (bloquear si falla en público)
    let geofence_ok = true
    if (isPublic && lat && lon && company.geofence_center_lat && company.geofence_center_lon && company.geofence_radius_m) {
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
    const nowUtc = nowInHonduras()
    const nowLocal = toHN(nowUtc)
    
    logger.debug('Attendance registration time context', { date: nowLocal.date, dow: nowLocal.dow })

    // PASO 7: Obtener horario esperado para el día actual
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayName = dayNames[nowLocal.dow]
    const expectedIn = (schedule as Record<string, any>)[`${todayName}_start`] || (schedule as Record<string, any>).monday_start || '08:00'
    const expectedOut = (schedule as Record<string, any>)[`${todayName}_end`] || (schedule as Record<string, any>).monday_end || '17:00'

    // Aplicar override para sábado (medio día 08:00-12:00)
    const adjustedExpectedIn = overrideIfSaturdayHalfDay(expectedIn, schedule, nowLocal)
    const adjustedExpectedOut = nowLocal.dow === 6 ? '12:00' : expectedOut

    logger.debug('Expected schedule for today resolved', { day: todayName })

    // PASO 8: Validar ventanas duras según política Call Center
    // const checkInWindow = { 
    //   open: schedule.checkin_open || CALL_CENTER_CONFIG.windows.check_in_open, 
    //   close: schedule.checkin_close || CALL_CENTER_CONFIG.windows.check_in_close 
    // }

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

    logger.info('Attendance action decision', {
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
        logger.warn('Check-in attempted too late; suggesting check-out', { employeeId: employee.id, ip: clientIp })
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
        
        logger.warn('Justification required for check-in', {
          employeeId: employee.id,
          rule: rule,
          messageKey: msgKey,
          currentTime: nowLocal.time,
          ip: clientIp
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
          date: nowLocal.date, // Already in YYYY-MM-DD format
          check_in: nowUtc.toISOString(),
          expected_check_in: adjustedExpectedIn,
          status: rule === 'early' ? 'early' : (rule === 'late' || rule === 'oor' ? 'late_in' : 'present'),
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
          ts_utc: nowUtc.toISOString(),
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
      try {
        const { error: rpcError } = await supabase.rpc('apply_attendance_gamification', {
          p_employee_id: employee.id,
          p_company_id: employee.company_id,
          p_rule: rule,
          p_late_minutes: lateMinutes
        })
        if (rpcError) {
          logger.error('Error applying attendance gamification via RPC', rpcError, {
            employeeId: employee.id,
            companyId: employee.company_id
          })
        }
      } catch (e) {
        logger.error('Unexpected error applying attendance gamification RPC', e as any, {
          employeeId: employee.id,
          companyId: employee.company_id
        })
      }

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
      logger.info('Simplified check-out flow', { employeeId: employee.id })
      
      // No validamos ventanas ni reglas complejas para check-out
      // Solo registramos la hora de salida
      
      const rule = 'simple_checkout' // Regla simplificada
      const msgKey = 'check_out_success'
      // const needJust = false // No requiere justificación
      
      console.log('📤 Check-out simplificado procesado:', { 
        rule, 
        msgKey
        // needJust: false
      })

      let record: any;

      // CASO 1: Orphan checkout (sin check-in previo) - Simplificado
      if (!existingRecord) {
        logger.warn('Orphan checkout detected; creating minimal record', { employeeId: employee.id });
        
        const { data: newRecord, error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            employee_id: employee.id,
            date: nowLocal.date,
            check_in: null, // Sin check-in previo
            check_out: nowUtc.toISOString(),
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
        logger.info('Orphan checkout recorded', { employeeId: employee.id });
        
      } else {
        // CASO 2: Actualizar registro existente - Simplificado
        const { data: updatedRecord, error: updateError } = await supabase
          .from('attendance_records')
          .update({
            check_out: nowUtc.toISOString(),
            expected_check_out: adjustedExpectedOut,
            rule_applied_out: 'simple_checkout',
            updated_at: nowUtc.toISOString()
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
          ts_utc: nowUtc.toISOString(),
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
      logger.info('Simplified check-out completed', {
        employeeId: employee.id,
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

// Función auxiliar para calcular minutos de salida temprana (no utilizada)
// function calculateEarlyDepartureMinutes(currentTime: string, expectedTime: string): number {
//   const [currentHour, currentMin] = currentTime.split(':').map(Number)
//   const [expectedHour, expectedMin] = expectedTime.split(':').map(Number)
//   
//   const currentMinutes = currentHour * 60 + currentMin
//   const expectedMinutes = expectedHour * 60 + expectedMin
//   
//   return Math.max(0, expectedMinutes - currentMinutes)
// }

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

export default withAttendancePublicRateLimit(['POST'])(handler)
