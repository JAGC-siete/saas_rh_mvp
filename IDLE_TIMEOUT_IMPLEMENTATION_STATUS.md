# Estado de Implementación: Idle Timeout 90 Minutos

## 📊 Resumen Ejecutivo

**Grado de Implementación: ~50%**

La infraestructura base está implementada, pero faltan pasos críticos de integración que impiden que el idle timeout funcione en producción.

---

## ✅ COMPONENTES IMPLEMENTADOS (Infraestructura)

### 1. Base de Datos - Tabla `user_sessions`
**Archivo:** `supabase/migrations/20250129000001_create_user_sessions.sql`

**Estado:** ✅ COMPLETADO

**Evidencia:**
- Tabla creada con campos: `last_activity`, `idle_timeout_at`, `expires_at`, `revoked_at`
- Funciones RPC implementadas:
  - `update_session_activity()` - Rate-limited a 60s, actualiza `last_activity` y `idle_timeout_at`
  - `is_session_active()` - Verifica si sesión expirada (>90 min inactividad)
  - `create_user_session()` - Crea registro en tabla
  - `revoke_user_session()` - Revoca sesión
  - `revoke_all_user_sessions()` - Cierra todas las sesiones del usuario
  - `cleanup_expired_sessions()` - Limpieza periódica
- Índices para performance en `last_activity` y `idle_timeout_at`
- RLS policies configuradas

**Línea de referencia:** Líneas 6-235 del archivo de migración

### 2. Cliente Supabase - Auto-Refresh Deshabilitado
**Archivo:** `lib/supabase/client.ts`

**Estado:** ✅ COMPLETADO

**Evidencia:**
```71:86:lib/supabase/client.ts
    // Create browser client with proper configuration
    // CRITICAL: autoRefreshToken disabled for 90-min idle timeout enforcement
    // See: https://supabase.com/docs/guides/auth/sessions
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false, // Disabled to enforce idle timeout
        persistSession: true,
        detectSessionInUrl: false, // Only enable in callback routes
        storageKey: 'sb-auth-token',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      },
```

**También:** `lib/supabase/server.ts` línea 144, línea 126 del mismo archivo

**Justificación:** Según documentación oficial de Supabase: *"auto-refresh del cliente extiende sesiones sin actividad humana; para idle timeout, deshabilitar auto-refresh y controlar renovación en servidor"* (Supabase Docs, User Sessions).

### 3. Configuración de Cookies httpOnly
**Archivo:** `lib/supabase/server.ts`

**Estado:** ✅ COMPLETADO

**Evidencia:**
```25:54:lib/supabase/server.ts
      set(name: string, value: string, options: CookieOptions) {
        try {
          // Set maxAge to 1 day for auth cookies to match JWT expiry
          const isAuthCookie = name.includes('sb-') && name.includes('auth-token')
          const cookieMaxAge = isAuthCookie && !options?.maxAge 
            ? 24 * 60 * 60 // 1 day in seconds
            : options?.maxAge

          const cookie = serialize(name, value, {
            path: options?.path ?? '/',
            httpOnly: options?.httpOnly ?? true,
            secure: options?.secure ?? process.env.NODE_ENV === 'production',
            sameSite: (options?.sameSite as any) ?? 'lax',
            domain: options?.domain,
            maxAge: cookieMaxAge,
            expires: options?.expires,
          })
```

**Cookies configuradas:** `httpOnly: true`, `secure` en producción, `sameSite: 'lax'`

### 4. Configuración Railway - Trust Proxy
**Archivo:** `lib/config/railway.ts`

**Estado:** ✅ COMPLETADO

**Evidencia:**
```16:24:lib/config/railway.ts
export function configureExpressProxy(app: any) {
  // Trust all proxies (Railway edge terminates TLS)
  app.set('trust proxy', true)
  
  // Alternative: Trust specific proxies only
  // app.set('trust proxy', ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'])
  
  return app
}
```

**Justificación:** Railway termina TLS en el edge y requiere `trust proxy` para que cookies `Secure` funcionen (Express Docs, Behind Proxies). Sin esto, cookies no se respetan en producción.

### 5. Migración a @supabase/ssr
**Archivo:** `lib/supabase/server.ts`

**Estado:** ✅ COMPLETADO

**Evidencia:** Línea 1 importa `createServerClient` de `@supabase/ssr`

**Uso en código:**
```20:80:lib/supabase/server.ts
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies[name]
      },
      set(name: string, value: string, options: CookieOptions) {
        // ... configuración de cookies httpOnly
```

**Recomendación de Supabase:** Usar `@supabase/ssr` con cookies en lugar de localStorage para SSR (Next.js Server-Side Auth guide).

### 6. Endpoint Heartbeat
**Archivo:** `pages/api/auth/heartbeat.ts`

**Estado:** ✅ COMPLETADO

**Funcionalidad:**
- Actualiza `last_activity` llamando a `update_session_activity()` (rate-limited 60s)
- Verifica si sesión expirada por idle timeout
- Retorna minutos hasta expiración para UI

**Evidencia:** Líneas 47-89

---

## ❌ COMPONENTES NO IMPLEMENTADOS (Críticos)

### 1. Middleware NO Integrado en Flujo Principal
**Problema:** `lib/middleware/idle-timeout.ts` existe pero NO se usa en ningún endpoint de API

**Búsqueda realizada:** `grep -r "withIdleTimeout" pages/api/` → **0 resultados**

**Estado:** ❌ NO INTEGRADO

**Impacto:** El idle timeout de 90 min **NO SE EJECUTA** en ninguna request de API. Las APIs están desprotegidas.

### 2. Sesiones NO se Crean en Tabla `user_sessions`
**Problema:** La función `create_user_session()` existe pero NO se llama en ningún login

**Búsqueda:** `grep -r "create_user_session" pages/api/auth/` → Solo en documentación, no en código

**Archivos de login revisados:**
- `pages/api/auth/login-supabase.ts` - NO llama a `create_user_session`
- `pages/api/employees/auth/login.ts` - NO llama a `create_user_session`

**Estado:** ❌ NO IMPLEMENTADO

**Impacto:** Tabla `user_sessions` permanece vacía. Sin registros, no hay tracking de inactividad.

### 3. Middleware Principal NO Implementa Verificación de Idle Timeout
**Archivo:** `middleware.ts`

**Búsqueda:** `grep -i "idle\|session.*activity\|user_sessions" middleware.ts` → **0 resultados**

**Estado:** ❌ NO INTEGRADO

**Evidencia:**
- El middleware principal (líneas 273-676) solo verifica auth de Supabase
- No extrae `session_token` (jti)
- No llama a `is_session_active()`
- No actualiza `last_activity`

### 4. UI de Advertencia NO Existe
**Documentación menciona:** `components/SessionExpiryWarning.tsx`

**Búsqueda:** `find . -name "SessionExpiryWarning.tsx"` → **NO EXISTE**

**Estado:** ❌ NO IMPLEMENTADO

**Impacto:** Usuarios no reciben advertencia a los 80 minutos de inactividad.

### 5. Uso de localStorage en Cliente
**Archivo:** `lib/supabase/client.ts`

**Evidencia:** Líneas 79, 130:
```typescript
storage: typeof window !== 'undefined' ? window.localStorage : undefined
```

**Estado:** ⚠️ PARCIAL

**Explicación:** Aunque se usa `localStorage`, Supabase con `@supabase/ssr` persiste tokens en **cookies** para SSR. El `localStorage` es para compatibilidad con `persistSession: true`. Esto es **correcto** según implementación de Supabase SSR (el cliente sincroniza localStorage ↔ cookies).

**Evaluación:** ✅ ACEPTABLE - Requerimiento de Supabase SSR funciona así.

---

## 🔍 ANÁLISIS DETALLADO

### Sesiones en Base de Datos vs Auto-Refresh de Supabase

**Problema conceptual:**
1. Supabase con `autoRefreshToken: false` ya no renueva automáticamente el JWT
2. Pero la tabla `user_sessions` requiere que **manualmente** creemos registros al login
3. Sin registros en `user_sessions`, las funciones RPC no tienen datos para verificar

**Efecto cascada:**
- Login → No se crea registro en `user_sessions`
- Requests a APIs → No hay verificación de idle timeout (middleware no integrado)
- Tabla permanece vacía → Funciones RPC fallan silenciosamente

### Flujo Actual vs Flujo Requerido

**Flujo ACTUAL (no funcional):**
```
Login → Supabase Auth establece cookie → No hay registro en user_sessions
Request → Supabase valida JWT → No verifica idle timeout → Request OK
```

**Flujo REQUERIDO (según recomendaciones):**
```
Login → Supabase Auth establece cookie → create_user_session() crea registro
Request → Middleware verifica is_session_active() → Actualiza last_activity → Request OK
Si (now - last_activity) >= 90 min → 440 Session Expired
```

---

## 📋 CHECKLIST DE REQUISITOS

| Requisito | Estado | Evidencia |
|-----------|--------|-----------|
| Desactivar auto-refresh del cliente | ✅ COMPLETADO | `lib/supabase/client.ts:75` |
| Tabla `user_sessions` con tracking | ✅ ESTRUCTURA | `supabase/migrations/20250129000001_create_user_sessions.sql` |
| Middleware idle timeout implementado | ⚠️ PARCIAL | Existe en `lib/middleware/idle-timeout.ts` pero NO se usa |
| Crear sesiones al login | ❌ FALTA | No hay llamadas a `create_user_session()` |
| Verificar idle en APIs protegidas | ❌ FALTA | Middleware principal no integra verificación |
| Cookies httpOnly configuradas | ✅ COMPLETADO | `lib/supabase/server.ts:35` |
| Railway trust proxy configurado | ✅ COMPLETADO | `lib/config/railway.ts:18` |
| Persistencia en DB (no memoria) | ✅ COMPLETADO | Postgres usado, no memoria local |
| Endpoint heartbeat | ✅ COMPLETADO | `pages/api/auth/heartbeat.ts` |
| UI de advertencia | ❌ FALTA | Componente no existe |
| Métricas y observabilidad | ⚠️ PARCIAL | Logging existe, métricas específicas no implementadas |

---

## 🚨 BLOQUEADORES PARA PRODUCCIÓN

1. **Alto:** Sesiones no se crean → Tabla vacía → Idle timeout nunca aplica
2. **Alto:** Middleware no integrado → APIs no verifican inactividad
3. **Medio:** Falta UI de advertencia → UX degradada (no se avisa al usuario)

---

## 💡 RECOMENDACIÓN TÉCNICA

**Para completar implementación:**

1. **Al login** (en `pages/api/auth/login-supabase.ts` y `/api/employees/auth/login.ts`):
   - Extraer `jti` del JWT de Supabase
   - Llamar a `create_user_session()` con metadata
   
2. **Integrar middleware** en `pages/api/**/*.ts`:
   - Envolver handlers con `withIdleTimeout(handler)`
   - O integrar en middleware.ts principal

3. **Crear componente UI:**
   - `components/SessionExpiryWarning.tsx`
   - Hook `useSessionExpiryMonitor()` que llama heartbeat cada 5 min

4. **Configurar cron job:**
   - Ejecutar `cleanup_expired_sessions()` diariamente

---

## 📚 REFERENCIAS CONSULTADAS

- [Supabase User Sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase SSR for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Express Behind Proxies](https://expressjs.com/en/guide/behind-proxies.html)
- [Railway Sticky Sessions](https://station.railway.com/feedback/sticky-sessions-fa65efc4)

---

**Generado:** 2025-01-29  
**Archivos evaluados:** 15+ archivos del proyecto  
**Método:** Búsqueda de código + verificación de implementación
