# Análisis: Formato de Hora en Dashboard de Attendance

## Problema Reportado
Los empleados ingresan a las 7:00 AM, pero en el dashboard se muestra "00:55" en lugar de "07:00" o similar.

## Análisis del Código

### 1. Componente que Muestra la Hora
**Archivo:** `components/attendance/ArrivalTable.tsx` (líneas 145-151)

```typescript
<div className="flex items-center gap-2 flex-shrink-0 ml-3">
  <span className={`text-sm font-medium ${row.color}`}>
    {row.delta > 0 ? `+${row.delta}m` : row.delta < 0 ? `${row.delta}m` : '0m'}
  </span>
  <span className="text-sm text-gray-400">
    {formatTimeDisplay(row.check_in_time || null)}
  </span>
</div>
```

**Explicación:**
- `0m` = Diferencia en minutos (delta). Si es 0, significa que llegó exactamente a tiempo.
- `00:55` = Resultado de `formatTimeDisplay(row.check_in_time)` que debería mostrar la hora de entrada en formato HH:MM.

### 2. Función de Formato
**Archivo:** `lib/timezone.ts` (líneas 70-88)

```typescript
export function formatTimeDisplay(timestamp: string | Date | null): string {
  if (!timestamp) return '--:--';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  if (isNaN(date.getTime())) {
    return '--:--';
  }
  
  return date.toLocaleTimeString('es-HN', {
    timeZone: HONDURAS_TIMEZONE, // 'America/Tegucigalpa'
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}
```

**Configuración:**
- Zona horaria: `America/Tegucigalpa` (UTC-6)
- Formato: 24 horas (HH:MM)
- Locale: `es-HN` (español de Honduras)

### 3. Flujo de Datos

#### Backend → Frontend
1. **Base de Datos:** `attendance_records.check_in` es tipo `TIMESTAMPTZ` ✅
2. **RPC Function:** `attendance_lists_filtered` devuelve `check_in TIMESTAMPTZ` ✅
3. **API Endpoint:** `/api/attendance/lists.ts` mapea `check_in` → `check_in_time` ✅
4. **Frontend:** `ArrivalTable` recibe `check_in_time` y lo formatea con `formatTimeDisplay()` ✅

#### Almacenamiento
**Archivo:** `pages/api/webhooks/attendance.ts` (línea 387)

```typescript
check_in: eventTimestamp.toISOString()
```

El timestamp se guarda correctamente como ISO string completo.

## Posibles Causas del Problema

### Hipótesis 1: Timestamp Incorrecto en Base de Datos
Si el valor almacenado es `2025-01-15T00:00:55.000Z` (medianoche + 55 segundos), al convertirlo a hora de Honduras (UTC-6) mostraría `18:00` del día anterior, no `00:55`.

### Hipótesis 2: Formato Incorrecto del Timestamp
Si el timestamp viene como string en formato incorrecto (ej: solo "00:55"), `new Date("00:55")` podría crear una fecha inválida o incorrecta.

### Hipótesis 3: Conversión de Zona Horaria Incorrecta
Si el timestamp está almacenado incorrectamente (sin zona horaria o con zona incorrecta), la conversión podría fallar.

## Verificación Necesaria

Para diagnosticar el problema, necesitamos verificar:

1. **Valor real en la base de datos:**
   ```sql
   SELECT 
     id,
     employee_id,
     date,
     check_in,
     check_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa' as check_in_honduras,
     TO_CHAR(check_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa', 'HH24:MI') as check_in_formatted
   FROM attendance_records
   WHERE date = CURRENT_DATE
   ORDER BY check_in
   LIMIT 10;
   ```

2. **Valor que llega al frontend:**
   - Agregar `console.log` en `ArrivalTable.tsx` línea 150:
   ```typescript
   console.log('check_in_time raw:', row.check_in_time, 'formatted:', formatTimeDisplay(row.check_in_time || null));
   ```

3. **Verificar el formato del timestamp:**
   - El timestamp debería ser un ISO string completo: `2025-01-15T13:00:55.000Z` (para 7:00 AM Honduras)

## Solución Propuesta

### Opción 1: Verificar y Corregir Timestamps en Base de Datos
Si los timestamps están mal almacenados, necesitamos corregirlos.

### Opción 2: Mejorar Manejo de Errores en formatTimeDisplay
Agregar validación adicional y logging:

```typescript
export function formatTimeDisplay(timestamp: string | Date | null): string {
  if (!timestamp) return '--:--';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid timestamp in formatTimeDisplay:', timestamp);
    return '--:--';
  }
  
  // Validar que el timestamp tenga sentido (no sea del año 1970 o futuro lejano)
  const year = date.getFullYear();
  if (year < 2020 || year > 2100) {
    console.warn('Suspicious timestamp year:', year, 'from:', timestamp);
  }
  
  const result = date.toLocaleTimeString('es-HN', {
    timeZone: HONDURAS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  console.debug('formatTimeDisplay:', { input: timestamp, output: result, date: date.toISOString() });
  
  return result;
}
```

### Opción 3: Verificar Cómo se Está Parseando eventTimestamp
En `pages/api/webhooks/attendance.ts`, verificar que `eventTimestamp` tenga el formato correcto antes de guardarlo.

## Conclusión y Solución

### Problema Identificado ✅

El problema está en `parseDeviceDateTime()` en el webhook de attendance. Cuando el dispositivo envía un timestamp CON zona horaria (UTC), el código estaba usando `convertToHondurasTime()` que resta 6 horas incorrectamente.

**Flujo del problema:**
1. Dispositivo envía: `2025-12-10T13:00:00Z` (7:00 AM Honduras = 13:00 UTC) ✅
2. `convertToHondurasTime()` resta 6 horas: `2025-12-10T07:00:00Z` ❌
3. Se guarda en BD: `07:00:00 UTC` ❌
4. Frontend convierte: `07:00 UTC` → `01:00 Honduras` ❌ (debería ser `07:00`)

**Solución aplicada:**
- Cuando el timestamp viene CON zona horaria (UTC), NO convertirlo
- Guardar el timestamp UTC directamente
- El frontend ya hace la conversión correcta con `toLocaleTimeString()`

### Verificación SQL Correcta

**❌ Incorrecto (agrega 6 horas):**
```sql
TO_CHAR(check_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa', 'HH24:MI:SS')
```

**✅ Correcto:**
```sql
TO_CHAR(check_in AT TIME ZONE 'America/Tegucigalpa', 'HH24:MI:SS')
```

### Próximos Pasos

1. ✅ **Corregido:** `parseDeviceDateTime()` ya no convierte timestamps UTC incorrectamente
2. ⚠️ **Pendiente:** Los timestamps ya guardados pueden estar incorrectos y necesitan corrección
3. ✅ **Verificado:** El frontend (`formatTimeDisplay()`) funciona correctamente

**Nota:** Los nuevos registros deberían funcionar correctamente. Los registros antiguos pueden necesitar una migración de datos.

