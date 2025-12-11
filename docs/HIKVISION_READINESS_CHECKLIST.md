# ✅ Checklist de Preparación: Hikvision ↔ SaaS

## 📋 Verificación Completa de Configuración

### ✅ 1. CÓDIGO LOCAL (Desarrollo)

#### SDK de Hikvision
- ✅ `lib/hikvision/sdk.ts` - Implementado
  - ✅ `getSystemInfo()` - Conexión al dispositivo
  - ✅ `setNotificationServer()` - Configuración de httpHosts
  - ✅ `getHttpHostsCapabilities()` - Verificación de capacidades
  - ✅ Digest Authentication implementado
  - ✅ Timeout configurado a 30 segundos
  - ✅ Protocolo HTTP/HTTPS dinámico

#### Endpoints de API
- ✅ `pages/api/admin/devices/provision.ts` - Provisionamiento con auth
  - ✅ Construcción de webhook URL con fallback
  - ✅ Validación de localhost en producción
  - ✅ Configuración de httpHosts en dispositivo
  - ✅ Actualización de BD con estado

- ✅ `pages/api/hikvision/provision.ts` - Provisionamiento interno
  - ✅ Misma funcionalidad que admin endpoint
  - ✅ Construcción automática de webhook URL si no se provee

- ✅ `pages/api/webhooks/attendance.ts` - Recepción de eventos
  - ✅ Parse de form data (formidable)
  - ✅ Parse de JSON del evento
  - ✅ Normalización de DNI
  - ✅ Búsqueda de empleado
  - ✅ Registro en attendance_records
  - ✅ Manejo de heartbeats y eventos de autenticación

#### Configuración de Variables
- ✅ `lib/env.ts` - Manejo de variables de entorno
  - ✅ `NEXT_PUBLIC_SITE_URL` con fallback
  - ✅ `RAILWAY_PUBLIC_DOMAIN` como fallback secundario

**Estado:** ✅ **COMPLETO** - Todo el código necesario está implementado

---

### ✅ 2. SUPABASE (Base de Datos)

#### Migraciones
- ✅ `supabase/migrations/20251130122811_create_devices_table.sql`
  - ✅ Tabla `devices` creada
  - ✅ Campos: `ip_address`, `port`, `username`, `vault_secret_id`
  - ✅ Campos: `status`, `webhook_url`, `settings`
  - ✅ RLS habilitado

- ✅ `supabase/migrations/20251201000000_add_devices_webhook_columns.sql`
  - ✅ `password_encrypted` - Columna temporal para compatibilidad
  - ✅ `http_host_id` - ID del httpHost configurado
  - ✅ `webhook_configured` - Flag de configuración exitosa
  - ✅ `last_webhook_test_at` - Timestamp del último test
  - ✅ `webhook_test_result` - Resultado del test (JSONB)
  - ✅ Índices creados

#### Tablas Requeridas
- ✅ `devices` - Almacena configuración de dispositivos
- ✅ `employees` - Almacena empleados (para matching por DNI)
- ✅ `attendance_records` - Almacena registros de asistencia
- ✅ `companies` - Almacena compañías (multi-tenant)

**Estado:** ✅ **COMPLETO** - Todas las migraciones están listas

**Acción Requerida:**
- ⚠️ **EJECUTAR MIGRACIONES EN SUPABASE** (según tu preferencia [[memory:8692480]])
  - Ejecutar `20251201000000_add_devices_webhook_columns.sql` en Supabase Dashboard

---

### ✅ 3. RAILWAY (Producción)

#### Variables de Entorno Requeridas

**Críticas para Hikvision:**
- ✅ `NEXT_PUBLIC_SITE_URL` - **DEBE estar configurado**
  - Debe ser: `https://humanosisu.net` (o tu dominio de producción)
  - **NO puede ser localhost en producción**
  - Se usa para construir webhook URL

**Opcionales pero recomendadas:**
- `RAILWAY_PUBLIC_DOMAIN` - Fallback si NEXT_PUBLIC_SITE_URL no está
- `NEXT_PUBLIC_SUPABASE_URL` - Para conexión a Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Para operaciones admin

**Estado:** ⚠️ **VERIFICAR MANUALMENTE**

**Acción Requerida:**
```bash
# Verificar en Railway Dashboard o CLI
railway variables | grep NEXT_PUBLIC_SITE_URL

# Debe mostrar:
# NEXT_PUBLIC_SITE_URL=https://humanosisu.net
```

---

### ✅ 4. ENDPOINTS PÚBLICOS

#### Webhook Endpoint
- ✅ `POST /api/webhooks/attendance?company_id=...`
  - ✅ Público (no requiere autenticación)
  - ✅ Acepta POST requests
  - ✅ Content-Type: `application/x-www-form-urlencoded`
  - ✅ Body: `AccessControllerEvent={...JSON...}`
  - ✅ Responde 200 OK en éxito

**Verificación:**
```bash
# Probar endpoint (desde Railway o local)
curl -X POST "https://humanosisu.net/api/webhooks/attendance?company_id=test" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "AccessControllerEvent={\"eventType\":\"heartBeat\"}"
```

**Estado:** ✅ **COMPLETO** - Endpoint está implementado y listo

---

### ✅ 5. CONFIGURACIÓN DEL DISPOSITIVO

#### Lo que el SaaS hace automáticamente:
1. ✅ Conecta al dispositivo usando IP:PORT
2. ✅ Autentica con Digest Auth
3. ✅ Obtiene información del sistema (getSystemInfo)
4. ✅ Configura httpHosts usando PUT /ISAPI/Event/notification/httpHosts
5. ✅ Prueba la configuración usando POST /httpHosts/1/test
6. ✅ Actualiza BD con estado de configuración

#### Lo que DEBE estar configurado en el dispositivo ANTES:
- ⚠️ **IP del dispositivo debe ser accesible desde Railway**
  - Si está en red privada, necesita:
    - VPN o túnel
    - Port forwarding
    - IP pública

- ⚠️ **Credenciales del dispositivo**
  - Username y password deben estar en Supabase (tabla `devices`)
  - Actualmente se almacenan en `password_encrypted` (texto plano)
  - **TODO FUTURO:** Mover a Supabase Vault

- ⚠️ **Dispositivo debe tener acceso a internet**
  - Para enviar webhooks HTTPS al SaaS
  - DNS debe resolver el dominio del SaaS
  - Firewall debe permitir salida HTTPS (puerto 443)

**Estado:** ⚠️ **REQUIERE CONFIGURACIÓN MANUAL EN EL DISPOSITIVO**

---

## 🎯 RESUMEN: ¿Qué está listo y qué falta?

### ✅ **LISTO (En nuestras manos):**

1. **Código Local:**
   - ✅ SDK completo con setNotificationServer()
   - ✅ Endpoints de provisionamiento
   - ✅ Endpoint de webhook
   - ✅ Manejo de errores y validaciones
   - ✅ Timeout y protocolo corregidos

2. **Supabase:**
   - ✅ Migraciones creadas
   - ✅ Estructura de BD lista
   - ⚠️ **FALTA:** Ejecutar migración `20251201000000_add_devices_webhook_columns.sql`

3. **Railway:**
   - ✅ Código desplegado (después de commit)
   - ⚠️ **FALTA:** Verificar `NEXT_PUBLIC_SITE_URL` está configurado

### ⚠️ **FALTA (Requiere acción):**

1. **Supabase:**
   - [ ] Ejecutar migración `20251201000000_add_devices_webhook_columns.sql` en Supabase Dashboard

2. **Railway:**
   - [ ] Verificar que `NEXT_PUBLIC_SITE_URL` está configurado y apunta a dominio público
   - [ ] Verificar que el servicio está desplegado y funcionando

3. **Dispositivo Hikvision:**
   - [ ] Dispositivo debe tener IP accesible desde Railway
   - [ ] Credenciales del dispositivo deben estar en Supabase (tabla `devices`)
   - [ ] Dispositivo debe tener acceso a internet
   - [ ] DNS del dispositivo debe resolver el dominio del SaaS
   - [ ] Firewall del dispositivo debe permitir salida HTTPS

---

## 📝 CHECKLIST FINAL ANTES DE PROVISIONAR DISPOSITIVO

### En Supabase:
- [ ] Migración `20251201000000_add_devices_webhook_columns.sql` ejecutada
- [ ] Tabla `devices` tiene registros con:
  - [ ] `ip_address` (IP accesible desde Railway)
  - [ ] `port` (típicamente 80)
  - [ ] `username` (usuario del dispositivo)
  - [ ] `password_encrypted` (contraseña del dispositivo)
  - [ ] `company_id` (ID de la compañía)

### En Railway:
- [ ] `NEXT_PUBLIC_SITE_URL` configurado = `https://humanosisu.net` (o tu dominio)
- [ ] Servicio desplegado y funcionando
- [ ] Endpoint `/api/webhooks/attendance` responde (probar con curl)

### En el Dispositivo:
- [ ] IP del dispositivo es accesible desde Railway
- [ ] Dispositivo tiene acceso a internet
- [ ] DNS del dispositivo resuelve el dominio del SaaS
- [ ] Firewall permite salida HTTPS

### Proceso de Provisionamiento:
1. [ ] Llamar `POST /api/admin/devices/provision` con `deviceId`
2. [ ] Verificar que el dispositivo se conecta (getSystemInfo)
3. [ ] Verificar que httpHosts se configura (setNotificationServer)
4. [ ] Verificar que el test del webhook pasa
5. [ ] Verificar en BD que `webhook_configured = true`

---

## ✅ CONCLUSIÓN

**Desde nuestro lado (código, Supabase, Railway):**
- ✅ **99% LISTO**
- ⚠️ Solo falta:
  1. Ejecutar migración en Supabase
  2. Verificar `NEXT_PUBLIC_SITE_URL` en Railway

**Desde el lado del dispositivo:**
- ⚠️ **Requiere configuración de red y credenciales**
- El dispositivo debe poder:
  - Ser alcanzado desde Railway (IP accesible)
  - Alcanzar el SaaS (acceso a internet + DNS)

**Una vez que el dispositivo esté en la red correcta y las credenciales estén en Supabase, el provisionamiento es automático desde el SaaS.**






