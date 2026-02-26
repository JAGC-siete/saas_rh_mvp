# Análisis de Compatibilidad: ZKTeco vs Hikvision

## ⚠️ Hallazgo Importante

**La captura que compartiste muestra ZKTime.Net Lite 2.0.3.1623**, software de **ZKTeco Corporation** (Copyright 2008-2014), **no Hikvision**.

Si el dispositivo del cliente muestra "Hikvision" en algún lugar, podría ser:
1. **Dispositivo ZKTeco** gestionado con ZKTime.Net (lo más probable según la captura)
2. **Dispositivo Hikvision** con software ZKTeco instalado en la PC (poco común)
3. **Confusión de marcas** – verificar físicamente el modelo en el dispositivo

---

## Comparación de Protocolos

| Aspecto | Hikvision (actual) | ZKTeco |
|---------|-------------------|--------|
| **Protocolo** | ISAPI (HTTP REST) | Push SDK (iclock) |
| **Formato webhook** | `multipart/form-data` + JSON | `application/x-www-form-urlencoded` o body plano |
| **Estructura datos** | `AccessControllerEvent` con `employeeNoString`, `cardNo` | Tab-separated: `PIN\tDateTime\tVerifyMethod` |
| **Heartbeat** | JSON con `eventType: "heartBeat"` | `GET /iclock/getrequest?SN=XXX` |
| **Asistencia** | JSON con `AccessControllerEvent` | `POST /iclock/cdata?table=ATTLOG` |
| **Identificador empleado** | `employeeNoString` (DNI) | `PIN` (número interno del dispositivo) |
| **Provisioning** | ISAPI `UserInfo/SetUp` | Operaciones distintas (OPERLOG, etc.) |

---

## ¿Es Compatible con el Software Actual?

**No, no es compatible de forma directa.** El webhook actual (`/api/webhooks/attendance`) está diseñado para el formato Hikvision ISAPI:

- Espera `multipart/form-data` con JSON
- Busca `AccessControllerEvent` o `AcsEvent`
- Requiere `employeeNoString`, `employeeNo`, `cardNo` o equivalentes
- Usa `eventType: "access"` vs `eventType: "heartBeat"`

ZKTeco envía datos en otro formato y a otros endpoints.

---

## Formato ZKTeco (Push SDK)

### Endpoints que usa el dispositivo

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/iclock/getrequest?SN=XXXXXXXXXX` | GET | Heartbeat / ping |
| `/iclock/cdata?SN=XXX&table=ATTLOG&Stamp=9999` | POST | Registros de asistencia |
| `/iclock/cdata?SN=XXX&table=OPERLOG&Stamp=9999` | POST | Datos de usuarios |

### Formato ATTLOG (asistencia)

```
PIN\tDatetime\tVerifyMethod\tWorkCode\t...\n
```

- **PIN**: ID numérico del usuario en el dispositivo (no necesariamente DNI)
- **Datetime**: `YYYY-MM-DD HH:MM:SS`
- **VerifyMethod**: 0 = entrada, 1 = salida

Ejemplo: `2\t2022-07-12 16:00:20\t1\t15\t\t0\t0\t\t\t43\n`

### Respuesta esperada

El servidor debe responder **`OK`** en texto plano para que el dispositivo considere la operación correcta.

---

## Opciones para el Cliente

### Opción 1: Integración ZKTeco (recomendada si el dispositivo es ZKTeco)

Crear un endpoint específico para ZKTeco que:

1. Reciba `POST /iclock/cdata` con `table=ATTLOG`
2. Parsee el formato tab-separated
3. Mapee `PIN` → empleado (tabla de mapeo PIN↔DNI o por `employee_id`)
4. Cree `attendance_records` con la misma lógica que el webhook Hikvision
5. Responda `OK` en texto plano

**Esfuerzo estimado**: 2–4 días (endpoint, mapeo PIN↔empleado, pruebas).

### Opción 2: Usar ZKTime.Net como intermediario

ZKTime.Net puede tener opciones para enviar datos a un servidor externo. Habría que revisar:

- Configuración de “Push” o “HTTP Notification” en ZKTime.Net
- Si puede enviar a una URL personalizada
- Formato de los datos que envía

Si ZKTime.Net puede enviar a tu webhook con un formato conocido, se podría adaptar el parser.

### Opción 3: Cambiar a dispositivo Hikvision

Si el cliente puede cambiar de dispositivo, un Hikvision DS-K1T344MBWX-QRE1 (o similar) funcionaría con la integración actual sin cambios.

---

## Pasos Inmediatos Recomendados

1. **Confirmar marca y modelo del dispositivo**
   - Revisar etiqueta física del dispositivo
   - Anotar modelo exacto (ej. ZKTeco K40, Hikvision DS-K1T344, etc.)

2. **Confirmar qué software usa**
   - ZKTime.Net Lite → dispositivo ZKTeco
   - Hik-Connect o interfaz web Hikvision → dispositivo Hikvision

3. **Si es ZKTeco**
   - Revisar en ZKTime.Net: Configuración → Push/Server
   - Ver a qué URL envía datos y con qué formato
   - Si hay opción de “Push to URL” o similar, anotar la URL y el formato

4. **Si es Hikvision**
   - Seguir el flujo actual de provisionamiento
   - Configurar webhook según `docs/HIKVISION_READINESS_CHECKLIST.md`

---

## Configuración de Integración ZKTeco (Implementado)

El software incluye endpoints específicos para dispositivos ZKTeco. Siga estos pasos para configurar.

### 1. Registrar el dispositivo en la base de datos

Crear un registro en la tabla `devices` con:

- `company_id`: UUID de la empresa
- `name`: Nombre descriptivo (ej. "Biométrico Recepción")
- `device_type`: `'zkteco'`
- `serial_number`: SN del dispositivo (obtener de ZKTime.Net o etiqueta del equipo)
- `ip_address`: IP del dispositivo (puede ser placeholder si no hay provisioning)
- `port`: 80 (o el que use el dispositivo)
- `username`, `password_encrypted`: Placeholders (ZKTeco no usa ISAPI para provisioning)

### 2. URLs a configurar en ZKTime.Net

Reemplazar `<SITE_URL>` por el dominio (ej. `https://humanosisu.net`) y `<COMPANY_ID>` por el UUID de la empresa.

| Propósito | URL |
|-----------|-----|
| Heartbeat (getrequest) | `https://<SITE_URL>/api/webhooks/zkteco/iclock/getrequest?company_id=<COMPANY_ID>` |
| Asistencia (cdata) | `https://<SITE_URL>/api/webhooks/zkteco/iclock/cdata?company_id=<COMPANY_ID>` |

El dispositivo añade automáticamente `&SN=XXXXXXXXXX` y, en POST, `&table=ATTLOG&Stamp=9999`.

### 3. Mapeo PIN → Empleado

El PIN del dispositivo debe resolverse a un empleado. Orden de búsqueda:

1. **employee_aliases**: Crear alias con `alias = PIN` (string exacto) y `employee_id`.
2. **employee_code**: Si el PIN coincide con `employees.employee_code` (o su versión normalizada).
3. **dni**: Si el PIN coincide con `employees.dni` normalizado (solo dígitos).

**Recomendación**: Configurar en ZKTime.Net el PIN de cada usuario como el DNI (sin guiones). Así el mapeo por `dni` funcionará sin aliases adicionales.

### 4. Verificación

- Heartbeat: el dispositivo hace GET periódico; `devices.last_seen_at` se actualiza.
- Asistencia: al marcar en el dispositivo, se crean registros en `attendance_records`.
- Logs: buscar `[ZKTECO CDATA]` o `[ZKTECO GETREQUEST]` en los logs del servidor.

---

## Referencias

- [ZKTeco Push SDK](https://www.zkteco.com/en/PUSHSDK)
- [ZKTeco API (zkteco.uk)](https://zkteco.uk/api/index.htm)
- [Stack Overflow: ZKTeco Push SDK](https://stackoverflow.com/questions/65844119/zkteco-push-sdk)
- Código actual: `pages/api/webhooks/attendance.ts` (formato Hikvision)
- Provisioning: `pages/api/hikvision/provision.ts`, `lib/hikvision/sdk.ts`
