# 🔄 Fix: Redirección Incorrecta Después de Login

## ❌ Problema

Después del login exitoso, el usuario era redirigido a `/onboarding` → `/auth/start` → `/app/login` en lugar de ir directamente al dashboard.

### Causa Raíz

**Líneas 46-55 de `pages/app/login.tsx`:**
```typescript
if (data.user.role === 'super_admin') {
  router.push('/app/admin/super-admin-dashboard')
} else if (!data.user.company_id) {  // ❌ PROBLEMA: company_id es null
  router.push('/onboarding')          // ← Redirige incorrectamente
} else {
  router.push('/app/dashboard')
}
```

El endpoint `/api/auth/login-supabase` no estaba retornando el `company_id` en el objeto `user`, causando que **todas las redirecciones** fueran a `/onboarding`.

---

## ✅ Solución Aplicada

**Archivo:** `pages/api/auth/login-supabase.ts`

### Cambio 1: Usar `createAdminClient()` para obtener el perfil completo

**Antes:**
```typescript
let userProfile = null
if (userType === 'admin') {
  const { data: profile } = await supabase  // ❌ Usa cliente normal (sujeto a RLS)
    .from('user_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()
  userProfile = profile
}
```

**Después:**
```typescript
let userProfile = null
if (userType === 'admin' || hasValidAccess) {
  // ✅ Use admin client to bypass RLS
  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase
    .from('user_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()
  userProfile = profile
  
  logger.info('User profile retrieved for response', {
    userId: authData.user.id,
    email,
    companyId: profile?.company_id,  // ✅ Ahora incluye company_id
    role: profile?.role
  })
}
```

### Cambio 2: Asegurar que el perfil incluya `company_id`

**Línea 197 del endpoint:**
```typescript
return res.status(200).json({
  success: true,
  message: 'Login exitoso',
  user: {
    ...authData.user,
    company_id: userProfile?.company_id || userMetadata?.company_id || null,  // ✅ Incluye company_id
    role: userProfile?.role || userMetadata?.role || null,
    user_type: userType
  },
  session: authData.session,
  userProfile: userProfile
})
```

---

## 📋 Flujo Después del Fix

1. **Login exitoso** → `company_admin` autenticado
2. **Endpoint retorna** → `user.company_id` = `"4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c"`
3. **Página de login verifica** → `if (!data.user.company_id)` → **FALSE** (tiene company_id)
4. **Redirección correcta** → `router.push('/app/dashboard')` ✅

---

## 🔍 Evidencia en Logs

**Logs de Railway (04:51:17):**
```
✅ Profile query result
  profileRole: "company_admin"
  profileFound: true
  
✅ admin login successful
  
❌ Failed to create session record  // No crítico, idle timeout no funcional
  
Public route accessed { path: '/onboarding' }  // ← PROBLEMA
Public route accessed { path: '/auth/start' }  // ← PROBLEMA
Public route accessed { path: '/app/login' }  // ← PROBLEMA
```

**Lo que falta en los logs:**
```
❌ NO hay log de "User profile retrieved for response" con companyId
```

Esto confirma que el perfil no se estaba obteniendo correctamente.

---

## 🎯 Resultado Esperado

Después del deploy de este fix, los logs deberían mostrar:

```
✅ Profile query result (company_admin role detected)
✅ admin login successful
✅ User profile retrieved for response
  companyId: "4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c"
  role: "company_admin"

// Redirección correcta
Public route accessed { path: '/app/dashboard' }  // ← CORRECTO
```

Y el usuario debería ser redirigido directamente a `/app/dashboard` en lugar de `/onboarding`.

---

## ⚠️ Nota: Idle Timeout

El warning "Failed to create session record" sigue apareciendo porque el idle timeout no está funcionando. Esto **NO** bloquea el login, pero es un problema separado que se abordará después.

---

**Fecha:** 2025-10-29  
**Archivos modificados:**
- `pages/api/auth/login-supabase.ts`
- `lib/middleware/session-manager.ts`

**Estado:** Ready for deployment

