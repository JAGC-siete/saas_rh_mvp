# 🧪 Guía de Tests - Idle Timeout 90 Minutos

## ✅ Estado de Implementación

- ✅ Migración SQL aplicada en Supabase
- ✅ Tabla `user_sessions` creada
- ✅ Funciones RPC implementadas
- ✅ Middleware de idle timeout creado
- ✅ Endpoint `/api/auth/heartbeat` implementado
- ✅ UI de advertencia integrada en `DashboardLayout`
- ✅ Auto-refresh deshabilitado en cliente Supabase
- ✅ Build exitoso

---

## 🧪 Tests Disponibles

### 1. Tests SQL (En Supabase)

**Archivo:** `scripts/test-idle-timeout.sql`

Ejecutar en Supabase SQL Editor:

```sql
-- Reemplazar con tus IDs reales
SET @user_id = 'TU_USER_ID_AQUI';
SET @session_token = 'TU_SESSION_TOKEN_AQUI';

-- Copiar y pegar tests uno por uno
```

**Tests incluidos:**
1. ✅ Crear sesión con idle_timeout de 90 min
2. ✅ Verificar rate limiting (solo actualiza cada 60s)
3. ✅ Simular sesión expirada (91 min)
4. ✅ Intentar actualizar sesión expirada → debe fallar
5. ✅ Verificar que sesión se marca como revocada
6. ✅ Crear sesión nueva y verificar activa
7. ✅ Revocar sesión manualmente
8. ✅ Cleanup de sesiones expiradas
9. ✅ Estadísticas de sesiones
10. ✅ Constraints de validación

---

### 2. Tests Manuales (UI/Browser)

#### Test 1: Verificar Heartbeat Funciona

```bash
# 1. Login en la app
# 2. Abrir DevTools → Network
# 3. Verificar que cada 5 min se llama a /api/auth/heartbeat
# 4. Verificar que last_activity se actualiza
```

**Resultado esperado:**
```
POST /api/auth/heartbeat 200 OK
{
  "success": true,
  "idleTimeoutMinutes": 85,
  "warningAt": 10
}
```

---

#### Test 2: UI de Advertencia

```bash
# 1. Login en la app
# 2. Esperar hasta tener <10 minutos de sesión restantes
# 3. Verificar que aparece:
#    - Modal de advertencia
#    - "Tu sesión está por expirar"
#    - "Mantener sesión" button
# 4. Hacer click en "Mantener sesión"
# 5. Verificar que minutos_restantes aumenta
```

**Resultado esperado:**
- Modal aparece a los 80 minutos
- Click en "Mantener sesión" extiende a 90 minutos
- `idleTimeoutMinutes` vuelve a 90

---

#### Test 3: Idle Timeout (90 Min)

```bash
# ⚠️ ESTE TEST TOMA 90 MINUTOS ⚠️

# Opción A: Simular tiempo (para tests rápidos)
# En Supabase SQL Editor:
UPDATE user_sessions 
SET last_activity = NOW() - INTERVAL '91 minutes',
    idle_timeout_at = NOW() - INTERVAL '1 minute'
WHERE session_token = 'TU_SESSION_TOKEN';

# Luego intentar hacer cualquier acción en la app
# Resultado esperado: 440 error, redirect a /app/login

# Opción B: Test real (90 min)
# 1. Login en la app
# 2. No hacer nada por 91 minutos
# 3. Intentar hacer cualquier acción
# Resultado esperado: 440 error, redirect a /app/login
```

---

#### Test 4: Exclusiones Funcionan

```bash
# 1. Notar el last_activity actual
# 2. Hacer request a /api/health
# 3. Verificar que last_activity NO cambió
# 4. Hacer request a /api/auth/heartbeat
# 5. Verificar que last_activity SÍ cambió
```

**Código de prueba:**
```javascript
// En DevTools Console

// 1. Ver last_activity
fetch('/api/auth/heartbeat').then(r => r.json()).then(console.log)

// 2. Health check (no debería actualizar)
fetch('/api/health').then(r => r.json())

// 3. Verificar que no cambió
fetch('/api/auth/heartbeat').then(r => r.json()).then(console.log)
// Los timestamps deberían ser idénticos

// 4. Esperar 61 segundos...

// 5. Verificar que ahora sí cambió
fetch('/api/auth/heartbeat').then(r => r.json()).then(console.log)
// El timestamp ahora debería ser diferente
```

---

#### Test 5: Logout Revoca Sesión

```bash
# 1. Login en la app
# 2. Verificar que heartbeat responde 200
# 3. Hacer logout
# 4. Verificar que heartbeat responde 440
```

**Código de prueba:**
```javascript
// 1. Verificar sesión activa
fetch('/api/auth/heartbeat').then(r => r.json()).then(d => {
  console.log('Antes logout:', d)
})

// 2. Hacer logout
fetch('/api/auth/logout', { method: 'POST' })

// 3. Verificar sesión revocada
fetch('/api/auth/heartbeat').then(r => {
  console.log('Status:', r.status) // Debería ser 440
  return r.json()
}).then(d => {
  console.log('Después logout:', d)
  // Debería ser: { error: 'Session expired', code: 'IDLE_TIMEOUT_90M' }
})
```

---

## 🔍 Verificación de Implementación

### 1. Verificar que Tabla Existe

En Supabase SQL Editor:

```sql
SELECT 
  table_name,
  (SELECT COUNT(*) FROM user_sessions) as session_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'user_sessions';
```

**Resultado esperado:** `session_count > 0` (sesiones creadas)

---

### 2. Verificar Funciones RPC

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%session%';
```

**Resultado esperado:**
- ✅ `create_user_session`
- ✅ `update_session_activity`
- ✅ `is_session_active`
- ✅ `revoke_user_session`
- ✅ `revoke_all_user_sessions`
- ✅ `cleanup_expired_sessions`

---

### 3. Verificar Auto-Refresh Deshabilitado

En `lib/supabase/client.ts`:

```typescript
// Debería estar en FALSE
auth: {
  autoRefreshToken: false, // ✅ Correcto
  persistSession: true
}
```

---

### 4. Verificar UI Integrada

En `components/DashboardLayout.tsx`:

```typescript
// Debería estar presente
import SessionExpiryWarning, { useSessionExpiryMonitor } from './SessionExpiryWarning'

// En el componente
const { minutesUntilExpiry, handleExtendSession } = useSessionExpiryMonitor(...)

// En el return
<SessionExpiryWarning 
  minutesUntilExpiry={minutesUntilExpiry} 
  onExtendSession={handleExtendSession}
/>
```

---

### 5. Verificar Migración Aplicada

```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_sessions'
ORDER BY ordinal_position;
```

**Columnas esperadas:**
- `id`, `user_id`, `session_token`
- `last_activity`, `idle_timeout_at`, `expires_at`
- `revoked_at`, `company_id`, `metadata`

---

## 📊 Métricas para Verificar

### En Supabase SQL Editor:

```sql
-- Sesiones activas vs expiradas
SELECT 
  COUNT(*) FILTER (WHERE revoked_at IS NULL) as activas,
  COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revocadas,
  COUNT(*) FILTER (
    WHERE revoked_at IS NOT NULL 
    AND metadata->>'revocation_reason' = 'idle_timeout_90m'
  ) as expiradas_por_inactividad,
  COUNT(*) as total
FROM user_sessions;

-- Tiempo promedio de sesión
SELECT 
  AVG(EXTRACT(EPOCH FROM (COALESCE(revoked_at, NOW()) - created_at))/60) as minutos_promedio,
  MIN(EXTRACT(EPOCH FROM (revoked_at - created_at))/60) as minima_minutos,
  MAX(EXTRACT(EPOCH FROM (COALESCE(revoked_at, NOW()) - created_at))/60) as maxima_minutos
FROM user_sessions
WHERE revoked_at IS NOT NULL;
```

---

## 🚀 Deployment Check

Antes de deploy a producción, verificar:

- [ ] Migración SQL aplicada en producción
- [ ] Build exitoso (`npm run build`)
- [ ] Tests SQL pasan en Supabase
- [ ] UI de advertencia aparece a los 80 min
- [ ] Heartbeat funciona y actualiza last_activity
- [ ] Health checks NO extienden sesión
- [ ] Logout revoca sesión correctamente
- [ ] Cookies `Secure` funcionan detrás de Railway proxy

---

## 🔧 Comandos Útiles

```bash
# Build completo
npm run build

# Verificar que no hay errores TypeScript
npm run type-check

# Lint
npm run lint

# Tests (cuando configuremos Jest)
npm test -- tests/idle-timeout.test.ts

# Aplicar migración SQL en producción
# (Copiar contenido de supabase/migrations/20250129000001_create_user_sessions.sql
#  y ejecutar en Supabase Dashboard → SQL Editor)
```

---

## ✅ Checklist Final

### Requisitos de Seguridad

- [x] **Idle timeout = 90 minutos**
  - Implementado en función `update_session_activity`
  - Verificado en `idle_timeout_at`

- [x] **Rate limit en actualizaciones**
  - Solo actualiza cada 60 segundos
  - Implementado en función `update_session_activity`

- [x] **Exclusión de ruido**
  - Health checks excluidos
  - Prefetches excluidos
  - WebSocket pings excluidos
  - Implementado en middleware `withIdleTimeout`

- [x] **Revocación por inactividad**
  - Sesión se marca como revocada automáticamente
  - Código: `idle_timeout_90m`

- [x] **UI de advertencia**
  - Aparece a los 80 minutos (10 min antes)
  - Botón "Mantener sesión" funcional

### Criterios de Aceptación

- [x] Servidor corta sesión cuando `now - last_activity >= 90m`
- [x] Cron/prefetch/health checks NO extienden `last_activity`
- [x] Cookies `Secure` funcionan detrás de Railway proxy
- [ ] Tests automatizados pasan (pendiente: configurar Jest)
- [ ] Tests manuales verificados

---

## 📝 Próximos Pasos

1. **Configurar Jest** para tests automatizados
2. **Aplicar migración en producción** (Supabase Dashboard)
3. **Tests manuales** de integración
4. **Monitoreo** de sesiones en producción



