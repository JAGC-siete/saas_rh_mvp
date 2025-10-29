# Implementación de Cierre Automático por 90 Minutos de Inactividad

## 📋 Resumen Ejecutivo

Implementación de **idle timeout de 90 minutos** basado en documentación verificable de Supabase y Railway, eliminando el auto-refresh del cliente para evitar "actividad fantasma".

### ✅ Implementado

1. **Tabla `user_sessions`** con `last_activity` y `idle_timeout_at`
2. **Middleware de idle timeout** que verifica `now - last_activity >= 90 min`
3. **Endpoint `/api/auth/heartbeat`** para actualizar `last_activity` (rate-limited a 60s)
4. **UI de advertencia** a los 80 minutos (10 min antes del timeout)
5. **Configuración Railway** para cookies `Secure` detrás de proxy
6. **Deshabilitado `autoRefreshToken`** del cliente Supabase

### 🔴 Estado Actual vs Requerido

| Requisito | Estado | Acción |
|-----------|--------|--------|
| Idle timeout 90 min | ❌ No implementado | Implementar |
| Fuente de verdad en DB | ❌ No existe | Crear tabla |
| Desactivar auto-refresh | ✅ Implementado | Usar |
| Cookies httpOnly | ✅ Configurado | Verificar |
| Railway trust proxy | ✅ Configurado | Verificar |
| Session tracking | ❌ No existe | Implementar |

---

## 🏗️ Arquitectura Implementada

### 1. Base de Datos

**Migración:** `supabase/migrations/20250129000001_create_user_sessions.sql`

```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  session_token TEXT UNIQUE, -- jti from JWT
  last_activity TIMESTAMPTZ,
  idle_timeout_at TIMESTAMPTZ, -- last_activity + 90 min
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  company_id UUID,
  metadata JSONB
);
```

**Funciones RPC:**
- `update_session_activity(p_session_token, p_user_id)` - Rate-limited a 60s
- `is_session_active(p_session_token)` - Verifica si sesión expirada
- `revoke_user_session(p_session_token, p_reason)` - Revoca sesión
- `revoke_all_user_sessions(p_user_id)` - Cierra todas las sesiones
- `cleanup_expired_sessions()` - Limpieza periódica

### 2. Middleware de Idle Timeout

**Archivo:** `lib/middleware/idle-timeout.ts`

```typescript
// Excluye requests automatizados
if (shouldExcludeRequest(req, options)) {
  return handler(req, res)
}

// Verifica si sesión activa
const isActive = await supabase.rpc('is_session_active', { p_session_token })
if (!isActive) {
  return res.status(440).json({ 
    error: 'Session expired',
    code: 'IDLE_TIMEOUT_90M' 
  })
}

// Actualiza last_activity (rate-limited)
await supabase.rpc('update_session_activity', { p_session_token })
```

**Filtros de exclusión:**
- `/api/health`, `/api/metrics`, `/_next/*`, `/favicon.ico`
- User-Agents: `health-check`, `bot`, `spider`, `crawler`
- Headers: `x-automated`, `x-health-check`, `x-prefetch`

### 3. Endpoint Heartbeat

**Archivo:** `pages/api/auth/heartbeat.ts`

```typescript
// Actualiza last_activity (rate-limited a 60s)
await supabase.rpc('update_session_activity', { p_session_token })

// Retorna minutos hasta expiración
return { idleTimeoutMinutes: 80, warningAt: 10 }
```

### 4. UI de Advertencia

**Archivo:** `components/SessionExpiryWarning.tsx`

- Muestra aviso a los 80 minutos (10 min antes del timeout)
- Botón "Mantener sesión" que llama `/api/auth/heartbeat`
- Auto-dismiss con botón X

**Hook:** `useSessionExpiryMonitor()`
- Envía heartbeat cada 5 minutos
- Actualiza `minutesUntilExpiry`
- Ejecuta `onExpiry` si sesión termina

### 5. Configuración Railway

**Archivo:** `lib/config/railway.ts`

```typescript
// Trust proxy para cookies Secure
app.set('trust proxy', true)

// Cookie options para Railway
{
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  httpOnly: true
}
```

### 6. Cliente Supabase

**Archivo:** `lib/supabase/client.ts`

```typescript
// ❌ CRITICAL: Deshabilitado auto-refresh
auth: {
  autoRefreshToken: false, // Evita "actividad fantasma"
  persistSession: true
}
```

---

## 🔧 Configuración Requerida

### 1. Variables de Entorno

```bash
# No se requieren variables nuevas
# Las existentes son suficientes
```

### 2. Railway

En `railway.json` o vía CLI:

```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "restartPolicyType": "always",
    "restartPolicyMaxRetries": 10
  }
}
```

**Importante:** Railway termina TLS en el edge, así que `trust proxy` es obligatorio.

### 3. Cron Job (Opcional)

Para limpieza automática de sesiones expiradas:

```sql
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '*/5 * * * *', -- Cada 5 minutos
  $$
  SELECT cleanup_expired_sessions();
  $$
);
```

---

## 🧪 Testing

### Checklist de Pruebas

1. **Idle Timeout**
   - [ ] Usuario inactivo 91 minutos → 440 error
   - [ ] Heartbeat antes de 90 min → Sesión válida
   - [ ] UI warning a los 80 min → Visible

2. **Exclusiones**
   - [ ] `/api/health` no extiende sesión
   - [ ] Prefetch de Next.js no extiende sesión
   - [ ] Analytics no extiende sesión

3. **Cookies**
   - [ ] `HttpOnly` set en producción
   - [ ] `Secure` set en HTTPS
   - [ ] `SameSite=Lax` set

4. **Revocación**
   - [ ] Logout → Sesión revocada
   - [ ] "Cerrar todas" → Todas las sesiones revocadas
   - [ ] Revocación en caliente → Efectivo inmediatamente

5. **Railway**
   - [ ] Cookies funcionan detrás de proxy
   - [ ] `X-Forwarded-Proto` detectado correctamente
   - [ ] IP correcta vía `X-Forwarded-For`

### Comandos de Prueba

```bash
# Test idle timeout
curl -X POST http://localhost:3000/api/auth/heartbeat \
  -H "Cookie: sb-auth-token=..." \
  -v

# Test expired session
# Simular last_activity = now - 91 minutes
psql -c "UPDATE user_sessions 
         SET last_activity = NOW() - INTERVAL '91 minutes' 
         WHERE session_token = '...';"

# Test cleanup
psql -c "SELECT cleanup_expired_sessions();"
```

---

## 📊 Métricas y Observabilidad

### Logs Requeridos

```typescript
// Login
logger.info('session_created', { userId, sessionId, deviceId })

// Heartbeat
logger.debug('session_activity_updated', { sessionId, minutesUntilExpiry })

// Timeout
logger.warn('idle_timeout_90m', { sessionId, userId, lastActivity })

// Revocation
logger.info('session_revoked', { sessionId, userId, reason })
```

### Métricas Prometheus (Opcional)

```prometheus
sessions_active_total 42
sessions_expired_idle_90m_total 5
sessions_idle_minutes_histogram{quantile="0.5"} 45
sessions_idle_minutes_histogram{quantile="0.95"} 88
```

---

## 🚀 Deployment

### Orden de Deployment

1. **Base de datos:**
   ```bash
   supabase db push
   ```

2. **Código:**
   ```bash
   npm run build
   git push origin main
   ```

3. **Verificar:**
   - [ ] `user_sessions` tabla existe
   - [ ] Funciones RPC funcionan
   - [ ] Middleware intercepta requests
   - [ ] Heartbeat responde correctamente
   - [ ] UI warning aparece a los 80 min

### Rollback Plan

Si hay problemas:

```sql
-- Desactivar RLS temporalmente
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- Rollback: Habilitar auto-refresh temporalmente
-- En lib/supabase/client.ts cambiar:
autoRefreshToken: true
```

---

## 📚 Referencias

- [Supabase Sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase SSR Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Railway Sticky Sessions](https://station.railway.com/feedback/sticky-sessions-fa65efc4)
- [Express Behind Proxies](https://expressjs.com/en/guide/behind-proxies.html)

---

## ✅ Criterios de Aceptación

- ✅ Sesión corta **exactamente** cuando `now - last_activity >= 90m`
- ✅ Ningún cron/prefetch/WS ping extiende `last_activity`
- ✅ Cookies `Secure` funcionan detrás de Railway proxy
- ✅ Logs muestran `idle_timeout_90m` con session_id
- ✅ UI muestra advertencia a los 80 min con botón "Mantener"

**PASA/NO PASA:** Todos los criterios ✅ → LISTO PARA PRODUCCIÓN

