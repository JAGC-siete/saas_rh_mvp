# Diagnóstico: Fechas desfasadas en reporte de asistencia

**Fecha del análisis:** 6 de marzo de 2026  
**Problema reportado:** Los registros que el reporte muestra con fecha "jueves 5 de marzo" corresponden en realidad al "viernes 6 de marzo". Otro ejemplo: registros mostrados como "domingo" corresponden al "lunes 2 de marzo".

---

## 1. Conclusión: ERROR DE CÓDIGO (no configuración)

La causa raíz es el **parseo incorrecto de fechas tipo `YYYY-MM-DD`** en JavaScript. No es un problema de configuración de dispositivos, base de datos ni timezone del servidor.

---

## 2. Configuración actual

### 2.1 Almacenamiento del campo `date`

- **Tabla:** `attendance_records`
- **Campo:** `date` (tipo `DATE` o `TEXT` en formato `YYYY-MM-DD`)
- **Significado:** Fecha calendario en hora de Honduras (America/Tegucigalpa)
- **Origen:** Calculada correctamente en los webhooks:
  - ZKTeco (`cdata.ts`): `toHN(eventTimestamp).date` → fecha en Honduras
  - Hikvision: `hondurasTime.date` → fecha en Honduras
  - Registro manual: `nowLocal.date` → fecha en Honduras

**Conclusión:** El valor almacenado en BD es correcto. Ej: `"2026-03-02"` = lunes 2 de marzo en Honduras.

### 2.2 Zona horaria del sistema

- **Timezone objetivo:** `America/Tegucigalpa` (UTC-6)
- **Configuración:** `lib/timezone.ts` define `HONDURAS_TIMEZONE = 'America/Tegucigalpa'`
- **Funciones de utilidad:** `formatTimeDisplay`, `formatDateForHonduras`, `getHondurasTime`, etc.

### 2.3 Flujo de generación del reporte

1. **Export Excel/CSV:** `pages/api/attendance/export.ts` → `exportToExcel`, `exportToCSV`
2. **Export reportes genéricos:** `pages/api/reports/export.ts` → usa `lib/reports/report-engine.ts`
3. **Export attendance específico:** `pages/api/reports/export-attendance.ts`
4. **PDF:** `lib/pdf/attendance-pdf-generator.ts`
5. **UI ReportBuilder:** `components/reports/ReportBuilder.tsx` + `lib/reports/report-engine.ts`

---

## 3. Causa raíz técnica

### Comportamiento de JavaScript

Según ECMAScript, `new Date("YYYY-MM-DD")` interpreta la cadena como **medianoche UTC**:

```
new Date("2026-03-02")  →  2026-03-02T00:00:00.000Z  (medianoche UTC)
```

En Honduras (UTC-6), medianoche UTC = **18:00 del día anterior**:

```
2026-03-02 00:00 UTC  =  2026-03-01 18:00 Honduras
```

Al formatear con `toLocaleDateString('es-HN', { timeZone: 'America/Tegucigalpa' })`, se muestra la fecha en Honduras → **1 de marzo (domingo)** en lugar de **2 de marzo (lunes)**.

### Variantes del bug en el código

| Forma usada | Interpretación | Resultado en Honduras |
|-------------|----------------|----------------------|
| `new Date(record.date)` | Medianoche UTC | Día anterior |
| `new Date(record.date + 'T00:00:00')` | Depende del entorno (local vs UTC) | Inconsistente |
| `new Date(record.date + 'T12:00:00-06:00')` | Mediodía Honduras | Correcto |

---

## 4. Archivos afectados

### 4.1 Reporte de asistencia (prioridad alta)

| Archivo | Líneas | Código problemático |
|---------|--------|----------------------|
| `pages/api/attendance/export.ts` | 216-217, 373-374 | `new Date(record.date).toLocaleDateString('es-HN')` |
| `pages/api/reports/export-attendance.ts` | 100, 177-178 | `new Date(r.date + 'T00:00:00')`, `new Date(record.date)` |
| `lib/reports/report-engine.ts` | 28 | `new Date(record.date + 'T00:00:00').toLocaleDateString('es-HN')` |
| `lib/pdf/attendance-pdf-generator.ts` | 396-404 | `new Date(dateString)` en `formatDate` (usa timeZone pero el Date ya está mal) |

### 4.2 Otros usos de fechas tipo date-only

| Archivo | Uso |
|---------|-----|
| `pages/employees/portal.tsx` | `new Date(record.date).toLocaleDateString('es-HN', ...)` |
| `pages/app/admin/analytics.tsx` | `formatDate(record.date)` |
| `components/attendance/TrendsChart.tsx` | `new Date(t.date + 'T00:00:00')` |

---

## 5. Solución recomendada

### 5.1 Función centralizada en `lib/timezone.ts`

Agregar una función que parsee `YYYY-MM-DD` como fecha local de Honduras:

```typescript
/**
 * Parsea una fecha YYYY-MM-DD como fecha calendario en Honduras.
 * Evita el bug de new Date("YYYY-MM-DD") que interpreta como medianoche UTC.
 */
export function parseDateOnlyAsHonduras(dateStr: string): Date {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(NaN)
  }
  // Mediodía Honduras evita edge cases cerca de medianoche
  return new Date(dateStr + 'T12:00:00-06:00')
}

/**
 * Formatea una fecha YYYY-MM-DD para mostrar en reportes (Honduras).
 */
export function formatDateOnlyForHonduras(dateStr: string): string {
  const d = parseDateOnlyAsHonduras(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-HN', {
    timeZone: HONDURAS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Obtiene el día de la semana en español para una fecha YYYY-MM-DD (Honduras).
 */
export function getWeekdayForDateOnly(dateStr: string): string {
  const d = parseDateOnlyAsHonduras(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-HN', {
    timeZone: HONDURAS_TIMEZONE,
    weekday: 'long'
  })
}
```

### 5.2 Reemplazos en los archivos afectados

- `new Date(record.date).toLocaleDateString('es-HN')` → `formatDateOnlyForHonduras(record.date)`
- `new Date(record.date).toLocaleDateString('es-HN', { weekday: 'long' })` → `getWeekdayForDateOnly(record.date)`
- `new Date(record.date + 'T00:00:00').toLocaleDateString('es-HN')` → `formatDateOnlyForHonduras(record.date)`

---

## 6. Verificación post-fix

1. Exportar reporte de asistencia para el rango 2–6 de marzo de 2026.
2. Verificar que registros del lunes 2 muestren "lunes" y "2/3/2026".
3. Verificar que registros del viernes 6 muestren "viernes" y "6/3/2026".
4. Revisar el caso de turnos que cruzan medianoche (entrada 06:02, salida 05:44 del día siguiente): la fecha mostrada debe ser la del día laboral según la política del negocio.

---

## 7. Nota sobre turnos que cruzan medianoche

En la captura, entradas tipo 06:02 y salidas 05:44 con ~23.7 horas trabajadas indican turnos nocturnos (ej. 06:02 lunes → 05:44 martes). La fecha del registro en BD suele ser la del día de entrada. Si la política es otra (ej. fecha del día de salida), eso sería configuración de negocio aparte.
