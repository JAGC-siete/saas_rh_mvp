# Lógica de Asistencia — Resumen para Desarrolladores

Este documento resume cómo el sistema decide qué horario aplicar, la prioridad de las 3 capas y las reglas clave para futuros desarrolladores.

---

## 1. Prioridad de las 3 Capas

| Orden | Capa | Descripción | Cuándo aplica |
|-------|------|-------------|----------------|
| 1 | **Capa Base** | Cálculo universal 8h regular + overtime | Siempre. No depende de horario. |
| 2 | **Capa Cumplimiento** | Puntualidad, late/early, Best Fit | Solo si hay horario asignado y coincide. |
| 3 | **Capa Nómina** | Días trabajados, horas extra, días Extra/Especial | Al generar nómina. |

**Regla crítica:** Si la Capa 2 no logra encontrar un horario que coincida, **no se marca error**. Se emite el flag `horario_no_detectado` y se procede con la Capa 1 (8h base + extras).

---

## 2. Best Fit (Mejor Ajuste)

Cuando el empleado tiene horario asignado, el sistema busca el `start_time` (check-in) o `end_time` (check-out) **más cercano** a la marca actual, recorriendo los 7 días del horario.

### Umbral: 2.5 horas (150 minutos)

- Si la marca está a **≤ 150 min** del horario más cercano → **match** (Capa 2).
- Si la marca está a **> 150 min** del horario más cercano → **horario_no_detectado** (Capa 1).

Constante: `BEST_FIT_THRESHOLD_MINUTES` en `lib/attendance/best-fit-schedule.ts`.

### Metadata para UI (Capa 1)

Cuando se activa Capa 1 por distancia excedida, se guarda en `attendance_records.flags`:

```json
{
  "horario_no_detectado": true,
  "razon": "distancia_horario_excedida",
  "gap_minutos": 180
}
```

Valores de `razon`:
- `distancia_horario_excedida` — La marca superó el umbral de 2.5h respecto al horario más cercano.
- `sin_horario_asignado` — El empleado no tiene `work_schedule_id`.
- `error_fetch_horario` — Error al obtener el horario desde la BD.

La API de asistencia (`attendance_employee_timeline`, `attendance_lists_filtered`) devuelve `flags` para que la UI muestre alertas al administrador.

---

## 3. Prevención de Duplicados

Si un empleado marca **dos veces en un rango de 15 minutos** (por error o duda), el sistema **ignora la segunda marca**.

- Ventana: 15 minutos (`DUPLICATE_WINDOW_MS = 15 * 60 * 1000`).
- Aplica a: empleados fixed (con y sin horario) y hourly.
- Comportamiento: no se crea un nuevo registro; se loguea y se retorna.

---

## 4. Horas Extra Diurnas vs Nocturnas (Capa 3)

El sistema **sí diferencia** entre Horas Extra Diurnas y Nocturnas, según Honduras:

| Tipo | Rango horario | Recargo |
|------|---------------|---------|
| Diurno | 6:00 - 18:00 | +25% |
| Nocturno | 18:00 - 6:00 | +50% |
| Mixto / Feriado | Cruza ambos o es festivo | +75% |

La función `determine_shift_type(check_in, check_out)` clasifica el **turno completo** según las horas de entrada y salida. Si el turno cruza día y noche (ej. 17:00-21:00), se considera **mixto** y todo el overtime va a `overtime_feriado_hours`.

**Nota:** Una segmentación más fina (ej. 17-18 diurno, 18-21 nocturno) requeriría una función que divida el overtime por franjas horarias. La implementación actual es suficiente para la mayoría de casos en Honduras.

---

## 5. Cierre de Jornada (Cruce de Medianoche)

Para turnos nocturnos donde el check-out es al día siguiente:

- Se busca el **último registro abierto** (sin `check_out`) del empleado.
- Si la nueva marca está **dentro de 30 horas** del `check_in` de ese registro → se actualiza como `check_out`.
- Si supera 30 horas → se cierra el registro huérfano y se crea un nuevo `check_in`.

---

## 6. Archivos Clave

| Archivo | Responsabilidad |
|---------|-----------------|
| `lib/attendance/best-fit-schedule.ts` | Best Fit, umbral 2.5h, `capa1Razon`, `gapMinutos` |
| `pages/api/webhooks/attendance.ts` | Webhook, duplicados 15 min, flags en BD |
| `supabase/migrations/20260218000001_*.sql` | `calculate_attendance_hours_batch`, `time_segments` |
| `supabase/migrations/20260218000002_*.sql` | RPCs con `flags` para UI |
| `supabase/migrations/20260211000007_*.sql` | `determine_shift_type` (diurno/nocturno/mixto) |

---

## 7. Flujo Resumido

```
Marca recibida
    ↓
¿Empleado tiene work_schedule_id?
    ├─ No  → handleFixedEmployeeNoSchedule (Capa 1, flags.razon: sin_horario_asignado)
    └─ Sí  → findBestFitSchedule(mode: check_in|check_out)
                ↓
        ¿Match dentro de 2.5h?
            ├─ No  → handleFixedEmployeeNoSchedule (Capa 1, flags: razon, gap_minutos)
            └─ Sí  → Usar expected_check_in/out, late_minutes, early_departure
    ↓
¿Check_in duplicado (≤15 min)?
    └─ Sí  → Ignorar
    ↓
Crear/actualizar attendance_record
    ↓
calculate_attendance_hours_batch (Capa 1 siempre: 8h base, exceso = overtime)
```
