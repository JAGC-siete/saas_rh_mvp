# Funcionamiento del SaaS por capas

Documento de referencia para entender cómo opera el sistema de nómina y asistencia en 3 capas. Sirve como base para el onboarding de clientes nuevos.

---

## Resumen de las 3 capas

| Capa | Nombre | Origen | Uso |
|------|--------|--------|-----|
| **1** | Valores legales por defecto | `labor_laws` (país/año) | Sin configuración del cliente, el sistema opera conforme a ley (Honduras 2026). |
| **2** | Configuración por empresa | `company_metadata`, `company_payroll_configs`, `employees`, `work_schedules` | La empresa (y opcionalmente cada empleado) sobrescribe o completa lo que aplica de la Capa 1. |
| **3** | Ajustes al momento del cálculo | `attendance_hours_calculation`, `payroll_run_lines.eff_*`, `payroll_adjustments` | Resultados calculados y ajustes manuales por período/empleado. |

**Regla de resolución:** Capa 3 > Capa 2 > Capa 1. Si no hay valor en una capa, se usa el de la capa inferior.

---

## Capa 1: Valores legales por defecto

**Tabla:** `labor_laws`  
**Alcance:** Por país y año (ej. Honduras 2026).  
**Quién lo administra:** Solo super_admin (datos de referencia legal).

### Qué contiene

- **Jornada laboral**
  - `legal_daily_hours`: horas máximas por día (ej. 8).
  - `legal_weekly_hours`: horas máximas por semana (ej. 44).
  - `legal_weekly_days`: días laborales por semana (ej. 6).

- **Horas extraordinarias (Honduras)**
  - `overtime_threshold_hours`: a partir de cuántas horas diarias se consideran extras (ej. 8).
  - `overtime_diurno_rate`: multiplicador hora extra diurna (ej. 1.25 = +25%).
  - `overtime_nocturno_rate`: multiplicador hora extra nocturna (ej. 1.50 = +50%).
  - `overtime_feriado_rate`: multiplicador hora extra feriado/mixto (ej. 1.75 = +75%).

- **Descansos**
  - `mandatory_break_minutes`: descanso obligatorio en minutos (ej. 30).
  - `break_required_after_hours`: después de cuántas horas se exige descanso (ej. 5).
  - `minimum_rest_between_shifts_hours`: descanso mínimo entre jornadas en horas (ej. 10).

- **Valores fiscales (fallback)**
  - `minimum_wage`, `ihss_ceiling`, `ihss_employee_rate`, `rap_rate`.  
  El cálculo de nómina usa preferentemente `tax_brackets` por año; `labor_laws` sirve de respaldo.

- **Feriados**
  - `holidays`: array JSONB de fechas y nombres (ej. Año Nuevo, Semana Santa, Semana Morazánica, etc.).

### Cómo se usa en el sistema

- Las funciones de cálculo de horas (`calculate_attendance_hours_batch`) cargan **una vez** la fila de `labor_laws` para el año del período y usan esos valores cuando no hay configuración de empresa/empleado.
- Feriados: si la empresa no define `custom_holidays`, se usan los de `labor_laws.holidays` para marcar días festivos y aplicar la tasa de hora extra feriado (+75%).

**El cliente no configura la Capa 1.** Es el piso legal; la configuración del cliente vive en la Capa 2.

---

## Capa 2: Configuración por empresa (y por empleado)

Aquí se define todo lo que el cliente puede elegir para su empresa y, donde aplique, por empleado.

### 2.1 Empresa y usuarios

- **`companies`**: nombre, subdominio, plan, activo.
- **`user_profiles`**: usuarios que acceden al sistema y su `company_id`, rol (company_admin, hr_manager, etc.).
- **`organization_members`** / invitaciones: quién pertenece a la organización.

No son “capas” de nómina/asistencia, pero son previos: sin empresa y usuarios no se puede configurar nada por cliente.

### 2.2 Nómina por empresa: `company_payroll_configs`

**Uno por empresa** (relación 1:1 con `companies`).  
Orden de resolución para **frecuencia de pago**:  
`employees.payment_frequency` → `company_payroll_configs.payment_frequency` → default **mensual**.

Campos relevantes para onboarding:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `payment_frequency` | `'quincenal' \| 'mensual'` | Frecuencia de pago por defecto de la empresa. |
| `payment_day` | 1–31 o null | Día del mes para pago (si aplica mensual). |
| `quincena_config` | JSONB | Cortes de quincena: `first_start`, `first_end`, `second_start`, `second_end` (por defecto 1–15 y 16–30). |
| `calculation_type` | texto | Tipo de cálculo (estándar, fórmula, etc.). |
| `custom_fields` | JSONB | Campos extra en nómina (ej. bonos, deducciones específicas). |
| `calculation_config` | JSONB | Parámetros del motor de cálculo. |
| `metadata` | JSONB | Otros parámetros (ej. legacy `payment_frequency` si se migra). |

Si no se configura nada, el sistema asume **mensual** y cortes de quincena estándar cuando se use nómina quincenal en algún empleado.

### 2.3 Frecuencia de pago por empleado: `employees`

**Opcional por empleado.** Si se quiere que un empleado tenga frecuencia distinta a la de la empresa:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `payment_frequency` | `'quincenal' \| 'mensual'` | Sobrescribe la frecuencia de la empresa para ese empleado. |
| `payment_day` | 1–31 o null | Día de pago (si aplica). |
| `quincena_config` | JSONB | Cortes de quincena solo para ese empleado (poco común). |

Regla: **empleado > empresa > mensual**.

### 2.4 Horarios físicos: `work_schedules`

**No** llevan frecuencia de pago (eso es contractual en Capa 2 en `company_payroll_configs` / `employees`).  
Definen **a qué hora se trabaja** cada día.

- Por día: `monday_start`/`monday_end`, …, `sunday_start`/`sunday_end`.
- `break_duration`: minutos de descanso (almuerzo); se usa en el cálculo de horas netas.
- `timezone`: ej. `America/Tegucigalpa`.
- Opcionales: `grace_minutes`, `checkin_open`/`checkin_close`, `work_days` (JSONB), etc.

Cada **empleado** puede tener un `work_schedule_id`. Si no tiene horario asignado, el cálculo de horas esperadas puede usar `legal_daily_hours` de la Capa 1.

### 2.5 Feriados y metadata por empresa: `company_metadata`

**Uno por empresa.**  
Feriados: **`company_metadata.custom_holidays`** sustituye a `labor_laws.holidays` para esa empresa.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `custom_holidays` | JSONB | Lista de feriados: `date`, `name`, `is_working`, `pay_double`, etc. Si está vacía o null, se usan los de `labor_laws`. |
| `employees_metadata` | JSONB | Preferencias/metadata de módulo empleados (no crítico para cálculo). |
| `attendance_metadata` | JSONB | Preferencias de asistencia (no crítico para cálculo). |
| `schedules_metadata` | JSONB | Metadata de horarios (no crítico para cálculo). |

No se usa `payroll_metadata` aquí; nómina se configura en `company_payroll_configs`.

---

## Capa 3: Resultados y ajustes al momento del cálculo

### 3.1 Cálculo de horas: `attendance_hours_calculation`

Por cada registro de asistencia con `check_in` y `check_out` se puede tener **una fila** en esta tabla:

- Horas totales, horas normales.
- Horas extra segmentadas: **diurno**, **nocturno**, **feriado** (según tipo de turno y si el día es feriado).
- Se usan las tasas de la Capa 1 (25%, 50%, 75%) para el cálculo de nómina.

Origen de los datos:

- Capa 1: `labor_laws` (horas legales, feriados, tasas).
- Capa 2: `work_schedules` (horas esperadas por día), `company_metadata.custom_holidays` (feriados de la empresa).

El cron diario y el endpoint de recalcular horas alimentan esta tabla; nómina lee desde aquí para pagar horas extra.

### 3.2 Nómina: `payroll_runs`, `payroll_run_lines`, `payroll_adjustments`

- **`payroll_run_lines`**: por empleado y período, valores calculados (`calc_*`) y efectivos (`eff_*`) tras ajustes.
- **`payroll_adjustments`**: ajustes manuales a una línea (Capa 3 explícita).

La lógica de nómina:

- Usa **Capa 2** para frecuencia de pago, cortes de quincena y campos custom.
- Usa **Capa 3** (`attendance_hours_calculation`) para horas normales y horas extra (diurno, nocturno, feriado) y aplica las tasas de la Capa 1 (1.25, 1.50, 1.75).
- Usa **`tax_brackets`** por año para ISR/IHSS/RAP; si faltara, podría usarse el fallback de `labor_laws`.

---

## Flujo resumido por módulo

1. **Asistencia**
   - Eventos → `attendance_records` (consolidado por empleado/día).
   - Cron o endpoint → `calculate_attendance_hours_batch` → escribe/actualiza `attendance_hours_calculation` usando Capa 1 (labor_laws) y Capa 2 (work_schedules, custom_holidays).

2. **Nómina**
   - Se eligen período y quincena (si aplica).
   - Frecuencia y cortes: empleado → `company_payroll_configs` → mensual.
   - Horas y overtime: lectura de `attendance_hours_calculation` (Capa 3) y tasas de Capa 1.
   - Impuestos: `tax_brackets` (año); fallback Capa 1 si hiciera falta.
   - Ajustes manuales: Capa 3 (`payroll_adjustments` → `eff_*`).

---

## Uso de este documento en onboarding

- **Capa 1:** Solo informativa para el cliente (ley vigente); no se “configura”.
- **Capa 2:** Es lo que se recoge en el checklist/cuestionario de cliente nuevo (empresa y, si aplica, excepciones por empleado).
- **Capa 3:** Se explica que los resultados y ajustes se generan al correr cálculos y que pueden editarse en pantalla según políticas del cliente.

El siguiente documento es el **Checklist / Cuestionario de configuración para cliente nuevo**, que traduce esta arquitectura en preguntas y tareas concretas para cada empresa (incluida la empresa ejemplo indicada).
