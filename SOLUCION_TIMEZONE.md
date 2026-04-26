# Solución: Problema de Timezone en check_in

## Resumen del Problema

- **Síntoma:** Los empleados ingresan a las 7:00 AM pero se muestra "00:55" en el dashboard
- **Causa:** `parseDeviceDateTime()` estaba convirtiendo incorrectamente timestamps UTC restando 6 horas
- **Solución:** Guardar timestamps UTC directamente, el frontend ya hace la conversión correcta

## ¿Qué Significa "0m" y "00:55"?

### "0m" (en verde)
- **Delta en minutos:** Diferencia respecto a la hora esperada
- **"0m"** = Llegó exactamente a tiempo (diferencia de 0 minutos)
- **"+5m"** = 5 minutos tarde
- **"-3m"** = 3 minutos temprano

### "00:55" (en gris)
- **Hora de entrada:** Debería mostrar la hora en formato HH:MM (24 horas)
- **Problema:** Estaba mostrando minutos:segundos en lugar de horas:minutos
- **Causa:** Timestamp incorrecto en la BD debido a conversión incorrecta

## Corrección Aplicada

### Archivo: `pages/api/webhooks/attendance.ts`

**Antes (❌ Incorrecto):**
```typescript
if (hasTimezone) {
  // Convertir a hora local de Honduras
  const hondurasDate = convertToHondurasTime(parsedDate);
  return hondurasDate; // ❌ Esto resta 6 horas incorrectamente
}
```

**Después (✅ Correcto):**
```typescript
if (hasTimezone) {
  // ✅ NO convertir aquí. Guardar el timestamp UTC directamente.
  // El frontend ya hace la conversión correcta usando toLocaleTimeString()
  return parsedDate; // ✅ Devolver el timestamp UTC sin modificar
}
```

## Cómo Funciona Ahora

1. **Dispositivo envía:** `2025-12-10T13:00:00Z` (7:00 AM Honduras = 13:00 UTC)
2. **Se guarda en BD:** `13:00:00 UTC` ✅ (sin modificar)
3. **Frontend recibe:** `2025-12-10T13:00:00Z`
4. **Frontend convierte:** `13:00 UTC` → `07:00 Honduras` ✅ (correcto!)

## Verificación SQL Correcta

Para verificar timestamps en la BD, usa esta consulta:

```sql
SELECT 
  id,
  employee_id,
  date,
  check_in,
  -- ✅ Conversión CORRECTA
  TO_CHAR(check_in AT TIME ZONE 'America/Tegucigalpa', 'HH24:MI:SS') as check_in_honduras
FROM attendance_records
WHERE date = CURRENT_DATE
ORDER BY check_in
LIMIT 10;
```

**Ejemplo esperado:**
- Si empleado ingresa a las **7:00 AM** en Honduras:
  - `check_in` debería ser aproximadamente `13:00:00 UTC` (7:00 + 6 horas)
  - `check_in_honduras` debería mostrar `07:00:00` ✅

## Nota sobre Registros Antiguos

Los registros ya guardados antes de esta corrección pueden tener timestamps incorrectos. Si es necesario, se puede crear una migración para corregirlos, pero los **nuevos registros funcionarán correctamente**.

## Frontend (Ya Correcto)

El frontend usa `formatTimeDisplay()` que funciona correctamente:

```typescript
date.toLocaleTimeString('es-HN', {
  timeZone: 'America/Tegucigalpa',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});
```

Esta función convierte correctamente timestamps UTC a hora local de Honduras.

