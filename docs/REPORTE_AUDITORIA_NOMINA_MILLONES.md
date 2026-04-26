# Reporte de Auditoría: Error de los Millones en Nómina

**Fecha:** 27 Feb 2026  
**Objetivo:** Detectar el punto exacto de inflación antes de aplicar correcciones.

---

## 1. Resumen Ejecutivo

**Hipótesis confirmada:** El error ocurre cuando `base_salary` almacena el **salario mensual** pero el sistema lo interpreta como **tarifa por hora** para empleados `pay_type === 'hourly'`.

**Fórmula que causa el salto a millones:**
```
total_earnings = total_hours_worked × hourly_rate
```
Donde `hourly_rate = base_salary` (sin validación de unidad).

Si `base_salary = 12,937.80` (mensual) y `total_hours_worked = 127.44`:
```
total_earnings = 127.44 × 12,937.80 = 1,648,889.23  ← ERROR
```

---

## 2. Auditoría de Valores Iniciales

### 2.1 Origen de `hourly_rate` y `total_hours_worked`

| Variable | Archivo | Líneas | Origen |
|----------|---------|--------|--------|
| `base_salary` | `preview.ts` | 610 | `Number(emp.base_salary) \|\| 0` — columna `employees.base_salary` |
| `hourly_rate` | `preview.ts` | 829-832 | `emp.pay_type === 'hourly' ? base_salary : base_salary / horasMensualesEstimadas` |
| `total_hours_worked` | `preview.ts` | 811-823 | `attendance_hours_calculation.total_hours` o `calculateHoursWorked(registros)` |

### 2.2 Punto crítico: asignación de `hourly_rate`

```829:833:pages/api/payroll/preview.ts
        const horasMensualesEstimadas = paymentFrequency === 'monthly' ? 240 : 120
        const hourly_rate = emp.pay_type === 'hourly'
          ? base_salary
          : (horasMensualesEstimadas > 0 ? base_salary / horasMensualesEstimadas : 0)
```

**Problema:** Para `pay_type === 'hourly'`, `hourly_rate = base_salary` sin ninguna conversión. El código asume que `base_salary` ya es la tarifa por hora. Si el usuario o una migración guardó el salario mensual en ese campo, el valor es incorrecto.

---

## 3. Investigación del "Factor Millonario"

### 3.1 Flujo de inflación (preview.ts)

| Paso | Variable | Fórmula | Ejemplo con base_salary=12,937.80 (mensual) |
|------|----------|---------|---------------------------------------------|
| 1 | `hourly_rate` | `base_salary` | 12,937.80 (interpretado como L/hora) |
| 2 | `total_earnings` | `total_hours_worked × hourly_rate` | 127.44 × 12,937.80 = **1,648,889.23** |
| 3 | `baseParaDeducciones` | `hourly_rate × 176` | 12,937.80 × 176 = **2,277,052.80** |
| 4 | IHSS, RAP, ISR | Sobre `baseParaDeducciones` | Deducciones en millones |
| 5 | `deductionFactor` | `total_hours_worked / 88` | 127.44 / 88 ≈ 1.45 |
| 6 | Deducciones finales | `IHSS×factor`, `RAP×factor`, `ISR×factor` | Infladas proporcionalmente |

### 3.2 Fórmula matemática exacta del salto

```
total_earnings = total_hours_worked × base_salary
```

Cuando `base_salary` es mensual (ej. L15,000):
- Con 176 horas: `15,000 × 176 = 2,640,000` ← error clásico
- Con 127.44 horas: `15,000 × 127.44 = 1,911,600`

**La variable que se convierte en millones es `total_earnings`** (y secundariamente `baseParaDeducciones`).

---

## 4. Análisis de `deductionFactor`

### 4.1 Lógica actual (preview.ts:885-891)

```javascript
const horasPeriodo = paymentFrequency === 'monthly' ? 176 : 88
const deductionFactor = horasPeriodo > 0 ? total_hours_worked / horasPeriodo : 0
IHSS = IHSS * deductionFactor
RAP = RAP * deductionFactor
ISR = ISR * deductionFactor
```

### 4.2 Comportamiento con horas anormales

Si un empleado trabajó **200 horas** en una quincena (donde lo normal son 88h):
- `deductionFactor = 200 / 88 ≈ 2.27`
- Las deducciones (calculadas sobre una base ya errónea) se multiplican por 2.27
- **Problema:** La base `baseParaDeducciones = hourly_rate × 176` ya es incorrecta cuando `hourly_rate` es mensual. El `deductionFactor` solo amplifica el error.

### 4.3 Intención vs realidad

- **Intención:** Proporcionar deducciones según la fracción del período trabajada.
- **Realidad:** Si `baseParaDeducciones` está inflada (millones), las deducciones base son enormes y el factor las escala aún más.

---

## 5. Comparativa de Bases: preview.ts vs calculate.ts

| Aspecto | preview.ts | calculate.ts |
|---------|------------|--------------|
| Base para deducciones (hourly) | `hourly_rate × 176` | `total_earnings × periodosPorMes` |
| Línea | 864 | 388-391 |
| Problema | Usa `hourly_rate` que puede ser mensual | Usa `total_earnings` (ya inflado si hourly_rate es mensual) |

### 5.1 Discrepancia explicada

**preview.ts:**
```javascript
const baseParaDeducciones = emp.pay_type === 'hourly' ? hourly_rate * 176 : base_salary
```
- Asume: `hourly_rate` es L/hora → `hourly_rate × 176` = equivalente mensual.
- Si `hourly_rate` es mensual: `baseParaDeducciones` = salario_mensual × 176 = millones.

**calculate.ts:**
```javascript
const baseParaDeducciones = payType === 'hourly'
  ? total_earnings * periodosPorMes  // 2 si quincenal
  : base_salary
```
- Usa ingresos reales del período extrapolados a mensual.
- Si `total_earnings` ya está inflado (por hourly_rate erróneo), `baseParaDeducciones` también lo está.

**Conclusión:** Ambos archivos dependen de que `hourly_rate` / `total_earnings` sean correctos. El origen del error está en `hourly_rate = base_salary` cuando `base_salary` es mensual.

---

## 6. Hallazgos Clave

### 6.1 Valor justo antes de convertirse en millones

| Variable | Valor típico erróneo | Ubicación |
|----------|----------------------|-----------|
| `hourly_rate` | 12,937.80 (salario mensual) | preview.ts:831 |
| `total_earnings` | 1,648,889.23 | preview.ts:836 |
| `baseParaDeducciones` | 2,277,052.80 | preview.ts:864 |

### 6.2 Fórmula que causa el salto

```
total_earnings = total_hours_worked × base_salary
```
Cuando `base_salary` representa salario mensual en lugar de tarifa horaria.

### 6.3 El error de los 176

En preview.ts línea 864:
```javascript
baseParaDeducciones = hourly_rate * 176
```
- **Correcto** si `hourly_rate` es L/hora (ej. L73.51) → 73.51 × 176 ≈ L12,937.76.
- **Incorrecto** si `hourly_rate` es mensual (ej. L12,937.80) → 12,937.80 × 176 = L2,277,052.80.

### 6.4 Techos IHSS/RAP

- **IHSS:** `Math.min(baseParaDeducciones, 11903.13) * 0.05` — el techo limita IHSS base a 595.16, pero `baseParaDeducciones` inflada hace que RAP e ISR exploten.
- **RAP:** `(baseParaDeducciones - 11903.13) * 0.015` — sin techo efectivo cuando la base es millones.
- **ISR:** Tabla progresiva aplicada sobre base de millones → ISR en cientos de miles.

### 6.5 Inconsistencia en `horasMensualesEstimadas`

```javascript
const horasMensualesEstimadas = paymentFrequency === 'monthly' ? 240 : 120
```
- Honduras usa **176 h/mes** (22 días × 8h), no 240.
- Solo afecta al branch "legacy" (cuando `pay_type !== 'hourly'` y se deriva tarifa desde mensual).

---

## 7. Archivos Inspeccionados

| Archivo | Rol |
|---------|-----|
| `pages/api/payroll/preview.ts` | Lógica principal de generación de nómina (payroll_run_lines) |
| `pages/api/payroll/calculate.ts` | Cálculo alternativo (payroll_records) |
| `lib/payroll/calculate-period-base-salary.ts` | Helper: `base_salary × hours_worked` para hourly |
| `lib/tax/honduras-tax.ts` | IHSS, RAP, ISR con techos y tabla ISR |
| `components/AddEmployeeForm.tsx` | UI: "Tarifa por hora" para hourly, placeholder 50.00 |

---

## 8. Recomendaciones (sin implementar aún)

1. **Validación de unidad:** Detectar si `base_salary` para hourly parece mensual (ej. > 500) y convertir: `hourly_rate = base_salary / 176`.
2. **Campo explícito:** Considerar `hourly_rate` o `salary_type` en `employees` para evitar ambigüedad.
3. **Log de auditoría:** Registrar `base_salary`, `pay_type`, `hourly_rate`, `total_hours_worked` antes del cálculo para trazabilidad.
4. **Unificar preview.ts y calculate.ts:** Usar la misma base para deducciones y la misma lógica de `hourly_rate`.
5. **Corregir `horasMensualesEstimadas`:** Usar 176 en lugar de 240 para Honduras.

---

## 9. Tabla Progresiva ISR (SAR 2025)

La librería `honduras-tax.ts` ya incluye brackets. El primer tramo gravable empieza arriba de L21,457.76 mensuales netos (después de gastos médicos). No se requiere implementación adicional de tabla; el problema actual es la base inflada, no la fórmula ISR.
