import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import {
  toHN,
  overrideIfSaturdayHalfDay,
  decideCheckInRule,
  mapRule,
  distanceMeters,
  nowInHonduras,
} from '../../../../lib/timezone'
import { generateContextualMessage } from '../../../../lib/call-center-config'
import { withAttendanceFieldRateLimit } from '../../../../lib/security/rate-limiting'
import { getTrustedClientIp } from '../../../../lib/security/trusted-client-ip'
import { loadEffectiveWorkSchedule } from '../../../../lib/attendance/load-effective-schedule'
import { lookupFieldEmployee } from '../../../../lib/attendance/field-employee-lookup'
import {
  resolveFieldAttendancePolicy,
  validateFieldGeolocation,
  type FieldEventFlags,
} from '../../../../lib/attendance/field-policy'
import { verifyAssertion } from '../../../../lib/attendance/field-webauthn'
import {
  buildFieldRecordFlags,
  decideFieldPunchAction,
} from '../../../../lib/attendance/field-punch-action'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import crypto from 'crypto'

const FIELD_SOURCE = 'field_mobile'
const FIELD_TZ = 'America/Tegucigalpa'
const FIELD_TZ_OFFSET = -360

function buildEventUid(params: {
  employeeId: string
  localDate: string
  action: 'check_in' | 'check_out'
  nonce: string
}): string {
  return `field:${params.employeeId}:${params.localDate}:${params.action}:${params.nonce}`
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const clientIp = getTrustedClientIp(req)
  const userAgent = (req.headers['user-agent'] || 'unknown').toString().substring(0, 120)

  try {
    const {
      dni,
      last5,
      company_id,
      justification,
      justification_category,
      lat,
      lon,
      accuracy_m,
      geo_ts,
      device_id,
      assertion,
    } = req.body || {}

    const lookup = await lookupFieldEmployee({
      dni,
      last5,
      companyId: company_id,
    })

    if (!lookup.ok) {
      return res.status(lookup.status).json(lookup.body)
    }

    const employee = lookup.employee
    const supabase = createAdminClient()

    const { data: company, error: compError } = await supabase
      .from('companies')
      .select('geofence_center_lat, geofence_center_lon, geofence_radius_m, settings')
      .eq('id', employee.company_id)
      .single()

    if (compError || !company) {
      logger.error('Error fetching company for field punch', compError)
      return res.status(500).json({ error: 'Error al obtener configuración de empresa', code: 'COMPANY_ERROR' })
    }

    const policy = resolveFieldAttendancePolicy(company.settings)

    const geo = validateFieldGeolocation(
      { lat, lon, accuracy_m, geo_ts },
      policy
    )

    if (!geo.ok) {
      logger.warn('Field punch geo validation failed', {
        employeeId: employee.id,
        code: geo.code,
        ip: clientIp,
      })
      return res.status(400).json({
        error: geo.message,
        code: geo.code,
      })
    }

    let webauthnVerified = false
    let credentialIdPrefix: string | null = null

    if (policy.require_webauthn) {
      if (!assertion || typeof assertion !== 'object') {
        return res.status(400).json({
          error: 'Se requiere verificación biométrica del dispositivo',
          code: 'WEBAUTHN_REQUIRED',
        })
      }

      const authResult = await verifyAssertion({
        req,
        employeeId: employee.id,
        response: assertion as AuthenticationResponseJSON,
      })

      if (!authResult.ok) {
        return res.status(401).json({
          error: authResult.message,
          code: authResult.code,
        })
      }

      webauthnVerified = true
      credentialIdPrefix = authResult.credentialIdPrefix
    }

    let geofence_ok = true
    let distance: number | null = null
    const hasGeofence =
      company.geofence_center_lat != null &&
      company.geofence_center_lon != null &&
      company.geofence_radius_m != null

    if (hasGeofence) {
      distance = distanceMeters(
        [geo.lat, geo.lon],
        [company.geofence_center_lat!, company.geofence_center_lon!]
      )
      geofence_ok = distance <= company.geofence_radius_m!

      if (!geofence_ok && policy.enforce_geofence) {
        logger.warn('Field punch geofence blocked', {
          employeeId: employee.id,
          distance,
          radius: company.geofence_radius_m,
        })
        return res.status(403).json({
          message: 'Fuera de zona autorizada',
          error: 'Fuera de zona autorizada',
          code: 'GEOFENCE_FAILED',
          distance_m: Math.round(distance),
          radius_m: company.geofence_radius_m,
        })
      }
    }

    const nowUtc = nowInHonduras()
    const nowLocal = toHN(nowUtc)

    const loaded = await loadEffectiveWorkSchedule({
      supabase,
      companyId: employee.company_id,
      employeeId: employee.id,
      date: nowLocal.date,
      fallbackWorkScheduleId: employee.work_schedule_id,
    })

    if (!loaded.result.found || !loaded.schedule) {
      return res.status(400).json({
        error: 'Empleado sin horario asignado para hoy. Contacte a RRHH.',
        code: 'NO_SCHEDULE',
      })
    }

    const schedule = loaded.schedule
    const dayTimes = loaded.times
    if (dayTimes.type === 'off') {
      return res.status(422).json({
        error: 'Día libre según horario asignado',
        code: 'SCHEDULE_DAY_OFF',
      })
    }

    const expectedIn = dayTimes.start || '08:00'
    const expectedOut = dayTimes.end || '17:00'
    const adjustedExpectedIn = overrideIfSaturdayHalfDay(expectedIn, schedule, nowLocal)
    const adjustedExpectedOut = nowLocal.dow === 6 ? '12:00' : expectedOut

    const { data: existingRecord, error: recordError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('date', nowLocal.date)
      .single()

    if (recordError && recordError.code !== 'PGRST116') {
      logger.error('Error checking existing attendance record', recordError)
      return res.status(500).json({ error: 'Error al verificar registro existente' })
    }

    const actionDecision = decideFieldPunchAction(existingRecord)
    if (actionDecision === 'day_complete') {
      return res.status(400).json({
        error: 'Ya tiene entrada y salida registradas para hoy',
        code: 'DAY_COMPLETE',
      })
    }
    const action = actionDecision

    const eventFlags: FieldEventFlags = {
      channel: 'field_mobile',
      accuracy_m: geo.accuracy_m,
      geo_ts: geo.geo_ts,
      geo_age_ms: geo.age_ms,
      webauthn_verified: webauthnVerified,
      webauthn_credential_id_prefix: credentialIdPrefix,
      device_binding: 'platform',
      biometric_template_stored: false,
    }

    const deviceId =
      typeof device_id === 'string' && device_id.trim()
        ? device_id.trim().slice(0, 120)
        : `field:${credentialIdPrefix || 'unknown'}`

    const eventNonce = crypto.randomBytes(8).toString('hex')
    const eventUid = buildEventUid({
      employeeId: employee.id,
      localDate: nowLocal.date,
      action,
      nonce: eventNonce,
    })

    const recordFlags = buildFieldRecordFlags(
      (existingRecord?.flags as Record<string, unknown>) || undefined
    )

    if (action === 'check_in') {
      // No call-center 11:00 window — field staff use effective schedule + late rules only.
      const rules = {
        grace: schedule.grace_minutes || 5,
        late_to_inclusive: schedule.late_to_inclusive || 20,
        oor_from: schedule.oor_from_minutes || 21,
      }

      const { rule, lateMinutes, msgKey, needJust } = decideCheckInRule(
        nowLocal,
        adjustedExpectedIn,
        rules
      )

      if (needJust && !justification) {
        const contextualMessage = getContextualMessage('check_in', msgKey, nowLocal.time, nowLocal.dow)
        return res.status(422).json({
          requireJustification: true,
          messageKey: msgKey,
          message: contextualMessage.mainMessage,
          contextualMessage: contextualMessage.contextualMessage,
          helpfulTip: contextualMessage.helpfulTip,
          emoji: contextualMessage.emoji,
          action: 'check_in',
          currentTime: nowLocal.time,
          rule,
          code: 'JUSTIFICATION_REQUIRED',
        })
      }

      const status =
        rule === 'early' ? 'early' : rule === 'late' || rule === 'oor' ? 'late_in' : 'present'

      let record: { id: string } | null = null

      if (existingRecord?.id) {
        // Overwrite daily-close absent shell without losing field protection flags
        const { data: updated, error: updateError } = await supabase
          .from('attendance_records')
          .update({
            check_in: nowUtc.toISOString(),
            expected_check_in: adjustedExpectedIn,
            status,
            rule_applied_in: mapRule(rule),
            late_minutes: lateMinutes,
            tz: FIELD_TZ,
            tz_offset_minutes: FIELD_TZ_OFFSET,
            justification: justification || null,
            justification_category: justification_category || null,
            flags: recordFlags,
            updated_at: nowUtc.toISOString(),
          })
          .eq('id', existingRecord.id)
          .select()
          .single()

        if (updateError) {
          logger.error('Error updating field check-in over absent shell', updateError)
          return res.status(500).json({ error: 'Error al registrar asistencia', code: 'WRITE_FAILED' })
        }
        record = updated
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            employee_id: employee.id,
            date: nowLocal.date,
            check_in: nowUtc.toISOString(),
            expected_check_in: adjustedExpectedIn,
            status,
            rule_applied_in: mapRule(rule),
            late_minutes: lateMinutes,
            tz: FIELD_TZ,
            tz_offset_minutes: FIELD_TZ_OFFSET,
            justification: justification || null,
            justification_category: justification_category || null,
            flags: recordFlags,
          })
          .select()
          .single()

        if (insertError) {
          logger.error('Error inserting field attendance record', insertError)
          return res.status(500).json({ error: 'Error al registrar asistencia', code: 'WRITE_FAILED' })
        }
        record = inserted
      }

      if (!record?.id) {
        return res.status(500).json({ error: 'Error interno: Record no válido', code: 'WRITE_FAILED' })
      }

      const { error: eventError } = await supabase.from('attendance_events').insert({
        employee_id: employee.id,
        event_type: 'check_in',
        event_uid: eventUid,
        local_date: nowLocal.date,
        ts_utc: nowUtc.toISOString(),
        tz: FIELD_TZ,
        tz_offset_minutes: FIELD_TZ_OFFSET,
        rule_applied: rule,
        justification: justification || null,
        justification_category: justification_category || null,
        source: FIELD_SOURCE,
        ip: clientIp,
        device_id: deviceId,
        lat: geo.lat,
        lon: geo.lon,
        geofence_ok,
        ref_record_id: record.id,
        flags: {
          ...eventFlags,
          distance_m: distance != null ? Math.round(distance) : null,
          user_agent: userAgent,
        },
      } as any)

      if (eventError) {
        logger.error('Error inserting field check-in event', eventError)
        return res.status(500).json({
          error: 'Asistencia parcial: no se pudo registrar el evento',
          code: 'EVENT_WRITE_FAILED',
        })
      }

      try {
        await supabase.rpc('apply_attendance_gamification', {
          p_employee_id: employee.id,
          p_company_id: employee.company_id,
          p_rule: rule,
          p_late_minutes: lateMinutes,
        })
      } catch (e) {
        logger.error('Gamification RPC failed on field check-in', e as any)
      }

      const contextualMessage = getContextualMessage('check_in', msgKey, nowLocal.time, nowLocal.dow)

      logger.info('Field check-in completed', {
        employeeId: employee.id,
        webauthnVerified,
        geofence_ok,
        accuracy_m: geo.accuracy_m,
        eventUid,
      })

      return res.status(200).json({
        success: true,
        action: 'check_in',
        currentTime: nowLocal.time,
        employeeName: employee.name,
        message: contextualMessage.mainMessage,
        contextualMessage: contextualMessage.contextualMessage,
        geofence_ok,
        webauthn_verified: webauthnVerified,
        accuracy_m: geo.accuracy_m,
        event_uid: eventUid,
        data: record,
      })
    }

    // check_out — requires prior check_in (decideFieldPunchAction already enforced)
    if (!existingRecord?.check_in) {
      return res.status(400).json({
        error: 'Debe registrar entrada antes de la salida',
        code: 'CHECKIN_REQUIRED',
      })
    }

    const { data: updatedRecord, error: updateError } = await supabase
      .from('attendance_records')
      .update({
        check_out: nowUtc.toISOString(),
        expected_check_out: adjustedExpectedOut,
        rule_applied_out: 'simple_checkout',
        flags: recordFlags,
        updated_at: nowUtc.toISOString(),
      })
      .eq('id', existingRecord.id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating field checkout', updateError)
      return res.status(500).json({ error: 'Error al registrar salida', code: 'WRITE_FAILED' })
    }

    const record = updatedRecord
    if (!record?.id) {
      return res.status(500).json({ error: 'Error interno: Record no válido', code: 'WRITE_FAILED' })
    }

    const { error: eventError } = await supabase.from('attendance_events').insert({
      employee_id: employee.id,
      event_type: 'check_out',
      event_uid: eventUid,
      local_date: nowLocal.date,
      ts_utc: nowUtc.toISOString(),
      tz: FIELD_TZ,
      tz_offset_minutes: FIELD_TZ_OFFSET,
      rule_applied: 'simple_checkout',
      source: FIELD_SOURCE,
      ip: clientIp,
      device_id: deviceId,
      lat: geo.lat,
      lon: geo.lon,
      geofence_ok,
      ref_record_id: record.id,
      flags: {
        ...eventFlags,
        distance_m: distance != null ? Math.round(distance) : null,
        user_agent: userAgent,
      },
    } as any)

    if (eventError) {
      logger.error('Error inserting field check-out event', eventError)
      return res.status(500).json({
        error: 'Salida parcial: no se pudo registrar el evento',
        code: 'EVENT_WRITE_FAILED',
      })
    }

    logger.info('Field check-out completed', {
      employeeId: employee.id,
      webauthnVerified,
      geofence_ok,
      eventUid,
    })

    return res.status(200).json({
      success: true,
      action: 'check_out',
      currentTime: nowLocal.time,
      employeeName: employee.name,
      message: '✅ Salida registrada exitosamente',
      geofence_ok,
      webauthn_verified: webauthnVerified,
      accuracy_m: geo.accuracy_m,
      event_uid: eventUid,
      data: record,
    })
  } catch (error) {
    logger.error('Unexpected error in field punch', error)
    return res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL' })
  }
}

function getContextualMessage(
  action: 'check_in' | 'check_out',
  messageKey: string,
  currentTime: string,
  dayOfWeek: number
) {
  const ruleMap: Record<string, string> = {
    early: 'early',
    on_time: 'on_time',
    late: 'late',
    oor: 'oor',
    early_out: 'early_out',
    on_time_out: 'on_time_out',
    overtime_out: 'overtime',
    oor_out: 'oor_out',
  }
  const rule = ruleMap[messageKey] || messageKey
  return generateContextualMessage(action, rule, currentTime, dayOfWeek)
}

export default withAttendanceFieldRateLimit(['POST'])(handler)
