---
name: attendance
description: >-
  Protocolo canónico del módulo ATTENDANCE (ingesta biométrica, daily-close,
  AHC, horarios efectivos, KPIs). Use when working on punches, attendance_events,
  attendance_records, attendance_hours_calculation, daily-close, biometric_mode,
  work_schedules resolution, schedule assignments, corrections, Hikvision webhook
  ingest, or files under lib/attendance/, pages/api/attendance/, pages/api/webhooks/attendance.ts,
  pages/app/attendance/. Do not use for payroll preview/authorize or employee CRUD.
---

# ATTENDANCE

Cargar este skill **antes** de leer, nombrar o modificar código del módulo. Código > docs. Docs `docs/legacy/README_LOGICA_ASISTENCIA.md`, `docs/ONBOARDING_ASISTENCIA_ACTUAL.md` y `docs/ATTENDANCE_FINGERPRINT_*` son **históricos** hasta reconciliar.

Detalle de superficie: [reference.md](reference.md). Si el cambio toca master data o liquidación, cargar `employees` o `payroll`.

## Frontera

**Entra:** webhook Hikvision → `raw_punch`; registro manual; daily-close; horarios (`work_schedules` + assignments); AHC; KPIs/listas/timeline; correcciones; reportes de asistencia.

**No entra:** Hikvision outbound/ISAPI (`lib/hikvision/*`); portal read-only (`/api/employees/me/attendance`); leave CRUD; escritura a `payroll_run_lines`; gamificación; demo/trial.

Regla: ingest = eventos inmutables; jornada = daily-close + RPC horas; liquidación = payroll.

## Vocabulario

| Término | Concepto |
|---------|----------|
| `raw_punch` | `attendance_events.event_type` de marca biométrica inmutable |
| `event_uid` | Idempotencia del punch (unique index) |
| `attendance_records` | 1 fila por `(employee_id, date)` |
| AHC / `attendance_hours_calculation` | Horas normales + extras del record |
| Effective schedule | assignment vigente → else `employees.work_schedule_id` |
| `biometric_mode` | `STRICT_2` \| `STRICT_4` \| `FLEXIBLE` (default `STRICT_2`) |
| Daily close | Materializa records desde raw punches |
| `close_state` | `draft` \| `finalized` en `flags` |
| Best Fit | `findBestFitSchedule` 90 min — **lib huérfana, no pipeline vivo** |

## Pipeline canónico (biométrico)

```
POST /api/webhooks/attendance?company_id=
 → match DNI → dedup event_uid
 → INSERT attendance_events (raw_punch)
 → generateDailyCloseReport → mapPunchesToDay(biometric_mode)
 → UPSERT attendance_records (no pisa finalized|admin_override)
 → [separado] finalize | calculate-hours | cron/daily
 → calculate_attendance_hours_batch → AHC
```

Registro público (`/api/attendance/register`) escribe **directo** a `attendance_records` (no `raw_punch`). No unificar ambos caminos.

**Daily-close no calcula AHC.** `generateDailyCloseReport` no llama `calculate_attendance_hours_batch`.

## Entrada de código

1. `pages/api/webhooks/attendance.ts`
2. `lib/attendance/daily-close.ts`, `punch-mapping.ts`, `attendance-metadata.ts`
3. `lib/attendance/calculate-hours.ts`, `overtime-bands.ts`
4. `lib/attendance/effective-work-schedule.ts`, `resolve-schedule-batch.ts`
5. APIs `pages/api/attendance/daily-close/*`

KPIs: preferir `attendance_kpis_filtered` / `attendance_lists_filtered` sobre RPCs legacy.

## Invariantes

- TZ default: `America/Tegucigalpa`.
- Dedup webhook: `event_uid`, **no** ventana 15 min.
- Tope jornada regular: 8h (`legal_daily_hours`).
- Late abs max: 240 min. Grace default: late/early 5, absent 60.
- Overtime vivo: bandas reloj 25/50/75/100% (`overtime-bands.ts`), no solo diurno/nocturno clásico.
- Tenant: `company_id` + RLS; webhook usa service_role.
- `tz_offset` daily-close: `-360` hardcode al upsert.

## Contratos

**Lee de employees:** `id`, `company_id`, `dni`, `status`, `work_schedule_id`, `pay_type`, `attendance_required`.

**Escribe para payroll:** `attendance_records`, `attendance_hours_calculation`. Payroll consume; attendance **no** escribe `payroll_runs` / `payroll_run_lines` / `payroll_adjustments`.

**Leave:** solo lectura (`paid_leave` en KPIs; créditos RPC en preview nómina). No crea records automáticos.

## Anti-patrones

- Insertar `attendance_records` desde el webhook (docs fingerprint viejas).
- Usar Best Fit como flujo vivo (`best-fit-schedule.ts` sin importadores). README dice 2.5h; código 90 min y no está cableado.
- Asumir AHC dentro de daily-close.
- Usar `attendance_stage` o `apply-compliance-layer.ts` (no operativos).
- Mezclar `kpis.ts` y `kpis-unified.ts` sin intención.
- Tratar `pages/api/employees/debug-attendance.ts` como producción.

## Workflow de cambio

| Cambio | Orden |
|--------|--------|
| Modo biométrico / marcas | `punch-mapping.ts` (+ tests) → metadata → daily-close flags → UI DailyClose |
| Horas / overtime | migración `calculate_attendance_hours_batch` → `calculate-hours.ts` / `overtime-bands.ts` → verificar consumo en `payroll/preview.ts` — **no** tocar `payroll_run_lines` |
| Webhook / marcas ausentes | `webhooks/attendance.ts` → daily-close → RPCs lists/KPIs |
| Horarios rotativos / late | assignments APIs → `effective-work-schedule.ts` → `compute-late-minutes.ts` |
| Finalize | `daily-close.ts` → `daily-close/finalize.ts` → `calculateAttendanceHoursForCompanyAndDate` |
