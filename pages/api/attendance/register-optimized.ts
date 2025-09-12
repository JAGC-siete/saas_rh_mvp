import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { TimeService } from '../../../lib/services/TimeService'
import { CALL_CENTER_MESSAGES, generateContextualMessage } from '../../../lib/call-center-config'

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

    // PASO 1: Buscar empleado
    let employee
    if (last5) {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .ilike('dni', `%${last5}`)
        .single()
      
      if (error || !data) {
        return res.status(404).json({ error: 'Employee not found' })
      }
      employee = data
    } else if (dni) {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('dni', dni)
        .single()
      
      if (error || !data) {
        return res.status(404).json({ error: 'Employee not found' })
      }
      employee = data
    }

    // PASO 2: Obtener horario de trabajo
    const { data: schedule, error: schedError } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('id', employee.work_schedule_id)
      .single()

    if (schedError || !schedule) {
      logger.error('Error fetching work schedule', schedError)
      return res.status(500).json({ error: 'Error al obtener horario de trabajo' })
    }

    // PASO 3: Obtener tiempo actual usando TimeService
    const currentTime = TimeService.getCurrentHondurasTime()
    const workTimeValidation = TimeService.validateWorkTime(currentTime, schedule)

    logger.info('Time validation', {
      isWorkDay: workTimeValidation.isWorkDay,
      isWithinWorkHours: workTimeValidation.isWithinWorkHours,
      isCheckInTime: workTimeValidation.isCheckInTime,
      isCheckOutTime: workTimeValidation.isCheckOutTime,
      lateMinutes: workTimeValidation.lateMinutes,
      earlyMinutes: workTimeValidation.earlyMinutes
    })

    // PASO 4: Validar geofence (si aplica)
    if (source === 'public' && lat && lon) {
      const { data: company } = await supabase
        .from('companies')
        .select('geofence_center_lat, geofence_center_lon, geofence_radius_m')
        .eq('id', employee.company_id)
        .single()

      if (company?.geofence_center_lat && company?.geofence_center_lon && company?.geofence_radius_m) {
        // Implementar validación de geofence aquí si es necesario
        // Por ahora, solo logueamos
        logger.info('Geofence validation', {
          employeeId: employee.id,
          lat,
          lon,
          geofence: company
        })
      }
    }

    // PASO 5: Buscar registro existente para hoy
    const { data: existingRecord, error: recordError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', currentTime.date)
      .single()

    if (recordError && recordError.code !== 'PGRST116') {
      logger.error('Error checking existing attendance record', recordError)
      return res.status(500).json({ error: 'Error al verificar registro existente' })
    }

    // PASO 6: Determinar acción basada en estado actual
    let action = 'unknown'
    let message = ''
    let requireJustification = false

    if (!existingRecord) {
      // Check-in
      action = 'check_in'
      
      if (!workTimeValidation.isWorkDay) {
        return res.status(400).json({ 
          message: CALL_CENTER_MESSAGES.closed_day,
          action: 'closed_day'
        })
      }

      if (!workTimeValidation.isCheckInTime) {
        return res.status(400).json({ 
          message: CALL_CENTER_MESSAGES.closed_window,
          action: 'closed_window'
        })
      }

      if (workTimeValidation.lateMinutes > 5) {
        requireJustification = true
        message = CALL_CENTER_MESSAGES.late_in
      } else if (workTimeValidation.lateMinutes > 20) {
        requireJustification = true
        message = CALL_CENTER_MESSAGES.oor_in
      } else {
        message = workTimeValidation.lateMinutes <= 5 
          ? CALL_CENTER_MESSAGES.on_time_in 
          : CALL_CENTER_MESSAGES.ejemplar_in
      }

      if (requireJustification && !justification) {
        return res.status(422).json({
          requireJustification: true,
          message,
          lateMinutes: workTimeValidation.lateMinutes
        })
      }

      // Insertar check-in
      const { data: newRecord, error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: employee.id,
          date: currentTime.date,
          check_in: currentTime.timestamp,
          expected_check_in: workTimeValidation.expectedCheckIn,
          late_minutes: workTimeValidation.lateMinutes,
          justification: justification || null,
          status: workTimeValidation.lateMinutes > 5 ? 'late' : 'present'
        })
        .select()
        .single()

      if (insertError) {
        logger.error('Error inserting attendance record', insertError)
        return res.status(500).json({ error: 'Error al registrar asistencia' })
      }

    } else if (!existingRecord.check_out) {
      // Check-out
      action = 'check_out'
      
      if (workTimeValidation.earlyMinutes > 0) {
        requireJustification = true
        message = CALL_CENTER_MESSAGES.early_out
      } else if (workTimeValidation.lateMinutes > 120) { // 2 horas extra
        requireJustification = true
        message = CALL_CENTER_MESSAGES.overtime_out
      } else {
        message = CALL_CENTER_MESSAGES.on_time_out
      }

      if (requireJustification && !justification) {
        return res.status(422).json({
          requireJustification: true,
          message,
          earlyMinutes: workTimeValidation.earlyMinutes
        })
      }

      // Actualizar check-out
      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({
          check_out: currentTime.timestamp,
          expected_check_out: workTimeValidation.expectedCheckOut,
          early_departure_minutes: workTimeValidation.earlyMinutes,
          justification: justification || existingRecord.justification,
          status: workTimeValidation.earlyMinutes > 0 ? 'partial' : 'present'
        })
        .eq('id', existingRecord.id)

      if (updateError) {
        logger.error('Error updating attendance record', updateError)
        return res.status(500).json({ error: 'Error al actualizar asistencia' })
      }

    } else {
      // Ya tiene check-in y check-out
      return res.status(400).json({ 
        message: CALL_CENTER_MESSAGES.duplicate_record,
        action: 'duplicate'
      })
    }

    // PASO 7: Generar mensaje contextual
    const contextualMessage = generateContextualMessage(
      action as 'check_in' | 'check_out',
      workTimeValidation.lateMinutes > 5 ? 'late' : 'on_time',
      currentTime.time,
      currentTime.dow,
      requireJustification
    )

    logger.info('Attendance registered successfully', {
      employeeId: employee.id,
      action,
      lateMinutes: workTimeValidation.lateMinutes,
      earlyMinutes: workTimeValidation.earlyMinutes,
      requireJustification
    })

    return res.status(200).json({
      message: contextualMessage.mainMessage,
      action,
      timeDetection: currentTime.time,
      lateMinutes: workTimeValidation.lateMinutes,
      earlyMinutes: workTimeValidation.earlyMinutes,
      contextualMessage: contextualMessage.contextualMessage,
      helpfulTip: contextualMessage.helpfulTip
    })

  } catch (error) {
    logger.error('Attendance registration error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
