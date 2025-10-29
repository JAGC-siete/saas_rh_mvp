# ⚠️ Campo `name` Undefined en Login Response

## 📋 Problema

El campo `user.name` es `undefined` en el objeto retornado por `/api/auth/login-supabase`:

```javascript
{
  id: '9e24694a-40a8-4f5f-b783-c26f3342bdc1',
  email: 'nanurrutia@prohalca.com',
  name: undefined,  // ❌ PROBLEMA
  role: 'company_admin',
  company_id: '4dc1c9de-dd12-4e4b-b76a-783d4ee5d07c'
}
```

---

## 🔍 Causa

La tabla `user_profiles` NO tiene un campo `name`. La estructura es:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  company_id UUID,
  employee_id UUID,
  role TEXT,
  permissions JSONB,
  -- NO hay campo 'name'
);
```

En una versión anterior del schema, había un campo `full_name` en la migración `20250127000003_onboarding_multi_tenant.sql`:

```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  full_name TEXT,  -- ← Existe pero NO se está usando
  ...
);
```

Pero en la versión actual (`20250723000001_initial_hr_schema.sql`), **este campo fue eliminado**.

---

## ✅ Solución Aplicada

**Decision:** Dejar `name` como `undefined` y agregar documentación.

### Razones:

1. **El frontend no usa `user.name` críticamente**
   - Dashboard usa: `user?.email` (línea 212 de `DashboardLayout.tsx`)
   - Employee portal usa: `profile.employee?.name` (línea 836 de `pages/employees/portal.tsx`)

2. **Para obtener el nombre completo, el frontend debe:**
   - Obtener el perfil completo con `/api/user-profiles/[id]`
   - O si el usuario es un empleado, obtenerlo de `employees.name` vía `employee_id`

3. **El login endpoint solo retorna datos básicos de autenticación**

---

## 📊 Estructura Actual de `user_profiles`

Según `lib/database.types.ts`:

```typescript
user_profiles: {
  Row: {
    id: string
    company_id: string | null
    employee_id: string | null  // ← Si es empleado, aquí está el ID
    role: string
    permissions: Json | null
    is_active: boolean | null
    last_login: string | null
    // NO hay 'name' o 'full_name'
  }
}
```

---

## 🔄 Opciones Si Realmente Necesitas el Nombre

### Opción 1: Obtener del Frontend (Recomendado)

Si el usuario necesita mostrar su nombre, el frontend debe hacer un fetch adicional:

```typescript
// Después del login
const response = await fetch('/api/user-profiles/[userId]')
const profile = await response.json()

// Si tiene employee_id, obtener el nombre del empleado
if (profile.employee_id) {
  const employee = await fetch(`/api/employees/${profile.employee_id}`)
  const employeeData = await employee.json()
  // Usar employeeData.name
}
```

### Opción 2: Agregar Campo a la Respuesta del Login

Modificar `pages/api/auth/login-supabase.ts`:

```typescript
let userName = null

// Si tiene employee_id, buscar el nombre
if (userProfile?.employee_id) {
  const { data: employee } = await adminSupabase
    .from('employees')
    .select('name')
    .eq('id', userProfile.employee_id)
    .single()
  userName = employee?.name
}

return res.status(200).json({
  success: true,
  user: {
    ...authData.user,
    name: userName,
    company_id: userProfile?.company_id,
    ...
  }
})
```

**Pero esto requiere 2 queries adicionales por login** → Performance penalty.

---

## 🎯 Conclusión

**`name` puede permanecer `undefined`** porque:

1. ✅ El frontend usa `email` como identificador primario
2. ✅ Para mostrar el nombre completo, se debe hacer fetch adicional
3. ✅ La arquitectura actual separa autenticación de datos de perfil

Si necesitas el nombre en el login response, usa la Opción 2 arriba.

---

**Fecha:** 2025-10-29  
**Estado:** `name: undefined` es comportamiento esperado y aceptable

