# Pasos de Diagnóstico - Bug de Timezone

## Objetivo
Identificar dónde se está desfasando la hora (DB y webhook), no en el `formatTimeDisplay`.

## Paso 1: Verificar qué hay realmente en la base de datos

Ejecutar esta consulta SQL:

```sql
SELECT 
  id,
  employee_id,
  date,
  check_in,
  -- Conversión CORRECTA (sin doble AT TIME ZONE)
  check_in AT TIME ZONE 'America/Tegucigalpa' AS check_in_hn,
  TO_CHAR(check_in AT TIME ZONE 'America/Tegucigalpa', 'HH24:MI') AS check_in_hn_hhmm,
  -- Para comparar con la conversión incorrecta
  TO_CHAR(check_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Tegucigalpa', 'HH24:MI') AS check_in_hn_incorrecto
FROM attendance_records
WHERE date = CURRENT_DATE
ORDER BY check_in
LIMIT 20;
```

**Objetivo:**
- Ver si para alguien que entró "7:00 AM" en la vida real, la DB guarda algo razonable (por ejemplo `13:00:xx+00` o similar).
- Si aquí ya aparece algo tipo `00:55`, el error está en cómo se guarda `check_in`.

**Archivo:** `DIAGNOSTICO_TIMEZONE.sql`

---

## Paso 2: Instrumentar el webhook

**Archivo:** `pages/api/webhooks/attendance.ts`

**Logs agregados:**
1. **RAW event payload time fields** (línea ~888): Muestra el campo crudo que viene del dispositivo
2. **Parsed eventTimestamp BEFORE saving** (línea ~898): Muestra el timestamp parseado antes de guardar
3. **About to save check_in to DB** (línea ~384): Muestra el valor que se va a guardar

**Qué buscar en los logs:**
- ¿El dispositivo manda UTC o hora local?
- ¿El string viene con `Z`, con offset `-06:00` o sin zona?
- ¿Estamos corrigiendo la zona dos veces?

**Ejemplo de log esperado:**
```
[ACCESS EVENT] RAW event payload time fields: {
  rawTimestampField: "2025-12-10T13:00:00Z",
  rootDateTime: "2025-12-10T13:00:00Z",
  hasTimezone: true
}

[ACCESS EVENT] Parsed eventTimestamp BEFORE saving: {
  asISOString: "2025-12-10T13:00:00.000Z",
  rawInput: "2025-12-10T13:00:00Z"
}
```

---

## Paso 3: Instrumentar el frontend

**Archivo:** `components/attendance/ArrivalTable.tsx`

**Log agregado:** En la línea donde se muestra la hora, se loguea:
- `raw`: El valor crudo que llega del API
- `typeofRaw`: El tipo del valor
- `jsDateISO`: El timestamp convertido a ISO string
- `formatted`: El resultado de `formatTimeDisplay`

**Qué buscar en la consola del navegador:**
- ¿El `raw` ya viene como algo absurdo (tipo `1970-01-01T00:55:00.000Z`)?
- ¿El `jsDateISO` cuadra con la vida real?
- Si el raw ya viene mal, el problema viene de la capa anterior (API / DB)

**Ejemplo de log esperado:**
```javascript
[ArrivalTable] check-in data: {
  employee: "Juan Pérez",
  raw: "2025-12-10T13:00:00.000Z",
  typeofRaw: "string",
  jsDateISO: "2025-12-10T13:00:00.000Z",
  formatted: "07:00"
}
```

---

## Paso 4: Definir un único lugar para la conversión de zona horaria

**Opción A (Recomendada):**
- DB guarda siempre UTC (`TIMESTAMPTZ`)
- Backend NO toca la zona
- UI hace TODA la conversión a `America/Tegucigalpa` con `toLocaleTimeString`

**Opción B:**
- DB expone vistas / RPCs que ya entregan hora en `America/Tegucigalpa`
- Frontend solo pinta cadenas sin volver a aplicar zona

**Lo que NO se debe hacer:**
- Convertir en DB + volver a convertir en JS con `timeZone` sin estar seguro de qué está recibiendo cada capa

---

## Resumen de Cambios Aplicados

✅ **Paso 1:** Consulta SQL creada en `DIAGNOSTICO_TIMEZONE.sql`
✅ **Paso 2:** Logs agregados en webhook (`pages/api/webhooks/attendance.ts`)
✅ **Paso 3:** Logs agregados en frontend (`components/attendance/ArrivalTable.tsx`)

**Próximos pasos:**
1. Ejecutar la consulta SQL y revisar resultados
2. Generar un evento de asistencia y revisar logs del webhook
3. Abrir el dashboard y revisar logs de la consola del navegador
4. Analizar los resultados y aplicar la corrección definitiva

