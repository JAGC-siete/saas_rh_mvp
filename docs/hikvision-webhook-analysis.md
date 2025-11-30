# 🔍 Análisis DevOps: Webhook Hikvision → PostgreSQL

## 📋 Resumen Ejecutivo

**WebSDK V3.3.1 de Hikvision**: Este SDK es para desarrollo de aplicaciones web que se conectan **directamente** al dispositivo (arquitectura B/S), **NO** para recibir webhooks HTTP. Sin embargo, el dispositivo Hikvision puede configurarse para enviar eventos HTTP POST a nuestro webhook.

## 🎯 Problemas Potenciales Identificados

### 1. **Problema de Autenticación Supabase** ⚠️ CRÍTICO

**Ubicación**: `pages/api/webhooks/attendance.ts:92`

```typescript
const supabase = createPagesServerClient({ req, res });
```

**Problema**: `createPagesServerClient` requiere autenticación de usuario (cookies de sesión). Los webhooks del dispositivo Hikvision **NO tienen cookies de sesión**, por lo que esta llamada puede fallar silenciosamente o retornar un cliente sin permisos.

**Solución**: Usar `createAdminClient()` o un cliente con Service Role Key para operaciones de webhook.

**Código actual problemático**:
```typescript
const supabase = createPagesServerClient({ req, res });
```

**Código corregido**:
```typescript
import { createAdminClient } from '../../../lib/supabase-admin';

const supabase = createAdminClient();
```

---

### 2. **Problema de Parsing de Timestamp** ⚠️ MEDIO

**Ubicación**: `pages/api/webhooks/attendance.ts:84-90`

**Problema**: El dispositivo Hikvision puede enviar timestamps en diferentes formatos:
- ISO 8601: `"2025-11-26T18:30:00Z"`
- Formato local: `"2025-11-26 18:30:00"`
- Timestamp Unix: `1732645800`

El código actual solo maneja `dateTime` y `timestamp`, pero no valida si el formato es válido.

**Solución**: Agregar validación y múltiples formatos de parsing.

---

### 3. **Problema de Extracción de DNI** ⚠️ MEDIO

**Ubicación**: `pages/api/webhooks/attendance.ts:48`

**Problema**: El código intenta extraer DNI de múltiples campos, pero el dispositivo Hikvision puede usar diferentes nombres según la configuración:
- `employeeNoString` (string)
- `employeeNo` (número)
- `employeeNoHex` (hexadecimal)
- `cardNo` (número de tarjeta)
- `personName` (nombre, no DNI)

**Solución**: Agregar más campos posibles y logging detallado.

---

### 4. **Problema de RLS (Row Level Security)** ⚠️ CRÍTICO

**Ubicación**: Tabla `attendance_records` tiene RLS habilitado

**Problema**: Si el cliente Supabase no tiene permisos adecuados (por usar `createPagesServerClient` sin sesión), las operaciones `upsert` pueden fallar silenciosamente debido a políticas RLS.

**Solución**: 
1. Usar `createAdminClient()` que bypass RLS, O
2. Crear políticas RLS específicas para webhooks, O
3. Usar Service Role Key directamente

---

### 5. **Problema de Manejo de Errores JSON** ⚠️ ALTO

**Ubicación**: `pages/api/webhooks/attendance.ts:44`

**Problema**: Si `eventDataString` no es JSON válido, `JSON.parse()` lanzará una excepción que será capturada por el `catch` genérico, perdiendo información específica del error.

**Solución**: Agregar try-catch específico para JSON.parse con logging detallado.

---

### 6. **Problema de Validación de Fecha** ⚠️ MEDIO

**Ubicación**: `pages/api/webhooks/attendance.ts:114`

**Problema**: `getTodayInHonduras()` retorna la fecha de HOY en Honduras, pero el evento puede haber ocurrido ayer o en otro día si el timestamp del dispositivo está desincronizado.

**Solución**: Usar la fecha del timestamp del evento, no la fecha actual.

---

### 7. **Problema de Formato de DNI** ⚠️ MEDIO

**Ubicación**: `pages/api/webhooks/attendance.ts:99`

**Problema**: La búsqueda de empleado usa `.eq('dni', employeeDNI)`, pero el DNI puede venir con:
- Espacios: `"0801 1990 12345"`
- Guiones: `"0801-1990-12345"`
- Solo números: `"0801199012345"`
- Con ceros a la izquierda: `"000801199012345"`

**Solución**: Normalizar el DNI antes de buscar (remover espacios, guiones, padding de ceros).

---

## 🔧 Recomendaciones de Implementación

### Prioridad ALTA (Críticas)

1. **Cambiar a `createAdminClient()`** para webhooks
2. **Agregar logging detallado** de todos los campos recibidos
3. **Validar formato JSON** antes de parsear

### Prioridad MEDIA

4. **Normalizar DNI** antes de buscar empleado
5. **Usar fecha del evento** en lugar de fecha actual
6. **Agregar más campos posibles** para extracción de DNI

### Prioridad BAJA

7. **Mejorar manejo de timestamps** con múltiples formatos
8. **Agregar retry logic** para operaciones de base de datos
9. **Implementar rate limiting** específico para webhooks

---

## 📊 Estructura de Datos Esperada del Dispositivo

Basado en el análisis del código y documentación Hikvision, el dispositivo envía:

```json
{
  "AccessControllerEvent": {
    "eventType": "faceAuthentication" | "heartBeat" | "doorOpen" | ...,
    "employeeNoString": "0801199012345",
    "employeeNo": 801199012345,
    "dateTime": "2025-11-26T18:30:00",
    "timestamp": "1732645800",
    "deviceName": "Device-001",
    "doorNo": 1,
    "cardNo": "12345678",
    "personName": "Juan Pérez"
  }
}
```

---

## 🧪 Casos de Uso para Testing

1. **Evento con DNI válido**: Debe crear/actualizar registro en `attendance_records`
2. **Evento sin DNI**: Debe retornar error 200 con mensaje descriptivo
3. **Evento con DNI no encontrado**: Debe retornar error 200 con mensaje descriptivo
4. **Evento heartbeat sin datos**: Debe retornar 200 OK sin procesar
5. **Evento heartbeat CON datos**: Debe procesar como asistencia
6. **JSON malformado**: Debe retornar error 500 con logging detallado
7. **Timestamp inválido**: Debe usar timestamp actual de Honduras
8. **Empleado inactivo**: Debe retornar error (actualmente no se valida `status`)

---

## 📝 Notas sobre WebSDK V3.3.1

**Relevancia para Webhooks**: ⚠️ **LIMITADA**

El WebSDK es para:
- ✅ Desarrollo de aplicaciones web que se conectan al dispositivo
- ✅ Control de video, PTZ, grabación
- ✅ Gestión de eventos del dispositivo vía ISAPI

**NO es para**:
- ❌ Recibir webhooks HTTP del dispositivo
- ❌ Configurar notificaciones HTTP del dispositivo
- ❌ Entender el formato de datos de webhooks

**Para configurar webhooks en el dispositivo Hikvision**, se debe usar:
- Interfaz web del dispositivo (iVMS-4200)
- Configuración ISAPI directa
- Manual del dispositivo (no incluido en este SDK)

---

## 🚀 Próximos Pasos Recomendados

1. **Implementar correcciones críticas** (Prioridad ALTA)
2. **Agregar logging exhaustivo** para debugging
3. **Crear tests unitarios** para casos de uso
4. **Monitorear logs de Railway** después de deploy
5. **Validar con dispositivo real** después de correcciones

