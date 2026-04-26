# Análisis de Conexión y Configuración: Hikvision ↔ SaaS

## 🔍 Puntos de Conexión Identificados

### 1. **Conexión SaaS → Dispositivo Hikvision** (Outbound)

**Dónde se hace:**
- **Archivo:** `lib/hikvision/sdk.ts`
- **Método:** `HikvisionSDK` constructor y métodos
- **Endpoint:** `http://${device.ip_address}:${device.port}/ISAPI/*`

**Configuración actual:**
```typescript
baseURL: `http://${options.host}:${options.port}`
timeout: 10000ms (10 segundos)
```

**Requisitos:**
- ✅ El SaaS debe poder alcanzar la IP del dispositivo
- ✅ Puerto del dispositivo debe estar abierto (típicamente 80)
- ✅ Credenciales correctas (username/password)
- ✅ Digest Authentication implementado

**Posibles problemas:**
1. **Firewall/Red:** El dispositivo puede estar en red privada sin acceso público
2. **IP incorrecta:** IP interna vs externa
3. **Puerto bloqueado:** Firewall bloqueando puerto 80
4. **Timeout muy corto:** 10s puede ser insuficiente en redes lentas

---

### 2. **Conexión Dispositivo → SaaS** (Inbound Webhook)

**Dónde se hace:**
- **Archivo:** `pages/api/webhooks/attendance.ts`
- **Endpoint:** `POST /api/webhooks/attendance?company_id=...`
- **URL configurada en dispositivo:** `${NEXT_PUBLIC_SITE_URL}/api/webhooks/attendance?company_id=${company_id}`

**Configuración actual:**
```typescript
// En provision.ts línea 43-44
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const webhookUrl = `${baseUrl}/api/webhooks/attendance?company_id=${userProfile.company_id}`;
```

**Requisitos:**
- ✅ `NEXT_PUBLIC_SITE_URL` debe ser accesible desde internet
- ✅ El dispositivo debe poder resolver el DNS
- ✅ Puerto 443 (HTTPS) o 80 (HTTP) debe estar abierto
- ✅ Endpoint debe aceptar POST sin autenticación (público)

**Posibles problemas:**
1. **URL incorrecta:** `NEXT_PUBLIC_SITE_URL` no configurado o incorrecto
2. **DNS no resuelve:** Dispositivo no puede resolver el dominio
3. **Firewall bloquea:** Firewall del dispositivo bloquea salida HTTPS
4. **CORS/Headers:** Middleware puede estar bloqueando requests del dispositivo

---

## ⚠️ Malconfiguraciones Identificadas

### **CRÍTICO 1: Construcción del Webhook URL**

**Problema:**
```typescript
// pages/api/admin/devices/provision.ts:43
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
```

**Riesgos:**
- Si `NEXT_PUBLIC_SITE_URL` no está configurado en Railway, usa `localhost:3000`
- El dispositivo intentará conectarse a `http://localhost:3000` (no funcionará)
- No hay validación de que la URL sea accesible desde internet

**Solución necesaria:**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                process.env.RAILWAY_PUBLIC_DOMAIN || 
                'https://humanosisu.net';
if (!baseUrl.startsWith('http')) {
  throw new Error('NEXT_PUBLIC_SITE_URL must be a full URL');
}
```

---

### **CRÍTICO 2: Protocolo HTTP vs HTTPS**

**Problema:**
```typescript
// lib/hikvision/sdk.ts:194
<protocolType>HTTP</protocolType>
```

**Análisis:**
- El SDK siempre configura `protocolType: "HTTP"` aunque la URL sea HTTPS
- Según el manual ISAPI, algunos dispositivos tratan HTTPS como HTTP + puerto 443
- Pero puede causar problemas si el dispositivo requiere configuración explícita de HTTPS

**Solución necesaria:**
```typescript
const protocolType = webhookUrlObj.protocol === 'https:' ? 'HTTPS' : 'HTTP';
```

---

### **CRÍTICO 3: Timeout muy corto**

**Problema:**
```typescript
// lib/hikvision/sdk.ts:38
timeout: options.timeout || 10000, // 10 segundos
```

**Riesgos:**
- Dispositivos en redes lentas pueden no responder en 10s
- El test del webhook puede fallar por timeout
- Conexiones a través de VPN/proxy pueden ser más lentas

**Solución recomendada:**
```typescript
timeout: options.timeout || 30000, // 30 segundos para operaciones ISAPI
```

---

### **MEDIO 4: Falta validación de conectividad**

**Problema:**
- No se valida que el dispositivo pueda alcanzar el webhook URL antes de configurarlo
- El test POST `/httpHosts/1/test` se hace después, pero si falla, el dispositivo queda mal configurado

**Solución recomendada:**
- Agregar validación previa: hacer un test HTTP al webhook desde el SaaS antes de configurarlo en el dispositivo

---

### **MEDIO 5: CORS no aplica a webhooks**

**Análisis:**
- El endpoint `/api/webhooks/attendance` es público (no requiere autenticación)
- CORS solo aplica a requests desde navegadores
- Los webhooks del dispositivo NO son afectados por CORS
- ✅ **No es un problema real**

---

### **BAJO 6: Falta logging de conectividad**

**Problema:**
- No hay logs detallados de la conexión del dispositivo al webhook
- Difícil diagnosticar si el dispositivo está enviando eventos

**Solución recomendada:**
- Agregar logging en el webhook endpoint para rastrear requests del dispositivo

---

## 🔌 Dónde se Hace la Conexión Real

### **Conexión 1: SaaS → Dispositivo (Provisionamiento)**

```
Railway/Server (Next.js)
    ↓ HTTP Request
    ↓ Digest Auth
    ↓
Dispositivo Hikvision (IP:PORT)
    ↓ ISAPI Endpoints:
    - GET /ISAPI/System/deviceInfo
    - PUT /ISAPI/Event/notification/httpHosts
    - POST /ISAPI/Event/notification/httpHosts/1/test
```

**Dónde verificar:**
1. **En Railway:** Logs del servicio cuando se ejecuta provision
2. **En el dispositivo:** Logs de ISAPI (si están habilitados)
3. **En el código:** `console.log` en `lib/hikvision/sdk.ts`

**Qué verificar:**
- ✅ ¿El SaaS puede alcanzar la IP del dispositivo?
- ✅ ¿Las credenciales son correctas?
- ✅ ¿El dispositivo responde a ISAPI?

---

### **Conexión 2: Dispositivo → SaaS (Webhooks)**

```
Dispositivo Hikvision
    ↓ HTTP POST (según httpHosts config)
    ↓ Content-Type: application/x-www-form-urlencoded
    ↓ Body: AccessControllerEvent={...JSON...}
    ↓
Railway/Server (Next.js)
    ↓ /api/webhooks/attendance?company_id=...
    ↓ Parse con formidable
    ↓ Procesa evento
    ↓ Guarda en Supabase
```

**Dónde verificar:**
1. **En Railway:** Logs del endpoint `/api/webhooks/attendance`
2. **En Supabase:** Tabla `attendance_records` para ver si se están guardando eventos
3. **En el dispositivo:** Configuración de httpHosts (vía interfaz web del dispositivo)

**Qué verificar:**
- ✅ ¿El dispositivo puede resolver el DNS del SaaS?
- ✅ ¿El dispositivo puede hacer HTTPS al dominio?
- ✅ ¿El endpoint responde 200 OK?
- ✅ ¿Los eventos se están guardando en la BD?

---

## 🛠️ Checklist de Verificación

### **En Railway (Producción)**

- [ ] `NEXT_PUBLIC_SITE_URL` está configurado y es accesible desde internet
- [ ] `NEXT_PUBLIC_SITE_URL` apunta al dominio correcto (no localhost)
- [ ] El dominio tiene certificado SSL válido (para HTTPS)
- [ ] El puerto 443 está abierto en Railway
- [ ] Los logs muestran requests al endpoint `/api/webhooks/attendance`

**Comando para verificar:**
```bash
railway variables
# Verificar NEXT_PUBLIC_SITE_URL
```

---

### **En Supabase (Base de Datos)**

- [ ] Tabla `devices` tiene registros con `ip_address`, `port`, `username`, `password_encrypted`
- [ ] Campo `webhook_url` está configurado después del provisionamiento
- [ ] Campo `webhook_configured` es `true` después del provisionamiento exitoso
- [ ] Tabla `attendance_records` recibe nuevos registros cuando hay eventos

**Query para verificar:**
```sql
-- Ver dispositivos configurados
SELECT id, name, ip_address, port, webhook_url, webhook_configured, status 
FROM devices 
WHERE device_type = 'hikvision';

-- Ver últimos eventos de asistencia
SELECT * FROM attendance_records 
ORDER BY check_in DESC 
LIMIT 10;
```

---

### **En el Dispositivo Hikvision**

- [ ] El dispositivo tiene acceso a internet
- [ ] DNS puede resolver el dominio del SaaS
- [ ] Firewall permite salida HTTPS (puerto 443)
- [ ] httpHosts está configurado (verificar en interfaz web del dispositivo)
- [ ] El test de httpHosts fue exitoso

**Cómo verificar en el dispositivo:**
1. Acceder a la interfaz web del dispositivo
2. Ir a: Network → Advanced → HTTP Notification
3. Verificar que hay un httpHost configurado con la URL del SaaS
4. Verificar que el estado es "Connected" o "Succeeded"

---

### **En el Código Local (Desarrollo)**

- [ ] `NEXT_PUBLIC_SITE_URL` en `.env.local` apunta a un dominio accesible (no localhost para producción)
- [ ] Timeout del SDK es suficiente (actualmente 10s, considerar aumentar)
- [ ] Logs muestran la URL del webhook que se está configurando

**Comando para verificar:**
```bash
# Ver variables de entorno locales
cat .env.local | grep NEXT_PUBLIC_SITE_URL
```

---

## 🚨 Problemas Comunes y Soluciones

### **Problema 1: "Device unreachable" durante provisionamiento**

**Causas posibles:**
- IP incorrecta o dispositivo offline
- Firewall bloqueando conexión
- Puerto incorrecto

**Solución:**
1. Verificar IP del dispositivo: `ping <device_ip>`
2. Verificar puerto: `telnet <device_ip> <port>`
3. Verificar credenciales en Supabase
4. Verificar logs en Railway para ver el error exacto

---

### **Problema 2: "Webhook test failed"**

**Causas posibles:**
- `NEXT_PUBLIC_SITE_URL` incorrecto o no configurado
- Dispositivo no puede resolver DNS
- Firewall bloquea salida HTTPS
- Endpoint no responde 200 OK

**Solución:**
1. Verificar `NEXT_PUBLIC_SITE_URL` en Railway
2. Desde el dispositivo (si tiene terminal), hacer: `curl https://<domain>/api/webhooks/attendance?company_id=test`
3. Verificar logs del endpoint para ver si llegan requests
4. Verificar que el endpoint no requiere autenticación

---

### **Problema 3: "No events received"**

**Causas posibles:**
- httpHosts no configurado correctamente en el dispositivo
- Dispositivo no puede alcanzar el webhook URL
- Eventos no se están generando en el dispositivo

**Solución:**
1. Verificar en el dispositivo que httpHosts está configurado
2. Verificar logs en Railway para ver si llegan requests
3. Verificar en Supabase si hay registros en `attendance_records`
4. Probar autenticación manual en el dispositivo para generar evento

---

## 📋 Acciones Recomendadas

### **Inmediatas (Críticas)**

1. **Validar NEXT_PUBLIC_SITE_URL en Railway:**
   ```bash
   railway variables
   # Verificar que NEXT_PUBLIC_SITE_URL = https://humanosisu.net (o dominio correcto)
   ```

2. **Aumentar timeout del SDK:**
   ```typescript
   timeout: options.timeout || 30000, // 30 segundos
   ```

3. **Mejorar construcción del webhook URL:**
   ```typescript
   const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   process.env.RAILWAY_PUBLIC_DOMAIN || 
                   'https://humanosisu.net';
   ```

4. **Agregar validación de protocolo:**
   ```typescript
   const protocolType = webhookUrlObj.protocol === 'https:' ? 'HTTPS' : 'HTTP';
   ```

### **Corto Plazo (Importantes)**

1. Agregar logging detallado en webhook endpoint
2. Agregar endpoint de diagnóstico para verificar conectividad
3. Agregar validación previa del webhook URL antes de configurarlo

### **Largo Plazo (Mejoras)**

1. Implementar retry logic para conexiones fallidas
2. Agregar monitoreo de salud del dispositivo
3. Mover contraseñas a Supabase Vault

---

## 🔗 Resumen de Puntos de Conexión

| Conexión | Origen | Destino | Protocolo | Dónde Verificar |
|----------|--------|---------|-----------|-----------------|
| Provision | Railway/Next.js | Dispositivo Hikvision | HTTP + Digest Auth | Logs Railway, SDK logs |
| Webhook | Dispositivo Hikvision | Railway/Next.js | HTTPS POST | Logs Railway, Supabase BD |
| Database | Railway/Next.js | Supabase | PostgreSQL | Supabase Dashboard |

**La conexión real se establece en:**
1. **Provision:** `lib/hikvision/sdk.ts` → Dispositivo (outbound)
2. **Webhook:** Dispositivo → `pages/api/webhooks/attendance.ts` (inbound)
3. **Database:** `lib/supabase/server.ts` → Supabase (outbound)






