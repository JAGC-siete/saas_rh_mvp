# Fix: Conversión Incorrecta de Timezone en check_in

## Problema Identificado

### Síntoma
- Los empleados ingresan a las **7:00 AM** en Honduras
- En el dashboard se muestra **"00:55"** en lugar de **"07:00"**
- En la consulta SQL, `check_in_honduras` muestra **"12:08:24"** cuando debería mostrar **"00:08:24"**

### Causa Raíz

**1. Conversión SQL Incorrecta:**
```sql
-- ❌ INCORRECTO (agrega 6 horas en lugar de restarlas)
TO_CHAR(check_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa', 'HH24:MI:SS')
```

**2. Función `convertToHondurasTime()` Incorrecta:**
```typescript
// ❌ INCORRECTO: Resta 6 horas manualmente
export function convertToHondurasTime(utcTimestamp: string | Date): Date {
  const hondurasOffsetMs = 6 * 60 * 60 * 1000;
  const hondurasTime = new Date(date.getTime() - hondurasOffsetMs);
  return hondurasTime;
}
```

**Problema:** Esta función está diseñada para "convertir" un timestamp UTC a hora local de Honduras, pero lo hace incorrectamente. Cuando se usa con `.toISOString()`, se guarda un timestamp que ya fue "convertido" incorrectamente.

### Flujo del Problema

1. **Dispositivo envía:** `2025-12-10T13:00:00Z` (7:00 AM Honduras = 13:00 UTC)
2. **`parseDeviceDateTime()` con timezone:** Usa `convertToHondurasTime()` que resta 6 horas
3. **Resultado:** `2025-12-10T07:00:00Z` (timestamp incorrecto)
4. **Se guarda en BD:** `07:00:00 UTC`
5. **Frontend convierte:** `07:00 UTC` → `01:00 Honduras` (incorrecto!)
6. **Debería mostrar:** `07:00 Honduras`

## Solución

### 1. Corregir Conversión SQL

**❌ Incorrecto:**
```sql
TO_CHAR(check_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa', 'HH24:MI:SS')
```

**✅ Correcto:**
```sql
-- Opción 1: Conversión directa (recomendado)
TO_CHAR(check_in AT TIME ZONE 'America/Tegucigalpa', 'HH24:MI:SS')

-- Opción 2: Usando timezone() function
TO_CHAR(timezone('America/Tegucigalpa', check_in), 'HH24:MI:SS')
```

### 2. Corregir `parseDeviceDateTime()` en webhook

El problema está en que cuando el dispositivo envía un timestamp CON zona horaria (UTC), se está usando `convertToHondurasTime()` que resta horas incorrectamente.

**Solución:** Si el timestamp viene en UTC, NO convertirlo, guardarlo directamente. El frontend ya hace la conversión correcta con `toLocaleTimeString()`.

### 3. Verificar que `formatTimeDisplay()` es Correcto

El frontend ya está usando la conversión correcta:
```typescript
date.toLocaleTimeString('es-HN', {
  timeZone: HONDURAS_TIMEZONE, // 'America/Tegucigalpa'
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});
```

Esto funciona correctamente si el timestamp en la BD está en UTC.

## Plan de Corrección

1. **Corregir `parseDeviceDateTime()`:** No usar `convertToHondurasTime()` cuando el timestamp viene en UTC
2. **Verificar timestamps existentes:** Los timestamps ya guardados pueden estar incorrectos
3. **Actualizar consultas SQL:** Corregir cualquier conversión SQL incorrecta
4. **Probar:** Verificar que los nuevos registros se muestren correctamente

## Verificación

Para verificar que la corrección funciona:

```sql
-- Verificar timestamps actuales
SELECT 
  id,
  employee_id,
  date,
  check_in,
  -- Conversión correcta
  TO_CHAR(check_in AT TIME ZONE 'America/Tegucigalpa', 'HH24:MI:SS') as check_in_honduras_correcto,
  -- Conversión incorrecta (para comparar)
  TO_CHAR(check_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa', 'HH24:MI:SS') as check_in_honduras_incorrecto
FROM attendance_records
WHERE date = CURRENT_DATE
ORDER BY check_in
LIMIT 10;
```

Si los empleados ingresan a las 7:00 AM:
- `check_in` debería ser aproximadamente `13:00:00 UTC` (7:00 AM + 6 horas)
- `check_in_honduras_correcto` debería mostrar `07:00:00`
- `check_in_honduras_incorrecto` mostrará `13:00:00` (incorrecto)

