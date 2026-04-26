# Checklist y Cuestionario de Configuración — Cliente Nuevo

Proceso estándar para completar la configuración de un cliente nuevo en el SaaS. Usar este documento por cada empresa; marcar ítems al completarlos.

**Cliente de ejemplo en este documento:**  
`company_id`: `c4692355-9b0c-4a2c-8283-7c0b872b6831`

---

## 1. Datos generales de la empresa

| # | Tarea / Pregunta | Respuesta / Notas | ✓ |
|---|-------------------|-------------------|---|
| 1.1 | Nombre legal de la empresa | | |
| 1.2 | Subdominio deseado (ej. `empresa.humanosisu.com`) | | |
| 1.3 | País / moneda (por defecto Honduras / HNL) | | |
| 1.4 | Año fiscal de referencia para nómina (ej. 2026) | | |

---

## 2. Usuarios y acceso (Capa 2 — organización)

| # | Tarea / Pregunta | Respuesta / Notas | ✓ |
|---|-------------------|-------------------|---|
| 2.1 | Email del primer administrador (company_admin) | | |
| 2.2 | ¿Más usuarios admin o RRHH desde el inicio? (emails y roles) | | |
| 2.3 | Usuarios creados en Supabase Auth y `user_profiles` con `company_id` correcto | | |
| 2.4 | Verificar que cada usuario puede iniciar sesión y ve solo su empresa | | |

---

## 3. Nómina — Frecuencia de pago (Capa 2)

**Orden de resolución:** empleado → empresa → mensual.

| # | Pregunta | Opciones | Respuesta | ✓ |
|---|----------|----------|-----------|---|
| 3.1 | ¿Cómo paga la empresa por defecto? | Mensual / Quincenal | | |
| 3.2 | Si es **mensual**: ¿qué día del mes se paga? (1–31) | | | |
| 3.3 | Si es **quincenal**: ¿cortes de quincena? | Estándar 1–15 y 16–30 / Personalizado | | |
| 3.4 | Si es personalizado: día inicio Q1, día fin Q1, día inicio Q2, día fin Q2 | Ej. 1, 15, 16, 30 | | |
| 3.5 | ¿Algunos empleados tienen frecuencia distinta a la empresa? (lista o “No”) | | | |

**Configuración en BD (empresa):**

- `company_payroll_configs` para `company_id = c4692355-9b0c-4a2c-8283-7c0b872b6831`:
  - [ ] Existe fila en `company_payroll_configs` para este `company_id`.
  - [ ] `payment_frequency` = `'mensual'` o `'quincenal'`.
  - [ ] `payment_day` (si mensual).
  - [ ] `quincena_config` = `{ "first_start": _, "first_end": _, "second_start": _, "second_end": _ }` si aplica.

---

## 4. Nómina — Campos y reglas de cálculo (Capa 2)

| # | Pregunta | Respuesta / Notas | ✓ |
|---|----------|-------------------|---|
| 4.1 | ¿Tipo de cálculo de nómina? | Estándar / Fórmula / Custom (describir) | | |
| 4.2 | ¿Campos extra en nómina? (bonos, deducciones, conceptos) | Nombres y tipo (número, texto, etc.) | | |
| 4.3 | ¿Deducciones específicas de la empresa además de ISR/IHSS/RAP? | | | |
| 4.4 | ¿Bonos o incentivos que se repiten por período? | | | |

**Configuración en BD:**

- [ ] `company_payroll_configs.calculation_type` definido.
- [ ] `company_payroll_configs.custom_fields` (JSONB) con estructura acordada si aplica.
- [ ] `company_payroll_configs.calculation_config` o `metadata` si hay reglas especiales.

---

## 5. Horarios de trabajo (Capa 2 — work_schedules)

**Un empleado puede tener un solo horario asignado (`work_schedule_id`).** La empresa puede tener varios horarios (oficina, turno mañana, turno noche, etc.).

| # | Pregunta | Respuesta / Notas | ✓ |
|---|----------|-------------------|---|
| 5.1 | ¿Cuántos horarios distintos hay? (ej. 1 oficina, 1 turno noche) | | |
| 5.2 | Por cada horario: nombre identificador (ej. "Oficina L–V 8–17", "Turno noche") | | |
| 5.3 | Días que se trabaja (L–V, L–S, etc.) y hora entrada/salida por día si varía | | |
| 5.4 | Minutos de descanso/almuerzo por jornada (ej. 60) | | |
| 5.5 | Zona horaria (por defecto America/Tegucigalpa) | | |

**Configuración en BD:**

- [ ] Registros en `work_schedules` con `company_id = c4692355-9b0c-4a2c-8283-7c0b872b6831`.
- [ ] Cada empleado tiene `work_schedule_id` asignado (o se define regla para “sin horario”).

---

## 6. Feriados y días especiales (Capa 2)

| # | Pregunta | Respuesta / Notas | ✓ |
|---|----------|-------------------|---|
| 6.1 | ¿Usar feriados nacionales por defecto (Honduras 2026)? | Sí / No | | |
| 6.2 | Si No o “además”: ¿feriados o días no laborables propios de la empresa? | Fechas y nombres | | |
| 6.3 | ¿Algún feriado nacional la empresa lo trabaja y paga doble? (listar) | | | |

**Configuración en BD:**

- [ ] Si solo nacionales: no crear `company_metadata` o dejar `custom_holidays` = `[]` (se usan `labor_laws.holidays`).
- [ ] Si hay propios o cambios: crear/actualizar `company_metadata` para este `company_id` con `custom_holidays` (array de objetos con `date`, `name`, y si aplica `is_working`, `pay_double`).

---

## 7. Asistencia y dispositivos

| # | Pregunta | Respuesta / Notas | ✓ |
|---|----------|-------------------|---|
| 7.1 | ¿Registro de asistencia por app web, reloj biométrico, otro? | | | |
| 7.2 | Si hay dispositivo (ej. Hikvision): ¿integración webhook ya configurada? | Sí / No / N/A | | |
| 7.3 | ¿Empleados por hora (pay_type = hourly) que requieren check_in y check_out para calcular pago? | Lista o “Todos fijos” | | |

**Configuración en BD:**

- [ ] Empleados con `pay_type` = `'fixed'` o `'hourly'` según corresponda.
- [ ] Si aplica: dispositivos registrados en `devices` con `company_id` correcto y webhook/configuración verificada.

---

## 8. Empleados iniciales

| # | Tarea | Respuesta / Notas | ✓ |
|---|--------|-------------------|---|
| 8.1 | ¿Carga inicial de empleados? (número aproximado) | | |
| 8.2 | Origen de datos (Excel, manual, migración) | | |
| 8.3 | Por cada empleado: al menos nombre, DNI, salario, departamento, horario (`work_schedule_id`), frecuencia de pago si distinta a la empresa | | |
| 8.4 | Empleados con `payment_frequency` distinta a la empresa actualizados en `employees` | | |

---

## 9. Verificación post-configuración

| # | Verificación | ✓ |
|---|---------------|---|
| 9.1 | Login con usuario de la empresa y acceso solo a su compañía | |
| 9.2 | Nómina: período de prueba (ej. mes actual) con al menos un empleado; frecuencias y cortes correctos | |
| 9.3 | Asistencia: al menos un registro de prueba; cálculo de horas (normal + overtime) si aplica | |
| 9.4 | Feriados: un día feriado de prueba aparece como feriado y hora extra con tasa correcta si se trabaja | |
| 9.5 | Reportes o exportaciones que use el cliente (PDF, Excel) abren y muestran datos de la empresa | |

---

## 10. Resumen de configuración — Cliente ejemplo

**Company ID:** `c4692355-9b0c-4a2c-8283-7c0b872b6831`

| Área | Configurado | Notas |
|------|-------------|--------|
| Empresa (nombre, subdominio) | | |
| Usuarios y roles | | |
| company_payroll_configs (payment_frequency, quincena_config) | | |
| work_schedules | | |
| company_metadata (custom_holidays) | | |
| Empleados (cantidad, pay_type, work_schedule_id, payment_frequency) | | |
| Dispositivos / webhook asistencia | | |
| Prueba de nómina y asistencia | | |

---

## Uso del checklist

1. Copiar este documento (o duplicar la sección 10) por cada cliente nuevo.
2. Sustituir el `company_id` de ejemplo por el de la nueva empresa.
3. Completar preguntas con el cliente (reunión o formulario).
4. Ejecutar las tareas en BD/UI y marcar los checkboxes.
5. Dejar el resumen (sección 10) lleno como referencia rápida para soporte y siguientes años.

**Referencia de capas:** ver `docs/ONBOARDING_SAAS_POR_CAPAS.md` para el detalle de qué tabla corresponde a cada capa y cómo se resuelve la configuración.
