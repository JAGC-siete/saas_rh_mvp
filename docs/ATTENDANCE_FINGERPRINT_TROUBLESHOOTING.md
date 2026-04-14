# Diagnóstico: Registros de huella no aparecen en UX

## Contexto

- **Empresa**: Destino Honduras (`c4692355-9b0c-4a2c-8283-7c0b872b6831`)
- **Dispositivo problemático**: `destinohonduras_copem` (192.168.0.4) - `verify_mode_whitelist: ["fingerprint"]`
- **Otros dispositivos**: funcionan correctamente (ej. destinohonduras_choluteca con face+fingerprint)
- **Empleados afectados**: Juan Rico (DNI 0801195503979), Danny (DNI 0801198403522)

## Flujo de datos

```
Dispositivo Hikvision → POST /api/webhooks/attendance?company_id=... 
  → processAccessEvent() 
  → Extrae employeeNoString/employeeNo/cardNo/employeeNoHex/credentialNo
  → Busca empleado por DNI normalizado
  → Inserta attendance_records
  → Frontend: attendance_lists_filtered RPC (type=present/absent)
```

## Causas posibles (de más a menos obvias)

### 1. Dispositivo no envía identificador de empleado

**Síntoma en logs**: `[ACCESS EVENT] No employee identifier found`

**Causa**: El payload del dispositivo solo incluye `deviceName`, `majorEventType`, `subEventType` — sin `employeeNoString`, `employeeNo`, `cardNo`, etc.

**Solución**:
1. Acceder a la interfaz web del dispositivo (192.168.0.4)
2. **Access Control** → **Person** / **User Management**
3. Para cada usuario (Juan Rico, Danny): verificar que tiene **Employee No** = DNI (`0801195503979`, `0801198403522`)
4. Si falta, configurarlo y guardar
5. Verificar en **Event** → **HTTP Notification** que el webhook incluye campos de empleado en el payload

### 2. DNI en BD no coincide con el del dispositivo

**Síntoma en logs**: `[ACCESS EVENT] Employee not found` con `normalizedId` presente

**Verificación**:
```sql
-- Ejecutar scripts/diagnose-destinohonduras-attendance.sql
SELECT id, name, dni, REGEXP_REPLACE(dni, '[^0-9]', '', 'g') AS dni_normalized
FROM employees
WHERE company_id = 'c4692355-9b0c-4a2c-8283-7c0b872b6831'
  AND (REGEXP_REPLACE(dni, '[^0-9]', '', 'g') IN ('0801195503979', '0801198403522'));
```

Si no hay filas o el `dni_normalized` difiere, corregir en BD o en el dispositivo.

### 3. Dispositivo envía formato distinto (fingerprint vs face)

Algunos dispositivos con **solo fingerprint** envían `employeeNoHex` o `credentialNo` en lugar de `employeeNoString`.

**Cambios aplicados en el webhook**:
- Fallbacks añadidos: `employeeNoHex`, `credentialNo`, `personNo`
- Soporte para valores hex → decimal en `normalizeIdentifier`
- Logging completo del payload cuando no se encuentra identificador

### 4. Eventos clasificados como heartbeat

**Síntoma**: `eventType === 'heartBeat'` — no se procesan como acceso.

**Verificación en logs**: Buscar `[WEBHOOK] Event classification` y ver `eventType`, `hasAcsEvent`.

### 5. Idempotencia (event_uid duplicado)

**Síntoma en logs**: `[ACCESS EVENT] Duplicate event ignored (idempotency)`

Si el mismo evento se procesa dos veces, la segunda se ignora. Normal si el dispositivo reenvía.

### 6. RLS o error de inserción

**Síntoma en logs**: `[FOUR_MARKS] Error creating check_in record` o similar

El webhook usa `createAdminClient()` (bypass RLS). Revisar políticas de `attendance_records` si hay errores de permisos.

## Checklist de verificación

- [ ] Empleados existen en BD con DNI correcto (`scripts/diagnose-destinohonduras-attendance.sql`)
- [ ] Dispositivo tiene Employee No configurado para cada usuario
- [ ] Webhook suscrito a eventos de acceso (no solo heartbeat)
- [ ] Logs muestran `[ACCESS EVENT] Extracted Access Control fields` con `employeeNoString` o similar
- [ ] Si no: logs muestran `acsFull` y `rootFull` — revisar qué campos envía el dispositivo
- [ ] `last_event_at` del dispositivo se actualiza cuando hay marca (indica eventos de acceso recibidos)

## Cómo obtener logs

En Railway (o el entorno de deploy):

1. Buscar por `companyId: c4692355-9b0c-4a2c-8283-7c0b872b6831`
2. Buscar `[ACCESS EVENT]` para ver extracción de campos
3. Si aparece `No employee identifier found`, revisar `acsFull` y `rootFull` en el log

## Referencias

- Webhook: `pages/api/webhooks/attendance.ts`
- Documentación dispositivo: `docs/DEVICE_CONFIGURATION_ANALYSIS.md`
- Comparación dispositivos: `docs/DEVICE_COMPARISON_SUMMARY.md`
