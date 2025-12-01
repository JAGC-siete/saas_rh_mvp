# Timeline de Incorporación de POST Requests a /api/webhooks/attendance

## Resumen Ejecutivo

Los POST requests a `/api/webhooks/attendance` comenzaron a llegar **después de que se provisionaron los dispositivos Hikvision** usando el endpoint de provisionamiento creado en el commit `c2f239cf`.

## Timeline de Commits Relevantes

### 1. Creación del Endpoint de Webhooks (Funcional)
**Commits**: `c22df1d7`, `792b99bb`, `014aaa0b` (Nov 2025)
- Se creó el endpoint `/api/webhooks/attendance`
- Usaba `createPagesServerClient` (funcional)
- Procesaba eventos de dispositivos Hikvision usando `formidable`

### 2. Implementación del Sistema de Provisionamiento
**Commit `c2f239cf`** (Sun Nov 30 13:10:37 2025)
- **Mensaje**: `feat(hikvision): Implement Secure Proxy Service for Device Mgmt (Phase 0-1)`
- **Cambios críticos**:
  - Creó el endpoint `/api/admin/devices/provision.ts`
  - Este endpoint configura los dispositivos Hikvision para enviar webhooks
  - **Línea 44**: Configura `webhookUrl = ${baseUrl}/api/webhooks/attendance?company_id=${company_id}`
  - **Línea 92**: Guarda `webhook_url` en la base de datos
  - **PROBLEMA**: También cambió `createPagesServerClient` a `createAdminClient` en el endpoint de webhooks

### 3. Integración del Proxy Hikvision
**Commit `5a1bbf74`** (Sun Nov 30 17:04:03 2025)
- **Mensaje**: `feat: Integrar proxy Hikvision como API routes de Next.js`
- Integró el proxy Hikvision dentro del servicio Next.js
- Cambió configuración de `next.config.js` (eliminó `publicRuntimeConfig`)

### 4. Cuando se Activan los POST Requests

Los POST requests **comenzaron a llegar** cuando:
1. Un administrador usó el endpoint `/api/admin/devices/provision` para provisionar un dispositivo
2. El dispositivo Hikvision fue configurado con la URL del webhook
3. El dispositivo empezó a enviar eventos HTTP POST a `/api/webhooks/attendance`

## Problema Identificado

### Secuencia de Eventos que Causa el 502:

1. **Dispositivo se provisiona** → Se configura `webhook_url` en el dispositivo Hikvision
2. **Dispositivo envía POST** → El dispositivo envía eventos a `/api/webhooks/attendance`
3. **Servidor recibe request** → Next.js intenta procesar el request
4. **Servidor crashea** → `createAdminClient()` (introducido en c2f239cf) causa crash
5. **502 Bad Gateway** → Cloudflare/Railway retorna 502 porque el servidor no responde

### Commits Problemáticos en Orden:

1. **`c2f239cf`** (Nov 30 13:10) - Cambió a `createAdminClient` + Creó provisionamiento
2. **`5a1bbf74`** (Nov 30 17:04) - Cambió `next.config.js` (eliminó `publicRuntimeConfig`)
3. **`6a7c63e6`** (Dec 1 10:46) - Intentó fix del favicon (no resolvió el problema principal)
4. **`f706b6a8`** (Dec 1 12:09) - Intentó mejorar manejo de errores (no resolvió)
5. **`72decd43`** (Dec 1) - Restauró `next.config.js` (parcialmente efectivo)
6. **`d8e6de93`** (Dec 1) - Revirtió a `createPagesServerClient` (debería resolver)

## Verificación Cruzada

### Endpoint de Provisionamiento
**Archivo**: `pages/api/admin/devices/provision.ts`
- **Línea 44**: Construye la URL del webhook
- **Línea 92**: Guarda `webhook_url` en la base de datos
- **Línea 98**: TODO indica que falta implementar la configuración real del dispositivo

### Endpoint de Webhooks
**Archivo**: `pages/api/webhooks/attendance.ts`
- **ANTES (c2f239cf~1)**: Usaba `createPagesServerClient({ req, res })` ✅ Funcional
- **DESPUÉS (c2f239cf)**: Cambió a `createAdminClient()` ❌ Causa crashes
- **ACTUAL (d8e6de93)**: Revertido a `createPagesServerClient({ req, res })` ✅ Debería funcionar

## Conclusión

Los POST requests comenzaron a llegar **después del commit `c2f239cf`** cuando:
1. Se provisionó el primer dispositivo usando `/api/admin/devices/provision`
2. El dispositivo fue configurado para enviar webhooks
3. El dispositivo empezó a enviar eventos

El problema del 502 se debe a que el commit `c2f239cf` cambió el código del endpoint de webhooks de una versión funcional (`createPagesServerClient`) a una problemática (`createAdminClient`), justo cuando los dispositivos empezaron a enviar requests.

## Próximos Pasos

1. ✅ Revertir a `createPagesServerClient` (commit d8e6de93) - COMPLETADO
2. ⏳ Verificar que el servidor pueda procesar los POST requests
3. ⏳ Confirmar que los dispositivos puedan enviar webhooks sin causar 502
4. ⏳ Monitorear logs para verificar que el problema está resuelto

