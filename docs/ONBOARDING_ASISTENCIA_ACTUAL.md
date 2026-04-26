# Asistencia: proceso actual y por qué no se ven almuerzos ni salidas

Cliente de referencia: `company_id = c4692355-9b0c-4a2c-8283-7c0b872b6831`  
Problema reportado: **ven horas de entrada pero no almuerzos ni horas de salida.**

---

## 1. Qué hay hoy en el sistema (resumen)

| Dato | ¿Se captura? | ¿Dónde se guarda? | ¿Se muestra en UI? |
|------|----------------|-------------------|---------------------|
| **Entrada (check_in)** | Sí | `attendance_records.check_in` | Sí (portal empleado, EmployeeManager, reportes) |
| **Salida (check_out)** | Sí, pero condicionada (ver abajo) | `attendance_records.check_out` | Sí, cuando existe (mismo lugar que entrada) |
| **Almuerzo (inicio/fin)** | No como marcas | No hay columnas en `attendance_records` | No hay pantalla de “almuerzos” |
| **Duración de almuerzo** | Solo para cálculo interno | `work_schedules.break_duration`; `attendance_hours_calculation.lunch_minutes` | No se muestra en listados de asistencia |

Conclusión: **almuerzos** no se “ven” porque el producto hoy no captura ni muestra marcas de almuerzo; solo usa una duración fija del horario para descontar en el cálculo de horas. **Salida** puede no verse si el segundo evento del dispositivo no se está clasificando como salida o si faltan horarios asignados.

---

## 2. Proceso actual de configuración para este cliente

Para que la asistencia funcione bien (entrada + salida) con el flujo actual:

1. **Empresa**
   - `companies.id` = `c4692355-9b0c-4a2c-8283-7c0b872b6831` (ya existe si el cliente accede).

2. **Dispositivo / webhook**
   - En `devices`: registro con `company_id` de esta empresa, webhook configurado y activo.
   - Los eventos del reloj (Hikvision) llegan al endpoint de webhook de asistencia.

3. **Empleados**
   - Cada empleado debe tener:
     - `pay_type`: `'fixed'` (administrativo) o `'hourly'` (por hora).
     - **`work_schedule_id`** asignado (obligatorio para empleados **fixed** si se quiere que el webhook infiera entrada vs salida).
   - Relación empleado–dispositivo: por `employee_aliases` o por identificación en el payload del dispositivo (según cómo esté mapeado).

4. **Horarios (`work_schedules`)**
   - Al menos un horario por empresa con `company_id` = este cliente.
   - Campos por día (ej. `monday_start`, `monday_end`, …, `sunday_start`, `sunday_end`) y `break_duration` (minutos de descanso/almuerzo usado solo en cálculo, no en pantalla).
   - Cada empleado fixed con `work_schedule_id` apuntando a uno de estos horarios.

5. **Cálculo de horas (opcional pero recomendado)**
   - Cron diario o endpoint de “recalcular horas” rellenan `attendance_hours_calculation` para registros que tengan **check_in y check_out**.
   - Esos datos se usan en nómina (horas normales y extras). Si no hay check_out, no se genera fila en `attendance_hours_calculation` para ese día.

Nada de lo anterior configura ni muestra “almuerzos” como concepto visible; solo entrada, salida y, en backend, descuento por `break_duration`.

---

## 3. Por qué el cliente ve entrada pero no salida

El webhook de asistencia trata de forma distinta a empleados **fixed** y **hourly**.

### Empleados fixed (administrativos)

- **Primera marca del día:**  
  Si cae dentro de una ventana de ±1 hora respecto a la **hora esperada de entrada** (según `work_schedules` del empleado), se crea un registro con `check_in` y `check_out = null`.

- **Segunda marca del día:**  
  Si ya existe un registro del día con `check_out` null, y la marca cae dentro de ±1 hora respecto a la **hora esperada de salida**, se actualiza ese registro con `check_out`.

Si el cliente **solo ve entrada**:

1. **Falta `work_schedule_id` en el empleado**  
   El código no puede calcular `expected_check_in` / `expected_check_out` y hace `return` sin guardar nada en algunos flujos; para fixed explícitamente dice: *"No work_schedule_id, cannot infer check_in/check_out"*. En la práctica, sin horario a veces solo se llega a guardar entrada por otros caminos, pero la salida no se infiere.

2. **El dispositivo solo envía un evento por día**  
   Por ejemplo solo “entrada”; entonces nunca hay segunda marca para rellenar `check_out`.

3. **La segunda marca llega fuera de la ventana de salida**  
   Si el empleado sale mucho antes o mucho después de la hora esperada (más de 1 hora), el webhook no considera esa marca como salida y no actualiza `check_out`.

4. **Webhook no recibe el evento de salida**  
   Fallo de red, dispositivo o filtros en el reloj; el segundo evento nunca llega al servidor.

### Empleados hourly (por hora)

- Se asume: primera marca = entrada, siguiente marca (dentro de 30 h) = salida. No dependen de `work_schedules` para inferir entrada/salida.
- Si el cliente usa solo empleados fixed y no hourly, lo anterior (fixed) es lo que aplica.

---

## 4. Por qué el cliente no ve “almuerzos”

- En **base de datos**:  
  `attendance_records` **sí** tiene columnas `lunch_start` y `lunch_end` (desde migración `20260212000001`).  
  Se usan en el flujo de 4 marcas biométricas. Para empresas sin ese flujo: `work_schedules.break_duration`, `attendance_hours_calculation.lunch_minutes`.

- En **UI**:  
  No hay ninguna pantalla ni columna que muestre “inicio de almuerzo”, “fin de almuerzo” o “almuerzo” en listados o detalle de asistencia.  
  La “duración del almuerzo” solo aparece en **Configuración de empresa → Horarios** (`CompanySettings`) como `break_duration` del horario, no por día ni por registro.

Por tanto, para empresas **sin** flujo 4 marcas es esperado no ver almuerzos como marcas; el sistema usa `break_duration` fijo. Para empresas **con** flujo 4 marcas, sí se capturan y muestran.

---

## 5. Qué revisar para este cliente (checklist)

- [ ] **Empleados con `work_schedule_id`**  
  Consultar: `SELECT id, name, work_schedule_id, pay_type FROM employees WHERE company_id = 'c4692355-9b0c-4a2c-8283-7c0b872b6831'`.  
  Los fixed que usan reloj deben tener `work_schedule_id` no nulo.

- [ ] **Horarios creados para la empresa**  
  `SELECT id, name, monday_start, monday_end, break_duration FROM work_schedules WHERE company_id = 'c4692355-9b0c4a2c-8283-7c0b872b6831'`.  
  Debe haber al menos uno con entradas/salidas por día y `break_duration` si aplica.

- [ ] **Registros recientes: cuántos tienen solo check_in**  
  `SELECT date, check_in, check_out FROM attendance_records ar JOIN employees e ON e.id = ar.employee_id WHERE e.company_id = 'c4692355-9b0c-4a2c-8283-7c0b872b6831' AND ar.date >= CURRENT_DATE - 7 ORDER BY ar.date DESC`.  
  Si la mayoría tienen `check_out` null, el problema es de captura de salida (horarios, ventanas o dispositivo).

- [ ] **Dispositivo y webhook**  
  En `devices`: que el reloj de esta empresa esté dado de alta, activo y con URL de webhook correcta; revisar logs del webhook para ver si llegan uno o dos eventos por empleado/día.

- [ ] **Ventanas de tiempo**  
  Si la política es estricta, confirmar con el cliente si la hora real de salida suele estar dentro de ±1 h de la hora configurada en el horario; si no, valorar ampliar ventanas o flexibilizar la lógica (cambio de código).

---

## 6. Resumen: qué está en marcha ahora

- **Entrada:** se guarda en `attendance_records.check_in` y se muestra en portal, EmployeeManager y reportes.
- **Salida:** se guarda en `attendance_records.check_out` cuando el webhook clasifica una segunda marca como salida (fixed: con horario asignado y dentro de ventana; hourly: segunda marca dentro de 30 h). Si no se cumplen esas condiciones, `check_out` queda null y el cliente no ve hora de salida.
- **Almuerzos:** no se capturan como marcas ni se muestran en ninguna pantalla; solo se usa una duración fija (`break_duration`) en el cálculo de horas netas.

Para que el cliente vea **salidas**, hay que asegurar horarios asignados, que el dispositivo envíe dos eventos por día y que la salida caiga en la ventana esperada (o ajustar lógica/ventanas).

**Excepción: cliente con flujo de 4 marcas**  
Para la empresa `company_id = c4692355-9b0c-4a2c-8283-7c0b872b6831` está implementado un flujo específico de **4 marcas biométricas por día**: 1ª = entrada, 2ª = inicio almuerzo, 3ª = fin almuerzo, 4ª = salida. El almuerzo no es hora fija (puede ser 12, 1 o 2 pm). El sistema interpreta el **orden** del evento: segunda marca del día = inicio almuerzo, tercera = fin almuerzo, cuarta = salida. Se usan las columnas `attendance_records.lunch_start` y `attendance_records.lunch_end`; la UI muestra "Inicio almuerzo" y "Fin almuerzo" cuando existen. El cálculo de horas (`attendance_hours_calculation`) usa la duración real de almuerzo (lunch_end - lunch_start) cuando están presentes.
