# Evaluación de Implementación: Idle Timeout 90 Minutos

## 🔍 Análisis del Error

### Problema Identificado
El error ocurría porque se intentaba inicializar `createClient()` de Supabase **antes** de que las variables de entorno estuvieran disponibles en el cliente del navegador.

**Error específico:**
```
Application configuration error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY missing
```

### Archivos Causantes
1. **`components/SessionExpiryWarning.tsx`** (líneas 7, 20, 76)
   - Importaba `createClient` al inicio del archivo
   - Lo llamaba inmediatamente en el `useEffect`, antes de que las variables estuvieran cargadas

2. **`pages/_app.tsx`** (líneas 3, 40)
   - Intentaba crear el cliente de Supabase inmediatamente en el mount

### Solución Aplicada
1. **Eliminadas todas las llamadas a `createClient()` en componentes que se montan antes de que AuthProvider termine de cargar las variables**
2. **`SessionExpiryWarning` ahora usa solo fetch API** en lugar de intentar crear un cliente de Supabase
3. **`_app.tsx` ya no inicializa el cliente**, dejando esa responsabilidad a `AuthProvider`

---

## 📊 Estado de Implementación vs Criterios Requeridos

### 1. Fuente de Verdad en Backend

| Criterio | Estado | Detalles |
|----------|--------|----------|
| Tabla `user_sessions` | ✅ **Implementado** | Archivo: `supabase/migrations/20250129000001_create_user_sessions.sql` |
| Campo `last_activity` | ✅ **Implementado** | Línea 14: `last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| Campo `idle_timeout_at` | ✅ **Implementado** | Línea 16: `idle_timeout_at TIMESTAMPTZ NOT NULL` |
| Función `is_session_active()` | ✅ **Implementado** | Líneas 134-163 |
| Función `update_session_activity()` | ✅ **Implementado** | Líneas 46-89, rate-limited a 60s |
| Función `create_user_session()` | ✅ **Implementado** | Líneas 92-131 |

**Veredicto:** ✅ **COMPLETO** - El backend tiene toda la infraestructura necesaria.

---

### 2. Middleware de Idle Timeout

| Criterio | Estado | Detalles |
|----------|--------|----------|
| Verificación automática en todas las rutas | ✅ **Implementado** | `middleware.ts` líneas 360-403 |
| Cálculo `now - last_activity >= 90min` | ✅ **Implementado** | Línea 151: verificada en `is_session_active()` |
| Respuesta 440 si expirado | ✅ **Implementado** | Líneas 371-379 |
| Actualización rate-limited | ✅ **Implementado** | Función `update_session_activity` líneas 78-84 |
| Exclusión de health checks | ❌ **No verificado** | Pendiente revisión en `shouldExcludeRequest()` |

**Veredicto:** ⚠️ **CASI COMPLETO** - Falta verificar exclusión de health checks.

---

### 3. Desactivación de Auto-Refresh del Cliente

| Criterio | Estado | Detalles |
|----------|--------|----------|
| `autoRefreshToken: false` | ✅ **Implementado** | `lib/supabase/client.ts` líneas 75, 126 |
| No extension por "ruido" | ✅ **Implementado** | Refresh deshabilitado completamente |
| Migrado a SSR con cookies | ⚠️ **Parcial** | Se usa `createBrowserClient` pero sin cookies httpOnly completas |

**Veredicto:** ⚠️ **PARCIAL** - Auto-refresh deshabilitado, pero no migrado completamente a SSR.

---

### 4. Cookies Endurecidas

| Criterio | Estado | Detalles |
|----------|--------|----------|
| HttpOnly | ✅ **Implementado** | `lib/supabase/server.ts` línea 35 |
| Secure | ✅ **Implementado** | Línea 36: `secure: options?.secure ?? process.env.NODE_ENV === 'production'` |
| SameSite=Lax | ✅ **Implementado** | Línea 37 |
| MaxAge 1 día | ✅ **Implementado** | Líneas 28-31 |
| Railway trust proxy | ⚠️ **Pendiente verificar** | Existe `lib/config/railway.ts` pero no confirmado |

**Veredicto:** ⚠️ **PARCIAL** - Cookies configuradas pero falta verificar `trust proxy` en Railway.

---

### 5. Escalado en Railway (Stateless)

| Criterio | Estado | Detalles |
|----------|--------|----------|
| Sesiones en DB (no memoria) | ✅ **Implementado** | Tabla `user_sessions` en Postgres |
| No sticky sessions | ✅ **No requiere** | Implementación stateless |
| Persistencia en Postgres compartida | ✅ **Implementado** | Todas las funciones usan la DB |

**Veredicto:** ✅ **COMPLETO** - Implementación stateless correcta.

---

### 6. Observabilidad

| Criterio | Estado | Detalles |
|----------|--------|----------|
| Métricas de sesión | ❌ **No implementado** | Falta logging estructurado |
| Logs de 401/440 | ⚠️ **Básico** | Solo console.log en middleware |
| Dashboard de sesiones | ❌ **No implementado** | Falta vista administrativa |
| Alertas | ❌ **No implementado** | No hay sistema de alertas |

**Veredicto:** ❌ **INCOMPLETO** - Falta implementar observabilidad completa.

---

## ✅ Funcionalidad Implementada

1. **Tabla `user_sessions`** con tracking de actividad ✅
2. **Middleware que verifica idle timeout** en cada request ✅
3. **Endpoint `/api/auth/heartbeat`** para mantener sesión ✅
4. **UI de advertencia** a los 80 minutos ✅
5. **Auto-refresh deshabilitado** en cliente ✅

---

## ❌ Funcionalidad Faltante

1. **Migración completa a SSR** con cookies httpOnly
2. **Logging estructurado** de eventos de sesión
3. **Dashboard de monitoreo** de sesiones activas
4. **Sistema de alertas** para picos de 401/440
5. **Verificación de exclusión** de health checks en middleware

---

## 📝 Decisiones Técnicas vs Recomendaciones

| Recomendación | Estado | Acción |
|---------------|--------|--------|
| Migrar a SSR con `@supabase/ssr` y cookies httpOnly | ⚠️ **Parcial** | Usa `createBrowserClient` pero parcialmente SSR |
| Eliminar uso de `localStorage` para tokens | ❌ **No completado** | Todavía se usa en líneas 79, 130 |
| `trust proxy` en Express/Railway | ⚠️ **Pendiente** | Existe archivo pero no verificado en producción |
| Access token 30-60 min | ⚠️ **No configurado** | Necesita configurarse en Supabase Dashboard |
| Refresh rotation activa | ⚠️ **No verificado** | Requiere configuración en Supabase |

---

## 🎯 Grado de Implementación

**Completitud:** 70/100

- ✅ Backend completo (100%)
- ✅ Middleware funcional (90%)
- ⚠️ Cliente optimizado (60%)
- ✅ Escalabilidad (100%)
- ❌ Observabilidad (20%)

---

## 🔧 Acciones Inmediatas Requeridas

1. **Verificar configuración en Supabase Dashboard:**
   - Access token TTL: 30-60 minutos
   - Refresh token rotation: habilitada

2. **Verificar Railway:**
   - Variables de entorno configuradas ✅
   - Trust proxy en Express (revisar `lib/config/railway.ts`)

3. **Implementar observabilidad:**
   - Agregar logging estructurado en middleware
   - Crear queries SQL para dashboard

4. **Completar migración SSR:**
   - Migrar completamente a cookies httpOnly
   - Eliminar uso de localStorage para tokens

---

## 📝 Notas Finales

El error crítico ya fue resuelto. Las variables de entorno se cargan correctamente ahora que eliminamos las inicializaciones prematuras del cliente de Supabase en `SessionExpiryWarning` y `_app.tsx`.

**La aplicación debería funcionar correctamente ahora**, con la implementación de idle timeout 90 minutos funcional en su mayoría, pendiente de completar observabilidad y verificación de configuración de producción.

