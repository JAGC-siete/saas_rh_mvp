#!/usr/bin/env node
/**
 * Investigación: ausencias no visibles — Enlace, sábado 2026-06-27
 * Uso: node scripts/investigate-enlace-absence-2026-06-27.mjs
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local o .env
 */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const COMPANY_ID = 'c419b1a5-32de-4518-8ff2-e7ebd6318a9f'
const TARGET_DATE = '2026-06-27'
const SAMPLE_DNI = '0512198501878'

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 0) continue
      const k = t.slice(0, i).trim()
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[k]) process.env[k] = v
    }
    break
  }
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local / .env')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  console.log('=== Empresa ===')
  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('id, name, country_code, timezone')
    .eq('id', COMPANY_ID)
    .maybeSingle()
  if (companyErr) throw companyErr
  console.log(company)

  console.log('\n=== Empleado muestra DNI', SAMPLE_DNI, '===')
  const { data: sampleEmp, error: sampleErr } = await supabase
    .from('employees')
    .select('id, name, dni, status, attendance_required, work_schedule_id, department_id, hire_date, termination_date')
    .eq('company_id', COMPANY_ID)
    .eq('dni', SAMPLE_DNI)
    .maybeSingle()
  if (sampleErr) throw sampleErr
  console.log(sampleEmp)

  if (sampleEmp?.work_schedule_id) {
    const { data: ws } = await supabase
      .from('work_schedules')
      .select('id, name, saturday_start, saturday_end, sunday_start, sunday_end, shift_config')
      .eq('id', sampleEmp.work_schedule_id)
      .maybeSingle()
    console.log('Horario base:', ws)
  }

  if (sampleEmp?.id) {
    const { data: rec } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', sampleEmp.id)
      .eq('date', TARGET_DATE)
      .maybeSingle()
    console.log('Registro asistencia', TARGET_DATE, ':', rec)

    const { data: events } = await supabase
      .from('attendance_events')
      .select('id, ts_utc, event_type, device_id, local_date')
      .eq('employee_id', sampleEmp.id)
      .eq('local_date', TARGET_DATE)
      .order('ts_utc')
    console.log('Eventos biométricos', TARGET_DATE, ':', events)

    const { data: assignments } = await supabase
      .from('employee_work_schedule_assignments')
      .select('id, work_schedule_id, valid_from, valid_to')
      .eq('employee_id', sampleEmp.id)
      .order('valid_from', { ascending: false })
      .limit(5)
    console.log('Asignaciones horario recientes:', assignments)
  }

  console.log('\n=== Empleados activos (requieren asistencia) sin check-in el', TARGET_DATE, '===')
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, name, dni, attendance_required, work_schedule_id')
    .eq('company_id', COMPANY_ID)
    .eq('status', 'active')
  if (empErr) throw empErr

  const required = (employees || []).filter((e) => e.attendance_required !== false)
  const ids = required.map((e) => e.id)

  const { data: records, error: recErr } = await supabase
    .from('attendance_records')
    .select('employee_id, date, check_in, check_out, status, flags, late_minutes')
    .eq('date', TARGET_DATE)
    .in('employee_id', ids)
  if (recErr) throw recErr

  const recByEmp = new Map((records || []).map((r) => [r.employee_id, r]))
  const absentNoCheckIn = []
  const absentWithRecordNoCheckIn = []
  const present = []
  const exempt = (employees || []).filter((e) => e.attendance_required === false)

  for (const e of required) {
    const r = recByEmp.get(e.id)
    if (!r) {
      absentNoCheckIn.push({ ...e, reason: 'sin_registro' })
    } else if (!r.check_in) {
      absentWithRecordNoCheckIn.push({ ...e, status: r.status, flags: r.flags })
    } else {
      present.push({ name: e.name, dni: e.dni, check_in: r.check_in, status: r.status })
    }
  }

  console.log({
    active_total: employees?.length ?? 0,
    attendance_required: required.length,
    attendance_exempt: exempt.length,
    present_with_checkin: present.length,
    absent_no_record: absentNoCheckIn.length,
    absent_record_no_checkin: absentWithRecordNoCheckIn.length,
  })

  console.log('\n--- Ausentes sin ningún registro (primeros 30) ---')
  console.table(absentNoCheckIn.slice(0, 30).map((e) => ({ name: e.name, dni: e.dni, reason: e.reason })))

  console.log('\n--- Ausentes con registro pero sin check_in ---')
  console.table(absentWithRecordNoCheckIn.map((e) => ({ name: e.name, dni: e.dni, status: e.status })))

  console.log('\n=== RPC attendance_lists_filtered (absent, solo', TARGET_DATE, ') ===')
  const { data: rpcAbsent, error: rpcErr } = await supabase.rpc('attendance_lists_filtered', {
    p_company_id: COMPANY_ID,
    p_from: TARGET_DATE,
    p_to: TARGET_DATE,
    p_type: 'absent',
    p_employee_id: null,
    p_role: null,
    p_department_id: null,
  })
  if (rpcErr) throw rpcErr
  console.log('RPC ausentes count:', rpcAbsent?.length ?? 0)
  console.table((rpcAbsent || []).slice(0, 30).map((r) => ({ name: r.name, dni: r.dni, date: r.date, status: r.status })))

  console.log('\n=== RPC con rango semana ISO desde lunes 2026-06-29 (reproduce bug multi-día) ===')
  const { data: rpcWeek, error: weekErr } = await supabase.rpc('attendance_lists_filtered', {
    p_company_id: COMPANY_ID,
    p_from: '2026-06-29',
    p_to: '2026-07-05',
    p_type: 'absent',
    p_employee_id: null,
    p_role: null,
    p_department_id: null,
  })
  if (weekErr) throw weekErr
  const weekHasSample = (rpcWeek || []).some((r) => r.dni === SAMPLE_DNI)
  console.log({ rpc_week_absent_count: rpcWeek?.length ?? 0, sample_dni_in_week_absent_list: weekHasSample })

  console.log('\n=== Horarios sábado (empleados ausentes sin registro, muestra 15) ===')
  const wsIds = [...new Set(absentNoCheckIn.map((e) => e.work_schedule_id).filter(Boolean))]
  if (wsIds.length) {
    const { data: schedules } = await supabase
      .from('work_schedules')
      .select('id, name, saturday_start, saturday_end')
      .in('id', wsIds)
    const wsMap = new Map((schedules || []).map((s) => [s.id, s]))
    console.table(
      absentNoCheckIn.slice(0, 15).map((e) => {
        const ws = wsMap.get(e.work_schedule_id)
        return {
          name: e.name,
          dni: e.dni,
          saturday_start: ws?.saturday_start ?? 'NULL',
          saturday_end: ws?.saturday_end ?? 'NULL',
        }
      })
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
