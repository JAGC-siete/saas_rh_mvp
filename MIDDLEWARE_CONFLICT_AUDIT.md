# Análisis de Conflictos en Middleware - Auditoría Completa

## 🎯 Objetivo
Identificar endpoints que deberían ser públicos pero pueden estar bloqueados por el middleware, causando errores 403 similares al de login.

---

## 📋 Endpoints de Autenticación Analizados

### ✅ Endpoints Públicos (Ya en PUBLIC_ROUTES)

1. ✅ `/api/auth/login-supabase` - **AGREGADO** (era el problema)
2. ✅ `/api/employees/auth/login` - Employee login con OTP
3. ✅ `/api/employees/auth/send-otp` - Enviar código OTP
4. ✅ `/api/employees/auth/verify-otp` - Verificar código OTP  
5. ✅ `/api/employees/auth/logout` - Logout de empleado
6. ✅ `/api/employees/invitations/accept` - Aceptar invitación
7. ✅ `/api/employees/invitations/validate` - Validar invitación

---

## ❌ Endpoints FALTANTES en PUBLIC_ROUTES

### 1. `/api/auth/heartbeat`
**Problema potencial:** Este endpoint requiere autenticación PERO debe ser accesible para usuarios autenticados.  
**Análisis:** El endpoint verifica sesión interna (línea 22-28), por lo que **DEBE estar en rutas protegidas** pero accesible para autenticados.  
**Status:** ✅ **CORRECTO** - No debe estar en PUBLIC_ROUTES porque requiere autenticación.

### 2. `/api/auth/register`
**Problema potencial:** Endpoint de registro - **PUEDE NECESITAR** estar en PUBLIC_ROUTES si el middleware lo está bloqueando.  
**Archivo:** `pages/api/auth/register.ts`  
**Comportamiento:** Crea nuevos usuarios con signUp (línea 19)  
**Verificación:** Si el middleware intenta autenticar un request de registro, retornará 403  
**Acción requerida:** ⚠️ **VERIFICAR** si debe estar en PUBLIC_ROUTES

### 3. `/api/auth/create-profile`
**Problema potencial:** Crea perfil de usuario después de registro  
**Verificación:** Similar a register - puede necesitar acceso sin auth  
**Acción requerida:** ⚠️ **VERIFICAR**

### 4. `/api/auth/fix-user-creation`
**Problema potencial:** Endpoint de mantenimiento/debug  
**Acción requerida:** ⚠️ **VERIFICAR**

### 5. `/api/auth/create-profile-bypass`
**Problema potencial:** Bypass para crear perfiles - **DEBUG**  
**Acción requerida:** ⚠️ **Solo en dev, no en producción**

### 6. `/api/user-profiles`
**Problema potencial:** Endpoint de lectura de perfiles  
**Análisis:** Lee perfiles de usuarios autenticados  
**Status:** ⚠️ **Probablemente CORRECTO** como protegida

### 7. `/api/user-profile` (singular)
**Problema potencial:** Similar al anterior  
**Status:** ⚠️ **VERIFICAR** si debe ser público

---

## 🔍 Análisis de Endpoints Públicos

### Patrón de Endpoints de Autenticación

Los siguientes endpoints **SIEMPRE** deben ser públicos porque crean o verifican credenciales **SIN** requerir autenticación previa:

```typescript
// Crear credenciales (registro)
'/api/auth/register'              // ❓ FALTA

// Iniciar sesión (login)
'/api/auth/login-supabase'        // ✅ AGREGADO
'/api/employees/auth/login'       // ✅ YA ESTABA
'/api/employees/auth/send-otp'    // ✅ YA ESTABA  
'/api/employees/auth/verify-otp'  // ✅ YA ESTABA

// Cerrar sesión
'/api/employees/auth/logout'      // ✅ YA ESTABA

// Otras funciones de auth sin sesión
'/api/auth/fix-user-creation'     // ❓ VERIFICAR (dev only)
```

---

## 🎯 Recomendaciones

### Endpoints a Agregar a PUBLIC_ROUTES

#### 1. `/api/auth/register` 
**Razón:** Los usuarios deben poder registrarse sin estar autenticados  
**Línea en código:** `pages/api/auth/register.ts:19` usa `signUp()`  
**Acción:** ✅ **AGREGAR** a PUBLIC_ROUTES

#### 2. `/api/auth/create-profile`
**Razón:** Puede ser llamado sin sesión durante onboarding  
**Acción:** ⚠️ **VERIFICAR USO** antes de agregar

#### 3. `/api/auth/fix-user-creation`
**Razón:** Endpoint de mantenimiento  
**Acción:** ⚠️ **SOLO EN DEV** o eliminar en producción

---

## 📊 Resumen

| Endpoint | Status Actual | Debería ser | Acción |
|----------|--------------|-------------|--------|
| `/api/auth/login-supabase` | ✅ PÚBLICO | ✅ PÚBLICO | ✅ Ya agregado |
| `/api/auth/register` | ⚠️ Protegida | ✅ PÚBLICO | 🔧 Agregar |
| `/api/auth/create-profile` | ⚠️ Protegida | ⚠️ Verificar | ⏳ Revisar código |
| `/api/auth/heartbeat` | ❌ Protegida | ❌ Protegida | ✅ Correcto - requiere auth |
| `/api/auth/fix-user-creation` | ⚠️ Protegida | ❌ Eliminar | 🗑️ Eliminar en producción |
| `/api/user-profiles` | ⚠️ Protegida | ❌ Protegida | ✅ Correcto - requiere auth |
| `/api/user-profile` | ⚠️ Protegida | ❌ Protegida | ✅ Correcto - requiere auth |

---

## 🔧 Cambios Propuestos

### Cambio 1: Agregar `/api/auth/register` a PUBLIC_ROUTES

```typescript
const PUBLIC_ROUTES = new Set([
  // ... existing routes ...
  '/api/auth/login-supabase',        // Admin login endpoint - PÚBLICO
  '/api/auth/register',              // ✅ AGREGAR: User registration - PÚBLICO
  '/api/employees/auth/login',       // Employee portal login - PÚBLICO
  // ...
])
```

### Cambio 2: Verificar uso de `/api/auth/create-profile`

Revisar si este endpoint se llama SIN autenticación durante el flujo de onboarding. Si es así, agregarlo a PUBLIC_ROUTES.

---

## ⚠️ Notas Importantes

1. **Endpoints de autenticación** (login, register, verify) **SIEMPRE** deben ser públicos
2. **Endpoints de sesión** (heartbeat, user-profile) **SIEMPRE** deben requerir autenticación
3. Endpoints que crean/modifican datos de usuario **generalmente** requieren autenticación
4. Endpoints de "fix" o "bypass" deberían eliminarse en producción o estar en PUBLIC_ROUTES solo en dev

---

**Fecha de auditoría:** $(date)  
**Archivos revisados:** `middleware.ts`, `pages/api/auth/*.ts`, `pages/api/user-profiles.ts`

