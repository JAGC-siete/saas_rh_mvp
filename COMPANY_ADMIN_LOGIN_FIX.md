# Fix: Company Admin Login 403 Error

## 🔍 Problema Identificado

**Error:**
```
User login successful but no valid access permissions
userType="unknown"
```

**Causa Raíz:**
El endpoint `/api/auth/login-supabase` solo validaba los roles `super_admin` y `admin`, pero **NO** validaba `company_admin` y `hr_manager`, que son roles admin válidos definidos en el sistema.

---

## ✅ Solución Aplicada

### Archivo: `pages/api/auth/login-supabase.ts`

**Antes:**
```typescript
if (['super_admin', 'admin'].includes(userProfile.role)) {
  userType = 'admin'
  hasValidAccess = true
}
```

**Después:**
```typescript
// Admin roles include: super_admin, company_admin, hr_manager
const adminRoles = ['super_admin', 'admin', 'company_admin', 'hr_manager']
if (adminRoles.includes(userProfile.role)) {
  userType = 'admin'
  hasValidAccess = true
}
```

---

## 📊 Roles en el Sistema

### Roles de Administración Definidos

| Rol | Level | Descripción | Middleware | Login |
|-----|-------|-------------|------------|-------|
| `super_admin` | 4 | Super administrador | ✅ Validado | ✅ Validado |
| `company_admin` | 3 | Admin de empresa | ✅ Validado | ✅ **AGREGADO** |
| `hr_manager` | 2 | Gerente de RRHH | ✅ Validado | ✅ **AGREGADO** |
| `admin` | - | Admin genérico | ⚠️ Legacy | ✅ Validado |
| `employee` | 1 | Empleado | ✅ Validado | ✅ Validado |

---

## 🔍 Evidencia del Problema

### Usuario con `company_admin`:
```json
{
  "role": "company_admin",
  "company_id": "4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c",
  "permissions": {
    "can_view_all": true,
    "can_manage_all": true,
    "manage_payroll": true,
    "manage_reports": true,
    "manage_settings": true,
    "manage_employees": true,
    "can_manage_employees": true
  }
}
```

**Error obtenido:**
```
userType="unknown"
hasValidAccess=false
```

**Causa:** El código verificaba `['super_admin', 'admin']` pero el usuario tenía `company_admin`, por lo que `hasValidAccess` quedaba en `false`.

---

## ✅ Cambios Aplicados

### Líneas modificadas: 87-95

```typescript
// ANTES
if (['super_admin', 'admin'].includes(userProfile.role)) {
  // NO incluía company_admin ni hr_manager
}

// DESPUÉS
const adminRoles = ['super_admin', 'admin', 'company_admin', 'hr_manager']
if (adminRoles.includes(userProfile.role)) {
  // Ahora incluye todos los roles admin
}
```

---

## 🎯 Impacto

### Roles que ahora pueden hacer login:

- ✅ `super_admin` - Super administrador
- ✅ `admin` - Admin genérico (legacy)
- ✅ **`company_admin` - Admin de empresa** (NUEVO)
- ✅ **`hr_manager` - Gerente de RRHH** (NUEVO)
- ✅ `employee` - Empleado

### Rutas que aceptan estos roles:

- ✅ Middleware ya validaba todos los roles admin
- ✅ Las rutas `/api/admin/*` requieren `super_admin` 
- ✅ Las rutas `/app/*` requieren cualquier rol admin
- ✅ Login ahora valida correctamente los roles

---

## 📝 Referencias de Consistencia

### 1. Middleware (`middleware.ts` líneas 41-42)
```typescript
const adminRoles = ['super_admin', 'company_admin', 'hr_manager']
```

### 2. Role Validation (`lib/auth/role-validation.ts` líneas 125-126)
```typescript
roles: ['super_admin', 'company_admin', 'hr_manager']
```

### 3. Permissions (`lib/security/permissions.ts` líneas 172-208)
```typescript
'company_admin': {
  level: 8
},
'hr_manager': {
  level: 7
}
```

**El login ahora es consistente con el resto del sistema.**

---

## 🚀 Estado

- ✅ Code fix aplicado
- ✅ Linter sin errores
- ✅ Consistencia con middleware
- ✅ Consistencia con role validation
- ✅ Consistencia con permissions

**El usuario `nanurrutia@prohalca.com` con rol `company_admin` ahora puede hacer login correctamente.**

