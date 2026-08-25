# ATTENDANCE — referencia de superficie

Leer desde `SKILL.md`. Código > docs. Verificar `daily-close.ts` + `webhooks/attendance.ts` + última migration `calculate_attendance_hours_batch`.

## Tablas

| Tabla | Rol |
|-------|-----|
| `attendance_events` | Ingesta: `employee_id`, `ts_utc`, `event_type`, `event_uid`, `local_date`, `ref_record_id`, `device_id`, `source` |
| `attendance_records` | Día: check_in/out, lunch_*, status, late_minutes, expected_*, flags |
| `attendance_hours_calculation` | AHC: normal_hours, overtime_*, lunch_minutes, time_segments, bandas `overtime_evening_25_hours`… |
| `work_schedules` | Plantilla: `*_start/*_end`, break, timezone, `shift_type`, `shift_config`, grace |
| `employee_schedule_assignments` | `valid_from/to`, `repeat_weekly`, `repeat_weekdays` |
| `attendance_corrections` | `pending` \| `approved` \| `rejected` |
| `company_metadata.attendance_metadata` | `biometric_mode`, timezone |
| `attendance_stage` | Solo types; sin uso app |
| `devices` | Tenant webhook (`company_id` en URL) |

`employees` se lee: `dni`, `work_schedule_id`, `pay_type`, `attendance_required`, `company_id`.

## RPCs

Lectura: `attendance_employee_timeline`, `attendance_lists_filtered`, `attendance_kpis_filtered`, `attendance_kpis_unified`, `attendance_aggregate`, `attendance_export`, `reports_attendance`, `reports_attendance_summary`, `get_late_attendance_report`.

Cálculo: `calculate_attendance_hours_batch`, `resolve_effective_work_schedule_id`, `work_schedule_expected_minutes`, `work_schedule_implicit_break_minutes`, `allocate_overtime_by_clock_bands`, `classify_overtime_minute_band`, `determine_shift_type` (histórico).

Cross: `employee_has_approved_paid_leave_on_date`, `payroll_paid_leave_work_day_credits`.

`lib/database.types.ts` **no** tipa `calculate_attendance_hours_batch` ni `resolve_effective_work_schedule_id`.

## APIs core (`pages/api/attendance/`)

| Ruta | Función |
|------|---------|
| `webhooks/attendance.ts` | Hikvision → raw_punch + daily-close live |
| `register.ts` | Marca pública/manual → records |
| `daily-close/index.ts` | GET reporte |
| `daily-close/run.ts` | POST regenerar |
| `daily-close/finalize.ts` | Finalizar + AHC |
| `daily-close/recalculate.ts`, `record.ts`, `bulk.ts` | Ajustes cierre |
| `calculate-hours.ts` | AHC on-demand |
| `kpis.ts` / `lists.ts` / `kpis-unified.ts` | RPCs filtered / unified |
| `employee/[id].ts` | Timeline |
| `schedule-assignments.ts`, `[id].ts` | CRUD asignaciones |
| `corrections/index.ts`, `[id].ts` | Correcciones |
| `export.ts`, `export-report.ts`, `generate-pdf.ts` | Export |

Relacionadas: `/api/employees/me/attendance`, `/api/reports/attendance*`, `/api/cron/daily`, `/api/cron/late-attendance-report`.

## Libs `lib/attendance/`

| Archivo | Función |
|---------|---------|
| `daily-close.ts` | `generateDailyCloseReport` |
| `punch-mapping.ts` | `mapPunchesToDay` por `biometric_mode` |
| `attendance-metadata.ts` | mode + TZ (`America/Tegucigalpa`) |
| `calculate-hours.ts` | Wrapper RPC AHC |
| `effective-work-schedule.ts` | Horario efectivo 1 empleado |
| `resolve-schedule-batch.ts` | Batch + load assignments |
| `schedule-assignment-logic.ts` | Conflictos overlap |
| `schedule-times.ts` | Start/end/rest day |
| `shift-config.ts` | `shift_config` + `DEFAULT_SCHEDULE_TOLERANCE` |
| `compute-late-minutes.ts` | Late firmado; max abs 240 |
| `best-fit-schedule.ts` | 90 min — **sin importadores** |
| `overtime-bands.ts` | Bandas HE reloj ↔ AHC |
| `validate-marks.ts` | Correcciones |
| `report.ts` | PDF consolidado |
| `lib/attendance.ts` | Solo `getDateRange` |

## Estados

`attendance_records.status`: `present` \| `partial` \| `absent`.  
`flags.close_state`: `draft` → `finalized`.  
Correcciones: `pending` → `approved` \| `rejected`. Approve escribe records (+ AHC según handler).

Horario: `employees.work_schedule_id` → override assignments (más reciente en rango) → else null (solo Capa 1). Runtime daily-close **no** usa Best Fit; late vs `expectedStart` (`LATE_MINUTES_MAX_ABS_MINUTES = 240`).

## Discrepancias críticas

1. Pipeline vivo = `raw_punch` → daily-close → (luego) AHC. No Best Fit ni ±1h en webhook.
2. Best Fit 90 min existe como lib muerta; README dice 2.5h.
3. Dedup = `event_uid`, no ventana 15 min.
4. AHC no corre dentro de `generateDailyCloseReport`.
5. Overtime migró a bandas de reloj; docs aún hablan diurno/nocturno clásico.
6. `attendance_stage` / `apply-compliance-layer` no son superficie operativa.
7. `ARQUITECTURA_INGESTA_ASISTENCIA.md`: leer con cautela (AHC en daily-close = falso).

## UI

`pages/app/attendance/{dashboard,daily-close,scheduling,corrections,register}.tsx`. Públicas: `pages/attendance/{index,register,public}.tsx`. Componentes: `components/attendance/*`.
