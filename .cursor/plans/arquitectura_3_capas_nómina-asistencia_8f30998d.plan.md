---
name: Arquitectura 3 capas nómina-asistencia
overview: "Diseñar e implementar arquitectura de 3 capas para cálculo de nómina/asistencia: Capa 1 (valores por defecto conforme a ley Honduras 2026), Capa 2 (configuración por empresa que sobrescribe capa 1), Capa 3 (ajustes específicos al momento del cálculo). Integrar con schema existente sin duplicar información."
todos:
  - id: create-labor-laws-table
    content: Crear tabla labor_laws con estructura para valores legales por defecto (Capa 1)
    status: completed
  - id: seed-labor-laws-2026
    content: Seed datos de labor_laws para Honduras 2026 con valores confirmados y pendientes
    status: completed
  - id: add-payment-frequency-to-employees
    content: Agregar payment_frequency a employees (NO a work_schedules - es contractual, no físico)
    status: pending
  - id: extend-payroll-configs
    content: Extender company_payroll_configs con campos de frecuencia de pago
    status: completed
  - id: create-company-metadata
    content: Crear tabla company_metadata solo para módulos sin tabla dedicada (NO payroll)
    status: completed
  - id: create-attendance-hours-calculation
    content: Crear tabla attendance_hours_calculation con separación de overtime por tipo (diurno, nocturno, feriado)
    status: completed
  - id: create-calculate-hours-function
    content: Crear función SQL calculate_attendance_hours_batch() optimizada con parámetros/cache para evitar SELECT * en loops
    status: completed
  - id: create-cron-job-calculation
    content: Crear cron job para calcular horas al final del día (NO en cada webhook)
    status: pending
  - id: create-helper-functions
    content: "Crear funciones helper: resolve_payroll_config(), calculate_expected_hours_for_date(), get_labor_law_value()"
    status: completed
  - id: integrate-payroll-calculation
    content: Modificar funciones de cálculo de nómina para usar attendance_hours_calculation y resolver configuración por capas
    status: completed
  - id: update-payroll-api
    content: Actualizar API de cálculo de nómina para integrar las 3 capas de configuración
    status: completed
isProject: false
---

# Arquitectura de 3 Capas para Nómina y Asistencia

## Objetivo

Implementar sistema de configuración en 3 capas que permita:

- **Capa 1**: Operar conforme a ley sin configuración del usuario
- **Capa 2**: Configuración por empresa que sobrescribe valores por defecto
- **Capa 3**: Ajustes específicos al momento del cálculo (ya existe parcialmente)

## Análisis del Schema Actual

### Tablas existentes relevantes:

- `work_schedules`: Horarios por día de semana, `break_duration`
- `company_payroll_configs`: Configuración de nómina por empresa (`custom_fields`, `calculation_config`)
- `payroll_adjustments`: Ajustes manuales a líneas de nómina (Capa 3 parcial)
- `payroll_run_lines`: Líneas calculadas con `calc_*` (calculado) y `eff_*` (efectivo después de ajustes)
- `attendance_records`: Registros diarios consolidados
- `attendance_events`: Eventos individuales de check_in/check_out
- `tax_brackets`: Tablas fiscales por año (ya implementado para ISR 2026)

### Problemas identificados:

1. No existe tabla centralizada de valores legales por defecto
2. `work_schedules` no tiene campos de frecuencia de pago
3. Falta cálculo detallado de horas (normal vs overtime) con segmentación
4. `company_payroll_configs` tiene `custom_fields` pero falta estructura para frecuencia de pago

## Arquitectura de 3 Capas

### Capa 1: Valores Legales por Defecto (Sin Configuración)

**Tabla: `labor_laws**`

```sql
CREATE TABLE labor_laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'HND',
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Jornada laboral
  legal_daily_hours DECIMAL(4,2) DEFAULT 8.00,
  legal_weekly_hours DECIMAL(4,2) DEFAULT 44.00,
  legal_weekly_days INTEGER DEFAULT 6,
  
  -- Horas extraordinarias (Honduras: 25% diurno, 50% nocturno, 75% mixto/feriado)
  overtime_threshold_hours DECIMAL(4,2) DEFAULT 8.00,
  overtime_diurno_rate DECIMAL(3,2) DEFAULT 1.25, -- +25% diurna
  overtime_nocturno_rate DECIMAL(3,2) DEFAULT 1.50, -- +50% nocturna
  overtime_feriado_rate DECIMAL(3,2) DEFAULT 1.75, -- +75% feriado/mixto
  
  -- Descansos
  mandatory_break_minutes INTEGER DEFAULT 30,
  break_required_after_hours DECIMAL(4,2) DEFAULT 5.00,
  minimum_rest_between_shifts_hours DECIMAL(4,2) DEFAULT 10.00,
  
  -- Valores fiscales (referencia a tax_brackets, pero valores directos para fallback)
  minimum_wage DECIMAL(10,2) DEFAULT 11903.13,
  ihss_ceiling DECIMAL(10,2) DEFAULT 11903.13,
  ihss_employee_rate DECIMAL(5,4) DEFAULT 0.05,
  rap_rate DECIMAL(5,4) DEFAULT 0.015,
  
  -- Días festivos (JSONB array de fechas con metadata)
  -- Formato: [{"date": "2026-01-01", "name": "Año Nuevo", "movable": false}, ...]
  holidays JSONB DEFAULT '[]',
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(country_code, year)
);
```

**Función helper: `get_labor_law_value(year, field_name)**`

- Retorna valor legal para año específico
- Fallback a año más reciente activo si no existe
- Usado por funciones de cálculo cuando no hay configuración de empresa

### Capa 2: Configuración por Empresa (Sobrescribe Capa 1)

**IMPORTANTE: `payment_frequency` NO va en `work_schedules**`

- El horario es físico (a qué hora entro)
- La frecuencia de pago es contractual/administrativa
- Un empleado puede cambiar de horario pero mantener su frecuencia de pago

**Agregar `payment_frequency` a `employees` (contractual):**

```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS
  payment_frequency TEXT CHECK (payment_frequency IN ('quincenal', 'mensual')),
  payment_day INTEGER CHECK (payment_day BETWEEN 1 AND 31),
  -- Para quincenal
  quincena_config JSONB DEFAULT '{
    "first_start": 1,
    "first_end": 15,
    "second_start": 16,
    "second_end": 30
  }'::jsonb;
```

**Extender `company_payroll_configs` con frecuencia de pago (default por empresa):**

```sql
ALTER TABLE company_payroll_configs ADD COLUMN IF NOT EXISTS
  payment_frequency TEXT CHECK (payment_frequency IN ('quincenal', 'mensual')),
  payment_day INTEGER CHECK (payment_day BETWEEN 1 AND 31),
  quincena_config JSONB DEFAULT '{
    "first_start": 1,
    "first_end": 15,
    "second_start": 16,
    "second_end": 30
  }'::jsonb;
```

**Tabla: `company_metadata` (solo para módulos sin tabla dedicada)**

```sql
CREATE TABLE company_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id),
  
  -- Solo metadata que NO tiene tabla dedicada y NO se usa para filtros/reportes
  -- Si el dato es vital para cálculo o filtros, mejor columna real
  employees_metadata JSONB DEFAULT '{}', -- Solo preferencias visuales/flags menores
  attendance_metadata JSONB DEFAULT '{}', -- Solo configuraciones UI
  schedules_metadata JSONB DEFAULT '{}', -- Solo metadata no crítica
  -- NO incluir payroll_metadata (usar company_payroll_configs)
  
  -- Feriados personalizados por empresa (sobrescribe labor_laws)
  custom_holidays JSONB DEFAULT '[]', -- [{date, name, is_working: false, pay_double: true}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Lógica de resolución Capa 2:**

- Frecuencia de pago: `employees.payment_frequency` → `company_payroll_configs.payment_frequency` → `labor_laws` (mensual)
- Feriados: `company_metadata.custom_holidays` → `labor_laws.holidays`
- Horarios: `work_schedules` del empleado (físico, no contractual)

### Capa 3: Ajustes Específicos al Momento del Cálculo

**Ya existe parcialmente:**

- `payroll_adjustments`: Ajustes manuales a campos específicos
- `payroll_run_lines.eff_*`: Valores efectivos después de ajustes

**Extender para asistencia:**

```sql
CREATE TABLE attendance_hours_calculation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  work_schedule_id UUID REFERENCES work_schedules(id),
  
  -- Cálculo de horas
  total_hours DECIMAL(5,2) NOT NULL,
  normal_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  lunch_minutes INTEGER DEFAULT 0,
  
  -- Segmentación por períodos (para detectar overtime)
  time_segments JSONB DEFAULT '[]', -- [{start, end, type: 'normal'|'overtime'}]
  
  -- Metadata del cálculo
  calculation_method TEXT DEFAULT 'automatic', -- 'automatic' | 'manual' | 'adjusted'
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_by UUID REFERENCES employees(id),
  
  -- Referencia a ajustes manuales si aplica
  adjustment_id UUID REFERENCES payroll_adjustments(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(attendance_record_id)
);
```

**Función optimizada: `calculate_attendance_hours_batch()**`

**PROBLEMA CRÍTICO**: La función original hace SELECT * en un loop. Con 500 empleados × 22 días = 11,000 consultas.

**SOLUCIÓN**: Función batch que recibe parámetros pre-cargados (ver sección completa más abajo)

```sql
CREATE OR REPLACE FUNCTION calculate_attendance_hours_batch(
  p_record_ids UUID[],
  p_law_year INTEGER DEFAULT NULL,
  p_law_data JSONB DEFAULT NULL -- Cache de labor_laws
)
RETURNS TABLE (
  attendance_record_id UUID,
  calculation_id UUID,
  total_hours DECIMAL(5,2),
  normal_hours DECIMAL(5,2),
  overtime_diurno_hours DECIMAL(5,2),
  overtime_nocturno_hours DECIMAL(5,2),
  overtime_feriado_hours DECIMAL(5,2)
) AS $$
DECLARE
  v_record attendance_records%ROWTYPE;
  v_employee employees%ROWTYPE;
  v_schedule work_schedules%ROWTYPE;
  v_law labor_laws%ROWTYPE;
  v_check_in TIMESTAMPTZ;
  v_check_out TIMESTAMPTZ;
  v_total_minutes INTEGER;
  v_break_minutes INTEGER;
  v_normal_hours DECIMAL(5,2);
  v_overtime_diurno_hours DECIMAL(5,2);
  v_overtime_nocturno_hours DECIMAL(5,2);
  v_overtime_feriado_hours DECIMAL(5,2);
  v_is_holiday BOOLEAN;
  v_shift_type TEXT; -- 'diurno', 'nocturno', 'mixto'
BEGIN
  -- Cargar valores legales UNA VEZ (no en loop)
  IF p_law_data IS NULL THEN
    SELECT * INTO v_law FROM labor_laws 
    WHERE country_code = 'HND' 
      AND year = COALESCE(p_law_year, EXTRACT(YEAR FROM CURRENT_DATE))
      AND is_active = TRUE
    ORDER BY year DESC LIMIT 1;
  ELSE
    -- Usar cache si se proporciona
    v_law := jsonb_populate_record(NULL::labor_laws, p_law_data);
  END IF;
  
  -- Procesar todos los registros en batch
  FOR v_record IN 
    SELECT ar.*, e.work_schedule_id, e.company_id
    FROM attendance_records ar
    JOIN employees e ON e.id = ar.employee_id
    WHERE ar.id = ANY(p_record_ids)
      AND ar.check_in IS NOT NULL 
      AND ar.check_out IS NOT NULL
  LOOP
    -- Cargar empleado y schedule (una vez por registro)
    SELECT * INTO v_employee FROM employees WHERE id = v_record.employee_id;
    SELECT * INTO v_schedule FROM work_schedules WHERE id = v_employee.work_schedule_id;
  
  -- Usar break_duration del schedule (Capa 2) o valor legal (Capa 1)
  v_break_minutes := COALESCE(v_schedule.break_duration, v_law.mandatory_break_minutes, 60);
  
  -- Calcular horas esperadas desde work_schedules (Capa 2) o valores legales (Capa 1)
  v_expected_hours := calculate_expected_hours_for_date(
    v_schedule, 
    v_record.date, 
    v_law
  );
  
  -- Calcular horas trabajadas
  IF v_record.check_in IS NOT NULL AND v_record.check_out IS NOT NULL THEN
    v_total_minutes := EXTRACT(EPOCH FROM (v_record.check_out - v_record.check_in)) / 60;
    v_total_minutes := v_total_minutes - v_break_minutes; -- Restar descanso
    
    -- Verificar si es feriado (usar company_metadata.custom_holidays o labor_laws.holidays)
    v_is_holiday := is_holiday_date(v_record.date, v_employee.company_id);
    
    -- Determinar tipo de turno (diurno/nocturno/mixto) desde work_schedules
    v_shift_type := determine_shift_type(v_record.check_in, v_record.check_out, v_schedule);
    
    -- Calcular horas con segmentación por tipo (diurno/nocturno/feriado)
    -- ... lógica de cálculo con porcentajes 25%, 50%, 75% ...
    
    -- Insertar/actualizar cálculo con campos separados
    -- ... INSERT ON CONFLICT con overtime_diurno_hours, overtime_nocturno_hours, overtime_feriado_hours ...
    
    -- Retornar resultado
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;
```

## Flujo de Cálculo de Nómina

### Paso 1: Obtener Valores Base (Capa 1 → Capa 2)

```sql
-- Función: resolve_payroll_config(company_id, employee_id)
-- 1. Buscar company_payroll_configs (Capa 2)
-- 2. Si no existe, usar valores de labor_laws (Capa 1)
-- 3. Para frecuencia de pago: company_payroll_configs → work_schedules → labor_laws
```

### Paso 2: Calcular Horas de Asistencia

```sql
-- OPTIMIZACIÓN: Usar función batch con cache
-- 1. Cargar labor_laws UNA VEZ (no en loop)
-- 2. Procesar todos los registros del período en batch
-- 3. Usar work_schedules del empleado (Capa 2)
-- 4. Fallback a labor_laws si no hay schedule (Capa 1)
-- 5. Segmentar normal_hours vs overtime por tipo (diurno/nocturno/feriado)
-- 6. Verificar feriados: company_metadata.custom_holidays → labor_laws.holidays
```

### Paso 3: Calcular Nómina Base

```sql
-- Usar attendance_hours_calculation para:
-- - Salario base proporcional a días trabajados
-- - Horas extras con porcentajes correctos:
--   * overtime_diurno_hours * 1.25 (25%)
--   * overtime_nocturno_hours * 1.50 (50%)
--   * overtime_feriado_hours * 1.75 (75%)
-- - Aplicar deducciones legales (ISR, IHSS, RAP) desde tax_brackets
```

### Paso 4: Aplicar Configuración de Empresa (Capa 2)

```sql
-- Usar company_payroll_configs.custom_fields para:
-- - Ingresos adicionales (bonos, comisiones, etc.)
-- - Deducciones adicionales (préstamos, cooperativa, etc.)
-- - Fórmulas personalizadas si calculation_type = 'formula_based'
```

### Paso 5: Aplicar Ajustes Específicos (Capa 3)

```sql
-- Usar payroll_adjustments para:
-- - Modificar horas trabajadas
-- - Modificar ingresos/deducciones específicos
-- - Guardar razón del ajuste
-- Actualizar payroll_run_lines.eff_* con valores finales
```

## Migraciones Requeridas

### Fase 1: Crear Capa 1 (Valores Legales)

1. **Crear tabla `labor_laws**`
  - Incluir valores Honduras 2026 según documentación proporcionada
  - Días festivos 2026 (11 días, incluyendo Semana Morazánica 7-9 octubre)
2. **Seed datos iniciales**
  - Insertar registro para 2026 con valores confirmados
  - Mantener valores pendientes (salario mínimo, techo IHSS) hasta confirmación oficial

### Fase 2: Extender Capa 2 (Configuración Empresa)

1. **Extender `work_schedules**`
  - Agregar campos de frecuencia de pago
  - Migrar datos existentes si aplica
2. **Extender `company_payroll_configs**`
  - Agregar campos de frecuencia de pago
  - Mantener compatibilidad con `custom_fields` existentes
3. **Crear `company_metadata**`
  - Solo para módulos sin tabla dedicada
  - NO incluir payroll_metadata (usar company_payroll_configs)

### Fase 3: Implementar Cálculo Detallado de Horas

1. **Crear tabla `attendance_hours_calculation**`
  - Relación con `attendance_records`
  - Campos para segmentación normal/overtime
2. **Crear función `calculate_attendance_hours()**`
  - Integrar con `work_schedules.break_duration`
  - Usar `labor_laws` como fallback
  - Segmentar horas normal vs overtime
3. **Crear función helper `calculate_expected_hours_for_date()**`
  - Obtener horas esperadas desde `work_schedules` para fecha específica
  - Considerar día de semana y horarios configurados

### Fase 4: Integrar con Cálculo de Nómina

1. **Modificar funciones de cálculo de nómina**
  - Usar `attendance_hours_calculation` en lugar de calcular directamente
  - Resolver configuración usando orden: Capa 2 → Capa 1
2. **Actualizar `payroll_run_lines**`
  - Incluir referencia a `attendance_hours_calculation`
  - Calcular horas extras desde `overtime_diurno_hours`, `overtime_nocturno_hours`, `overtime_feriado_hours`
  - Aplicar porcentajes correctos: 25%, 50%, 75%
3. **Mantener `payroll_adjustments**`
  - Ya implementado como Capa 3
  - Extender si es necesario para ajustar horas específicas

## Consideraciones de Implementación

### Integración con Schema Existente

- **NO agregar `payment_frequency` a `work_schedules**`: Es contractual, va en `employees`
- **NO duplicar `company_payroll_configs**`: Extender con frecuencia de pago (default empresa)
- **Usar `break_duration` de `work_schedules**`: No crear campo nuevo
- **Considerar `attendance_events**`: Para casos con múltiples eventos por día
- **Optimizar consultas SQL**: Evitar SELECT * en loops, usar batch functions con cache

### Resolución de Valores

Orden de precedencia:

1. **Capa 3** (`payroll_adjustments`) → Valores finales
2. **Capa 2** (`company_payroll_configs`, `work_schedules`) → Configuración empresa
3. **Capa 1** (`labor_laws`) → Valores legales por defecto

### Compatibilidad hacia atrás

- Empresas sin configuración operan con valores legales (Capa 1)
- Empresas con configuración existente siguen funcionando (Capa 2)
- Ajustes manuales existentes se mantienen (Capa 3)

## Archivos a Modificar

1. **Nuevas migraciones:**
  - `supabase/migrations/[timestamp]_create_labor_laws.sql` (con overtime por tipo: 25%, 50%, 75%)
  - `supabase/migrations/[timestamp]_add_payment_frequency_to_employees.sql` (NO a work_schedules)
  - `supabase/migrations/[timestamp]_extend_company_payroll_configs.sql`
  - `supabase/migrations/[timestamp]_create_company_metadata.sql` (con custom_holidays)
  - `supabase/migrations/[timestamp]_create_attendance_hours_calculation.sql` (con overtime separado)
  - `supabase/migrations/[timestamp]_create_attendance_hours_functions_batch.sql` (optimizada)
  - `supabase/migrations/[timestamp]_create_holiday_functions.sql` (is_holiday_date, determine_shift_type)
  - `supabase/migrations/[timestamp]_seed_labor_laws_2026.sql` (con feriados 2026)
  - `supabase/migrations/[timestamp]_create_cron_job_daily_calculation.sql` (cron para cálculo diario)
2. **Modificar funciones existentes:**
  - `lib/payroll-calculation-engine.ts`: Integrar resolución de capas
  - `pages/api/payroll/calculate.ts`: Usar `attendance_hours_calculation`
  - `lib/tax/honduras-tax.ts`: Mantener compatibilidad con `tax_brackets`
3. **Nuevas funciones helper:**
  - `lib/payroll/resolve-config.ts`: Resolver configuración por capas
  - `lib/attendance/calculate-hours.ts`: Wrapper para función SQL batch (con cache)
  - `lib/attendance/holiday-check.ts`: Verificar feriados (custom → legal)
  - `lib/cron/daily-attendance-calculation.ts`: Cron job para cálculo diario

## Testing

1. **Test Capa 1**: Empresa sin configuración usa valores legales
2. **Test Capa 2**: Empresa con configuración sobrescribe valores legales
3. **Test Capa 3**: Ajustes manuales sobrescriben cálculo automático
4. **Test integración**: Flujo completo de cálculo de nómina con 3 capas
5. **Test compatibilidad**: Empresas existentes siguen funcionando
6. **Test optimización**: Función batch procesa 11,000 registros sin hacer 11,000 SELECT *
7. **Test overtime**: Verificar cálculo correcto de 25%, 50%, 75% según tipo
8. **Test feriados**: Verificar sobrescritura de feriados por empresa
9. **Test cron job**: Verificar cálculo diario se ejecuta correctamente
10. **Test payment_frequency**: Verificar que está en employees, NO en work_schedules

## Correcciones Críticas Aplicadas

### 1. Optimización SQL (Evitar SELECT * en loops)

- **Problema**: Función original hacía 11,000 consultas (500 empleados × 22 días)
- **Solución**: Función batch `calculate_attendance_hours_batch()` con parámetros pre-cargados
- **Cache**: `labor_laws` se carga UNA VEZ, no por cada registro

### 2. Separación de Overtime por Tipo

- **Problema**: Solo había un campo `overtime_hours` genérico
- **Solución**: Separar en `overtime_diurno_hours` (25%), `overtime_nocturno_hours` (50%), `overtime_feriado_hours` (75%)
- **Cumplimiento**: Permite aplicar porcentajes correctos de ley hondureña automáticamente

### 3. payment_frequency NO en work_schedules

- **Problema**: Horario es físico, frecuencia de pago es contractual
- **Solución**: `payment_frequency` va en `employees` (contractual), NO en `work_schedules` (físico)
- **Razón**: Un empleado puede cambiar de horario pero mantener su frecuencia de pago

### 4. Trigger de Cálculo (NO en cada webhook)

- **Problema**: Recalcular en cada evento del biométrico es ineficiente
- **Solución**: Ejecutar cálculo:
  - Al final del día (cron job)
  - Cuando admin abre pantalla de revisión (on-demand)
  - Cuando se corrige asistencia manualmente (trigger)

### 5. Feriados Dinámicos (Sobrescritura por empresa)

- **Problema**: Algunas empresas trabajan feriados y dan día después o pagan doble
- **Solución**: `company_metadata.custom_holidays` sobrescribe `labor_laws.holidays`
- **Función**: `is_holiday_date()` verifica primero custom_holidays, luego labor_laws

### 6. JSONB en company_metadata (Solo para datos no críticos)

- **Problema**: JSONB es lento para filtros/reportes
- **Solución**: Solo usar JSONB para preferencias UI/flags menores
- **Regla**: Si el dato es vital para cálculo o filtros, usar columna real

