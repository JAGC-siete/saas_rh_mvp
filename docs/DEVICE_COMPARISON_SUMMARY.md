# 📊 Resumen de Comparación: Dispositivo Funcionando vs Nuevo

## 🎯 Problema Identificado

**Dispositivo nuevo** (`8cde857a-e726-495b-8147-40255ae5281d`) está recibiendo eventos del webhook pero **NO está creando `attendance_records`**.

---

## 🔍 Análisis de Logs

### Lo que SÍ está funcionando ✅

1. **Webhook recibiendo requests**: 
   - Logs muestran `"[ATTENDANCE WEBHOOK] Request received"`
   - `companyId: 3cf40389-9916-460a-89d3-19a4a8270750` ✅ Correcto

2. **JSON parseado correctamente**:
   - Logs muestran `"[ATTENDANCE WEBHOOK] Found JSON in multipart file part"`
   - El formato `multipart/form-data` está siendo procesado ✅

3. **Eventos de acceso detectados**:
   - El código detecta que hay `AccessControllerEvent` o `AcsEvent`
   - Entra a la función `processAccessEvent()` ✅

### Lo que NO está funcionando ❌

**Error crítico en logs:**
```
[ACCESS EVENT] No employee identifier found
acsKeys[0]: deviceName
acsKeys[1]: majorEventType
acsKeys[2]: subEventType
acsKeys[3]: ser/doo/Int/rem
```

**Análisis:**
- El JSON SÍ tiene estructura `AccessControllerEvent` (por eso detecta `acsKeys`)
- Pero **NO incluye** ninguno de estos campos requeridos:
  - ❌ `employeeNoString`
  - ❌ `employeeNo`
  - ❌ `cardNo`

---

## 🔬 Comparación: Qué envía cada dispositivo

### Dispositivo Funcionando (24e66ba0...)

**Estructura del JSON que envía:**
```json
{
  "eventType": "access",
  "AccessControllerEvent": {
    "employeeNoString": "0801199012345",  // ✅ PRESENTE
    "doorNo": 1,
    "readerNo": 1,
    "currentVerifyMode": "face",
    "dateTime": "2025-01-28T13:30:00"
  }
}
```

**Resultado:**
- ✅ Crea `attendance_records`
- ✅ Actualiza `last_event_at`
- ✅ Log: `"[ACCESS EVENT] Extracted Access Control fields"` con `employeeNoString`

### Dispositivo Nuevo (8cde857a...)

**Estructura del JSON que envía (según logs):**
```json
{
  "eventType": "access",
  "AccessControllerEvent": {
    "deviceName": "...",
    "majorEventType": "...",
    "subEventType": "ser/doo/Int/rem",  // Varios valores diferentes
    // ❌ FALTA: employeeNoString
    // ❌ FALTA: employeeNo
    // ❌ FALTA: cardNo
  }
}
```

**Resultado:**
- ❌ NO crea `attendance_records`
- ❌ `last_event_at` permanece `null`
- ❌ Log: `"[ACCESS EVENT] No employee identifier found"`

---

## 🎯 Causa Raíz

El dispositivo nuevo **NO está configurado** para incluir el identificador del empleado en los eventos de acceso que envía al webhook.

**Posibles causas:**

1. **Usuarios en el dispositivo sin `Employee No` configurado**:
   - Cada persona/usuario en el dispositivo debe tener `Employee No` = DNI del empleado
   - Si no está configurado, el dispositivo no incluye `employeeNoString` en el evento

2. **Configuración del webhook en el dispositivo incompleta**:
   - El webhook puede estar suscrito solo a eventos genéricos (deviceName, majorEventType, subEventType)
   - Falta suscribirse a eventos de acceso con campos de empleado

3. **Firmware diferente o configuración ISAPI diferente**:
   - Puede requerir configuración adicional para incluir campos de empleado en el payload

---

## ✅ Solución

### Paso 1: Verificar configuración en el dispositivo Hikvision

1. **Acceder a la interfaz web del dispositivo** (`192.168.1.80:80`)

2. **Verificar usuarios/personas**:
   - Ir a: `Access Control` → `Person` o `User Management`
   - Para cada usuario que debe registrar asistencia:
     - ✅ Verificar que tiene `Employee No` o `Employee ID` configurado
     - ✅ El valor debe ser el DNI del empleado (ej: `"0801199012345"`)
     - ✅ Puede ser con o sin guiones, el software normaliza

3. **Verificar configuración del webhook**:
   - Ir a: `Event` → `HTTP Notification` o `Webhook`
   - Verificar que el webhook está suscrito a:
     - ✅ `AccessControllerEvent` o `AcsEvent`
     - ✅ Campos incluidos: `employeeNoString`, `employeeNo`, o `cardNo`
   - Si hay opciones de "Fields to include" o "Payload fields", asegurar que incluye campos de empleado

### Paso 2: Probar con un evento real

1. **Hacer un acceso** en el dispositivo (huella, tarjeta, o reconocimiento facial)

2. **Revisar logs de Railway** inmediatamente después:
   - Buscar: `"[ACCESS EVENT] Extracted Access Control fields"`
   - Debe mostrar: `employeeNoString: "..."` o `cardNo: "..."`

3. **Si sigue sin aparecer**:
   - El dispositivo necesita configuración adicional
   - Puede requerir actualización de firmware o configuración ISAPI manual

### Paso 3: Verificar matching con BD

Una vez que el dispositivo empiece a enviar `employeeNoString`:

1. **Verificar que existe el empleado en BD**:
   ```sql
   SELECT id, dni, name, status
   FROM employees
   WHERE company_id = '3cf40389-9916-460a-89d3-19a4a8270750'
     AND REGEXP_REPLACE(dni, '[^0-9]', '', 'g') = '<employeeNoString_del_dispositivo>'
     AND status = 'active';
   ```

2. **Si no existe o está inactivo**:
   - Crear/activar el empleado en BD
   - Asegurar que el `dni` coincide (después de normalización)

---

## 📋 Checklist de Configuración Completa

### En el Dispositivo Hikvision

- [ ] Webhook URL configurado: `https://humanosisu.net/api/webhooks/attendance?company_id=3cf40389-9916-460a-89d3-19a4a8270750`
- [ ] Webhook habilitado y probado
- [ ] Usuarios tienen `Employee No` configurado (igual al DNI)
- [ ] Webhook suscrito a eventos de acceso (`AccessControllerEvent`)
- [ ] Webhook configurado para incluir campos de empleado en payload

### En la Base de Datos

- [ ] Dispositivo registrado con `webhook_configured = true`
- [ ] `mac_address` normalizado (sin saltos de línea)
- [ ] `settings.timezone` = `"America/Tegucigalpa"`
- [ ] Empleados activos con `dni` que coincida con `Employee No` del dispositivo

### Verificación Final

- [ ] `last_seen_at` se actualiza (indica heartbeat funcionando) ✅ Ya funciona
- [ ] `last_event_at` se actualiza (indica eventos de acceso llegando) ❌ Falta
- [ ] `attendance_records` se crean cuando hay acceso ❌ Falta
- [ ] Logs muestran `"[ACCESS EVENT] Extracted Access Control fields"` con `employeeNoString` ❌ Falta

---

## 🔗 Referencias

- Documentación completa: `docs/DEVICE_CONFIGURATION_ANALYSIS.md`
- Script de análisis: `scripts/analyze-device-config.js`
- Script SQL: `scripts/compare-devices.sql`
- Código del webhook: `pages/api/webhooks/attendance.ts` (línea 775-825)
