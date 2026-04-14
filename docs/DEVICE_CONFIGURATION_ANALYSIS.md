# 📊 Análisis de Configuración de Dispositivos Hikvision

## 🎯 Objetivo

Documentar el formato exacto que envía el dispositivo Hikvision que está **100% integrado** y compararlo con dispositivos nuevos para identificar diferencias de configuración.

---

## 📱 Dispositivo de Referencia (Funcionando)

- **Device ID**: `24e66ba0-c3e5-4d76-b686-e6e9744b217c`
- **Company ID**: `4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c`
- **Empresa**: PROHALCA
- **Estado**: ✅ 100% integrado, generando `attendance_records` correctamente

---

## 📋 Formato Esperado por el Software

### Estructura del JSON que debe enviar el dispositivo

El webhook en `pages/api/webhooks/attendance.ts` espera recibir un JSON dentro de un `multipart/form-data` con la siguiente estructura:

```json
{
  "eventType": "access" | "heartBeat",
  "eventState": "active" | "inactive",
  "dateTime": "2025-01-28T13:30:00" | "2025-01-28T13:30:00Z",
  
  // OPCIONES DE ESTRUCTURA (según versión de firmware Hikvision):
  
  // Opción 1: AccessControllerEvent directo en root
  "AccessControllerEvent": {
    "employeeNoString": "0801199012345",  // ⚠️ REQUERIDO para crear attendance_records
    "employeeNo": 801199012345,           // Alternativa si no hay employeeNoString
    "cardNo": "12345678",                 // Alternativa si no hay employeeNoString
    "doorNo": 1,
    "readerNo": 1,
    "currentVerifyMode": "face" | "fingerprint" | "card",
    "dateTime": "2025-01-28T13:30:00"
  },
  
  // Opción 2: Dentro de EventNotificationAlert
  "EventNotificationAlert": {
    "AccessControllerEvent": {
      "employeeNoString": "0801199012345",
      "doorNo": 1,
      "readerNo": 1,
      "currentVerifyMode": "face",
      "dateTime": "2025-01-28T13:30:00"
    }
  },
  
  // Opción 3: AcsEvent (alias usado en algunos firmwares)
  "AcsEvent": {
    "employeeNoString": "0801199012345",
    "doorNo": 1,
    "readerNo": 1,
    "currentVerifyMode": "face",
    "dateTime": "2025-01-28T13:30:00"
  }
}
```

### ⚠️ Campo Crítico: Identificador de Empleado

El código busca el identificador del empleado en este orden de prioridad:

```typescript
const rawId = 
  acs?.employeeNoString ??      // 1. Prioridad máxima
  acs?.employeeNo ??             // 2. Alternativa numérica
  acs?.cardNo ??                // 3. Número de tarjeta
  root?.employeeNoString ??     // 4. Fallback en root
  root?.employeeNo ??           // 5. Fallback numérico
  root?.cardNo ??               // 6. Fallback tarjeta
  null;
```

**Si NINGUNO de estos campos está presente**, el webhook:
- ✅ Responde `200 OK` (para no bloquear el dispositivo)
- ❌ **NO crea** `attendance_records`
- 📝 Log: `"[ACCESS EVENT] No employee identifier found"`

---

## 🔍 Proceso de Matching en el Software

### Paso 1: Normalización del Identificador

```typescript
function normalizeIdentifier(raw: string | number | undefined): string | undefined {
  if (!raw) return undefined;
  const digits = String(raw).replace(/\D/g, '');  // Solo dígitos
  return digits || undefined;
}
```

**Ejemplos:**
- `"0801-1990-12345"` → `"0801199012345"`
- `"0801 1990 12345"` → `"0801199012345"`
- `801199012345` → `"801199012345"`
- `"ABC123"` → `"123"`

### Paso 2: Búsqueda del Empleado

```sql
SELECT id, company_id, work_schedule_id, dni, pay_type
FROM employees
WHERE company_id = '<company_id>'
  AND dni = '<normalized_id>'  -- Comparación exacta después de normalizar
  AND status = 'active'
LIMIT 1;
```

Si no encuentra con match exacto, intenta búsqueda flexible normalizando todos los DNIs.

### Paso 3: Creación del Registro

Si encuentra el empleado:
- Crea/actualiza registro en `attendance_records`
- Usa `event_uid` (SHA256) para idempotencia
- Guarda metadata del dispositivo (doorNo, readerNo, verifyMode, etc.)

Si NO encuentra el empleado:
- ❌ **NO crea** `attendance_records`
- 📝 Log: `"[ACCESS EVENT] Employee not found"`

---

## 🔧 Configuración del Dispositivo Hikvision

### Campos Requeridos en el Dispositivo

Para que el dispositivo envíe eventos con identificador de empleado, debe estar configurado:

1. **Usuario/Persona en el dispositivo**:
   - ✅ Debe tener `Employee No` o `Employee ID` configurado
   - ✅ Este valor debe coincidir con el `dni` del empleado en la BD (solo dígitos)
   - ✅ Ejemplo: Si el empleado tiene DNI `"0801-1990-12345"` en BD, el dispositivo debe tener `"0801199012345"` o `"0801-1990-12345"`

2. **Configuración del Webhook en el dispositivo**:
   - ✅ URL: `https://humanosisu.net/api/webhooks/attendance?company_id=<company_id>`
   - ✅ Método: `POST`
   - ✅ Content-Type: `multipart/form-data`
   - ✅ Eventos habilitados: `AccessControllerEvent` o `AcsEvent`

3. **Configuración de Eventos**:
   - ✅ Debe estar suscrito a eventos de acceso (no solo heartbeat)
   - ✅ Debe incluir campos: `employeeNoString`, `cardNo`, o `employeeNo` en el payload

---

## 📊 Comparación: Dispositivo Funcionando vs Nuevo

### Checklist de Configuración

| Campo | Funcionando | Nuevo | Estado |
|-------|-------------|-------|--------|
| `webhook_url` | ✅ Configurado | ✅ Configurado | ✅ |
| `webhook_configured` | `true` | `true` | ✅ |
| `last_seen_at` | ✅ Actualizado | ✅ Actualizado | ✅ |
| `last_event_at` | ✅ Actualizado | ❌ `null` | ⚠️ |
| `mac_address` | Normalizado | Con `\n` | ⚠️ |
| `settings.timezone` | `America/Tegucigalpa` | `America/Tegucigalpa` | ✅ |
| `settings.verify_mode_whitelist` | `["face", "fingerprint"]` | `["face", "fingerprint"]` | ✅ |

### Diferencias Críticas Detectadas

1. **`last_event_at` es `null` en el dispositivo nuevo**:
   - Indica que **NO está recibiendo eventos de acceso** del dispositivo
   - Solo está recibiendo `heartBeat` (por eso `last_seen_at` se actualiza)
   - **Causa probable**: El dispositivo no está configurado para enviar eventos de acceso al webhook

2. **`mac_address` con salto de línea**:
   - El dispositivo nuevo tiene `"\na4:d5:c2:72:6f:4c"` (con `\n` al inicio)
   - Esto puede causar problemas al hacer match por MAC en heartbeats
   - **Solución**: Normalizar en BD: `TRIM(mac_address)`

---

## 🐛 Diagnóstico de Problemas

### Problema: "No employee identifier found"

**Síntoma en logs:**
```
[ACCESS EVENT] No employee identifier found
acsKeys[0]: deviceName
acsKeys[1]: majorEventType
acsKeys[2]: subEventType
```

**Causa**: El JSON que envía el dispositivo **NO incluye** ninguno de estos campos:
- `AccessControllerEvent.employeeNoString`
- `AccessControllerEvent.employeeNo`
- `AccessControllerEvent.cardNo`
- `AcsEvent.employeeNoString`
- `root.employeeNoString`

**Solución**:
1. Verificar configuración del usuario en el dispositivo Hikvision
2. Asegurar que cada persona tiene `Employee No` configurado
3. Verificar que el webhook está suscrito a eventos de acceso (no solo heartbeat)
4. Revisar configuración ISAPI del dispositivo para incluir estos campos en el payload

### Problema: "Employee not found"

**Síntoma en logs:**
```
[ACCESS EVENT] Employee not found
normalizedId: "0801199012345"
```

**Causa**: El dispositivo SÍ está enviando el identificador, pero:
- No existe un empleado con ese DNI en la BD
- El empleado existe pero está `status = 'inactive'`
- El DNI en BD no coincide después de normalización

**Solución**:
1. Verificar que existe empleado con `dni = "0801199012345"` (o equivalente normalizado)
2. Verificar que el empleado tiene `status = 'active'`
3. Verificar que el empleado pertenece a la `company_id` correcta

---

## 🧪 Cómo Verificar la Configuración

### 1. Ejecutar Script de Análisis

```bash
node scripts/analyze-device-config.js \
  24e66ba0-c3e5-4d76-b686-e6e9744b217c \
  8cde857a-e726-495b-8147-40255ae5281d
```

Este script:
- Obtiene configuración de ambos dispositivos
- Compara campos críticos
- Muestra registros recientes de asistencia del dispositivo funcionando
- Genera recomendaciones específicas

### 2. Consultar Logs de Railway

Buscar en logs:
- `"[ACCESS EVENT] Extracted Access Control fields"` → Ver qué campos está recibiendo
- `"[ACCESS EVENT] No employee identifier found"` → El dispositivo no envía identificador
- `"[ACCESS EVENT] Employee not found"` → El identificador no matchea con BD

### 3. Consultar BD Directamente

```sql
-- Ver configuración del dispositivo funcionando
SELECT 
  id, name, webhook_url, settings, mac_address,
  last_seen_at, last_event_at
FROM devices
WHERE id = '24e66ba0-c3e5-4d76-b686-e6e9744b217c';

-- Ver registros recientes de asistencia
SELECT 
  ar.id, ar.employee_id, ar.date, ar.check_in, ar.check_out,
  ar.metadata, e.dni, e.name
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id
WHERE e.company_id = '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c'
ORDER BY ar.created_at DESC
LIMIT 10;

-- Ver empleados activos con sus DNIs
SELECT id, dni, name, status, pay_type
FROM employees
WHERE company_id = '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c'
  AND status = 'active'
LIMIT 10;
```

---

## 📝 Notas Importantes

1. **El webhook siempre responde `200 OK`** para no bloquear el dispositivo, incluso si hay errores
2. **Los errores se registran en logs**, no en la respuesta HTTP
3. **El procesamiento es asíncrono**: El webhook responde inmediatamente y procesa después
4. **Idempotencia**: Usa `event_uid` (SHA256) para evitar duplicados
5. **Normalización de DNI**: Siempre se normaliza a solo dígitos antes de comparar

---

## 🔗 Referencias

- Código del webhook: `pages/api/webhooks/attendance.ts`
- Función de extracción: `processAccessEvent()` (línea 775)
- Función de normalización: `normalizeIdentifier()` (línea 36)
- Documentación Hikvision ISAPI: Manual del dispositivo DS-K1T344MBWX-QRE1
