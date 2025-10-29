# Fix: Login 403 Forbidden Error

## 🔍 Problema Identificado

**Error:** `POST https://humanosisu.net/api/auth/login-supabase 403 (Forbidden)`

**Causa Raíz:** El endpoint `/api/auth/login-supabase` NO estaba en la lista de rutas públicas (`PUBLIC_ROUTES`) del middleware, por lo que el middleware intentaba verificar autenticación **antes** de permitir el login, creando un loop de autenticación.

### Flujo del Error

1. Cliente hace POST a `/api/auth/login-supabase`
2. Middleware intercepta la request
3. Middleware verifica `isProtectedApiRoute(pathname)` → **TRUE** (porque no estaba en PUBLIC_ROUTES)
4. Middleware intenta autenticar el usuario para verificar si tiene sesión
5. Como no hay sesión, el middleware retorna **403 Forbidden**
6. El usuario **nunca puede autenticarse** porque el middleware bloquea el endpoint de autenticación

---

## ✅ Solución Aplicada

Se agregó `/api/auth/login-supabase` a la lista de rutas públicas en `middleware.ts`:

```typescript
const PUBLIC_ROUTES = new Set([
  // ... otras rutas ...
  '/api/auth/login-supabase',  // ✅ AGREGADO: Admin login endpoint - PÚBLICO
  '/api/employees/auth/login', // Ya estaba aquí para empleados
  // ...
])
```

---

## 📍 Ubicación del Cambio

**Archivo:** `middleware.ts`
**Líneas:** 95

```typescript:middleware.ts
'/api/health',
'/api/env',          // Environment variables endpoint - PÚBLICO
'/api/cron/*',       // Cron jobs para mantenimiento del sistema
'/api/auth/login-supabase',        // ✅ Admin login endpoint - PÚBLICO
'/api/employees/auth/login',      // Employee portal login - PÚBLICO
```

---

## 🎯 Impacto

**Antes:**
- ✅ Login de empleados funcionaba (ya estaba en PUBLIC_ROUTES)
- ❌ Login de admins fallaba con 403

**Después:**
- ✅ Login de empleados funciona
- ✅ Login de admins funciona

---

## 📝 Notas Adicionales

Este error probablemente se introdujo cuando se implementó el idle timeout en el middleware, porque se agregó verificación de sesión en todas las rutas protegidas sin verificar primero que los endpoints de autenticación estuvieran en PUBLIC_ROUTES.

El middleware debe **SIEMPRE** permitir acceso a:
- `/api/auth/login-supabase` (admin login)
- `/api/employees/auth/login` (employee login)
- `/api/employees/auth/send-otp` (OTP sending)
- `/api/employees/auth/verify-otp` (OTP verification)

Estos endpoints deben ser públicos porque son los que **crean** la autenticación inicial.

