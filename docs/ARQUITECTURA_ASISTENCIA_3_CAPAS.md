# Arquitectura de Procesamiento de Asistencia — 3 Capas Progresivas

**Objetivo:** Procesar marcajes (check-in/check-out) de forma incremental, incluso sin horario predefinido, mediante tres capas de análisis progresivo.

---

## 1. Resumen del Análisis del Sistema Actual

### 1.1 Esquemas de Base de Datos Relevantes

| Tabla/Campo | Estado | Uso |
|-------------|--------|-----|
| `attendance_records` | ✅ | `check_in`, `check_out`, `lunch_start`, `lunch_end`, `status`, `late_minutes`, `early_departure_minutes`, `expected_check_in`, `expected_check_out` |
| `attendance_hours_calculation` | ✅ | `total_hours`, `normal_hours`, `overtime_diurno/nocturno/feriado_hours`, `work_schedule_id` |
| `employees.pay_type` | ✅ | `'fixed'` \| `'hourly'` — a nivel **empleado** |
| `employees.work_schedule_id` | ✅ | Horario asignado (puede ser NULL) |
| `work_schedules` | ✅ | Horarios por día de semana (fijos) |
| `company_payroll_configs` | ⚠️ | `metadata` JSONB — no tiene flag explícito `pay_by_hour_mode` a nivel empresa |
| `labor_laws` | ✅ | `legal_daily_hours` (8), `mandatory_break_minutes` |

### 1.2 Gaps Identificados

1. **Capa Base:** La función `calculate_attendance_hours_batch` usa `v_expected_hours` del horario cuando existe. Si el horario indica 6h, se calculan 6h normales y 2h extra para 8h trabajadas. **Requerido:** Siempre usar 8h como tope de jornada regular (agnóstico de horario).

2. **Webhook:** Empleados sin `work_schedule_id` son ignorados (`handleFixedEmployeeEvent` retorna early). No se procesan marcajes para empleados sin horario.

3. **Horarios rotativos:** No existe `employee_schedule_assignments` ni estructura para múltiples horarios por empleado/fecha. Solo `work_schedule_id` único por empleado.

4. **Pago por hora a nivel empresa:** `pay_type` está solo en `employees`. Falta opción en `company_payroll_configs` para indicar "modo por hora por defecto" cuando la compañía lo requiera.

---

## 2. Arquitectura de las 3 Capas

### Capa 1: Cálculo Universal (Agnóstico de Horario)

**Ejecutar siempre primero.** No depende de configuración previa.

| Regla | Implementación |
|------|----------------|
| Primer y último marcaje del día = jornada | Ya soportado: `check_in` / `check_out` (o `lunch_start`/`lunch_end` en flujo 4 marcas) |
| Jornada regular (tope 8h) | `normal_hours = MIN(total_effective_hours, 8)` |
| Horas extra = exceso sobre 8h | `overtime_hours = MAX(0, total_effective_hours - 8)` |

**Fórmula efectiva:**
```
total_effective = (check_out - check_in) - lunch_minutes
normal_hours = MIN(total_effective / 60, 8)
overtime_hours = MAX(0, total_effective / 60 - 8)
```

### Capa 2: Cumplimiento (Basada en Horarios/Turnos)

**Solo cuando existe horario asignado.** Se superpone a la Capa 1.

| Regla | Implementación |
|-------|----------------|
| Puntualidad | Comparar `check_in` vs `expected_check_in` del horario |
| Diferenciales | `status`: `'late'`, `'early_departure'`, `'on_time'` |
| Rotativos | Buscar horario que mejor coincida con el bloque de horas marcadas (requiere estructura nueva) |

**Importante:** La Capa 2 **no modifica** el cálculo de horas. Solo añade flags de cumplimiento. Las horas siguen la regla de 8h base.

### Capa 3: Nómina y Liquidación

| Regla | Implementación |
|-------|----------------|
| Modo Asistencia (default) | ≥1 registro con `check_in` en el día = día laborado (pago por día) |
| Modo Por Hora | Solo si `pay_type = 'hourly'` (o flag empresa): pago = sumatoria exacta de horas |
| Rango de fechas | Filtrar estrictamente por `date` dentro del período seleccionado |

---

## 3. Cambios Propuestos

### 3.1 Migración: Capa Base en `calculate_attendance_hours_batch`

**Archivo:** Nueva migración que reemplace la lógica actual.

**Cambio clave:** Usar siempre `legal_daily_hours` (8) como tope de jornada regular, independientemente del horario:

```sql
-- ANTES (actual):
v_expected_hours := get_expected_hours_for_date(v_record.work_schedule_id, v_record.date);
IF v_expected_hours IS NULL OR v_expected_hours <= 0 THEN
  v_expected_hours := v_law.legal_daily_hours;
END IF;
-- normal = min(total, expected), overtime = max(0, total - expected)

-- DESPUÉS (Capa 1):
-- Siempre usar 8h como tope de jornada regular (Capa Base)
v_regular_cap_hours := v_law.legal_daily_hours;  -- 8
IF v_total_minutes / 60.0 <= v_regular_cap_hours THEN
  v_normal_hours := v_total_minutes / 60.0;
  v_overtime_hours := 0;
ELSE
  v_normal_hours := v_regular_cap_hours;
  v_overtime_hours := (v_total_minutes / 60.0) - v_regular_cap_hours;
END IF;
```

**Rotativos / fuera de rango:** Si el registro no coincide con ningún horario esperado, se mantiene el cálculo base (8h). No se generan conflictos.

### 3.2 Servicio de Cumplimiento (Capa 2)

Crear función o proceso que, **después** del cálculo de horas, actualice `attendance_records`:

- `status` = `'late'` | `'early_departure'` | `'on_time'` | `'present'`
- `late_minutes`, `early_departure_minutes`
- `expected_check_in`, `expected_check_out`

Solo aplica cuando `work_schedule_id IS NOT NULL`. Puede ejecutarse en batch al final del día o al recalcular.

### 3.3 Webhook: Procesar Empleados Sin Horario

Actualmente `handleFixedEmployeeEvent` retorna si `!employee.work_schedule_id`. Cambio propuesto:

- Si `pay_type = 'fixed'` y **no** hay `work_schedule_id`: usar lógica simplificada:
  - Primera marca del día → `check_in`
  - Segunda marca del día → `check_out`
  - Sin validación de ventanas (no hay horario de referencia)
- Si `pay_type = 'hourly'`: ya existe `handleHourlyEmployeeEvent` (segunda marca = check_out dentro de 30h).

### 3.4 Flag "Pago por Hora" a Nivel Empresa (Opcional)

Para empresas que pagan por hora por defecto:

```sql
-- company_payroll_configs.metadata o nuevo campo
ALTER TABLE company_payroll_configs ADD COLUMN IF NOT EXISTS
  default_pay_mode TEXT DEFAULT 'attendance' 
  CHECK (default_pay_mode IN ('attendance', 'hourly'));
```

Resolución: `employees.pay_type` > `company_payroll_configs.default_pay_mode` > `'attendance'`.

### 3.5 Horarios Rotativos: ¿work_assignments o work_schedule_id?

**Respuesta:** Depende del nivel de rotación que requieras.

| Escenario | Estructura actual | Recomendación |
|-----------|-------------------|---------------|
| **Un horario por empleado con distintos días** (ej. Lun-Vie 8-17, Sáb 8-12) | `work_schedules` con monday_start...sunday_start | ✅ Suficiente. Un solo `work_schedule_id` por empleado. |
| **Rotación semanal** (ej. semana A turno día, semana B turno noche) | `employees.work_schedule_id` único | ⚠️ Limitado. Best Fit ayuda pero no distingue semanas. |
| **Rotación dinámica por fecha** (cambios frecuentes, múltiples horarios) | No soportado | ✅ Crear `employee_schedule_assignments (employee_id, work_schedule_id, valid_from, valid_to)` |

**Conclusión:** Para la mayoría de casos, `work_schedule_id` + **Best Fit** (buscar el start_time más cercano en los 7 días del horario) es suficiente. Si necesitas rotación por semana o por rango de fechas explícito, conviene añadir `employee_schedule_assignments`.

---

## 4. Orden de Ejecución del Servicio de Asistencia

```
1. CAPA BASE (siempre)
   - Calcular total_effective_hours = (check_out - check_in) - lunch
   - normal_hours = MIN(total_effective, 8)
   - overtime = MAX(0, total_effective - 8)
   - Segmentar overtime por tipo (diurno/nocturno/feriado)
   - Guardar en attendance_hours_calculation

2. CAPA CUMPLIMIENTO (si work_schedule_id IS NOT NULL)
   - Obtener expected_check_in, expected_check_out del horario
   - Calcular late_minutes, early_departure_minutes
   - Actualizar attendance_records.status, late_minutes, early_departure_minutes

3. CAPA NÓMINA (en payroll/calculate, payroll/preview)
   - Modo asistencia: days_worked = count(días con ≥1 check_in)
   - Modo por hora: total_hours = sum(attendance_hours_calculation.total_hours)
   - Filtrar por rango de fechas estricto
```

---

## 5. Archivos Modificados / Pendientes

| Archivo | Estado |
|---------|--------|
| `supabase/migrations/20260218000001_attendance_capa_base_8h_universal.sql` | ✅ Creado — Capa Base 8h universal |
| `pages/api/webhooks/attendance.ts` | ✅ Modificado — `handleFixedEmployeeNoSchedule` para empleados sin horario |
| `lib/attendance/apply-compliance-layer.ts` | ⏳ Opcional — RPC o batch para actualizar status/late/early cuando hay horario |
| `pages/api/payroll/calculate.ts` | ✅ Ya usa `pay_type` y `attendance_hours_calculation`; filtro por fechas correcto |
| `pages/api/payroll/preview.ts` | ✅ Idem |
| `company_payroll_configs.default_pay_mode` | ⏳ Opcional — migración si se requiere flag a nivel empresa |

---

## 6. Resumen de Reglas de Negocio

| Escenario | Comportamiento |
|-----------|----------------|
| Sin horario asignado | Capa 1: 8h regular, exceso = overtime. Sin status late/early. |
| Con horario asignado | Capa 1 + Capa 2: mismas horas, más status (late/early/on_time). |
| Rotativo / fuera de rango | Capa 1: siempre 8h base. Capa 2: no aplica o se usa horario que mejor coincida. |
| Nómina modo asistencia | 1 registro con check_in = 1 día laborado. |
| Nómina modo por hora | Suma de `attendance_hours_calculation.total_hours` en el período. |
