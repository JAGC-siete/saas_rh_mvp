# Diagnóstico: "Permisos insuficientes" - banegas.lizbeth@icolud.com

## Objetivo

Investigar por qué el usuario `banegas.lizbeth@icolud.com` recibe mensajes de "Permisos insuficientes" / "Insufficient permissions" tras el deploy y las modificaciones en Supabase.

---

## Paso 1: Obtener datos del usuario en Supabase

Ejecutar en **Supabase SQL Editor** (o psql con service_role):

```sql
-- 1. Obtener user_id y perfil
SELECT 
  au.id AS auth_user_id,
  au.email,
  au.email_confirmed_at,
  up.id AS profile_id,
  up.role,
  up.company_id,
  up.is_active,
  up.permissions,
  pg_typeof(up.permissions) AS permissions_type,
  up.created_at,
  up.updated_at
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
WHERE au.email = 'banegas.lizbeth@icolud.com';
```

**Verificar:**
- [ ] ¿Existe el usuario en `auth.users`?
- [ ] ¿Existe el perfil en `user_profiles`?
- [ ] Valor de `role` (debe ser exacto: `super_admin`, `company_admin`, `hr_manager`, `manager`, `hr_analyst`, `department_manager`, `employee`, `readonly`)
- [ ] ¿`company_id` es NULL? (si es NULL y no es super_admin → "Company access required")
- [ ] ¿`is_active` es `true`?
- [ ] Contenido de `permissions` (JSON): ¿tiene `can_export_reports`, `can_view_reports`?

---

## Paso 2: Verificar company_id

```sql
-- Si company_id existe, verificar que la empresa existe
SELECT 
  up.company_id,
  c.name AS company_name,
  c.id
FROM user_profiles up
LEFT JOIN companies c ON c.id = up.company_id
JOIN auth.users au ON au.id = up.id
WHERE au.email = 'banegas.lizbeth@icolud.com';
```

**Verificar:**
- [ ] ¿La empresa existe?
- [ ] ¿`company_id` coincide con una empresa válida?

---

## Paso 3: Endpoints que pueden devolver "Permisos insuficientes"

| Endpoint | Mensaje | Condición que falla |
|----------|---------|---------------------|
| `GET /api/attendance/export` | "Permisos insuficientes" | Rol ∉ [super_admin, company_admin, hr_manager, manager, **admin**] |
| `POST /api/reports/export` | "Permisos insuficientes" | Rol ∉ [super_admin, company_admin, hr_manager, manager] **Y** permissions.can_export_reports ≠ true |
| `POST /api/payroll/calculate` | "Permisos insuficientes" | Rol ∉ [super_admin, company_admin, hr_manager] |
| `GET /api/payroll/config` | "Permisos insuficientes" | Varias condiciones por método |
| `POST /api/payroll/generate-pdf-from-run` | "Permisos insuficientes" | Rol ∉ [super_admin, company_admin, hr_manager] |
| `POST /api/payroll/receipt-voucher` | "Permisos insuficientes" | Rol ∉ [super_admin, company_admin, hr_manager] |
| `POST /api/payroll/generate-voucher` | "Permisos insuficientes" | Rol ∉ [super_admin, company_admin, hr_manager] |
| `POST /api/attendance/calculate-hours` | "Permisos insuficientes" | Rol ∉ [super_admin, company_admin, hr_manager] |
| `PATCH /api/employees/update` | "Permisos insuficientes" | No tiene `can_manage_employees` (rol o permissions) |
| `lib/auth/api-auth-fixed` (requireRoles) | "Insufficient permissions" | Rol ∉ allowedRoles |

---

## Paso 4: Posibles causas según rol

| Rol del usuario | Reportes export | Payroll | Empleados update |
|-----------------|-----------------|---------|------------------|
| `super_admin` | ✅ | ✅ | ✅ |
| `company_admin` | ✅ | ✅ | ✅ |
| `hr_manager` | ✅ | ✅ | ✅ |
| `manager` | ✅ reportes | ❌ payroll calc | ❌ |
| `hr_analyst` | Solo si `can_export_reports: true` en JSON | ❌ | ❌ |
| `department_manager` | Solo si `can_export_reports: true` en JSON | ❌ | ❌ |
| `employee` | ❌ | ❌ | ❌ |
| `readonly` | Solo si `can_export_reports: true` en JSON | ❌ | ❌ |

---

## Paso 5: Verificar formato de permissions

El campo `permissions` en `user_profiles` es JSONB. Ejemplos válidos:

```json
{
  "can_view_reports": true,
  "can_export_reports": true,
  "can_generate_payroll": true
}
```

**Problemas comunes:**
- `permissions` es `null` → no hay permisos extra
- Claves con typo: `can_export_report` (falta la 's')
- Valores como `"true"` (string) en vez de `true` (boolean)
- En PostgreSQL JSONB, `'{"can_export_reports": true}'::jsonb` es correcto

---

## Paso 6: Script de corrección (solo si se confirma el diagnóstico)

**NO ejecutar sin antes confirmar el diagnóstico.**

Si el usuario debe tener acceso a reportes y tiene rol `hr_analyst` o similar:

```sql
-- SOLO si el diagnóstico confirma que falta can_export_reports
UPDATE user_profiles
SET permissions = COALESCE(permissions, '{}'::jsonb) || 
  '{"can_view_reports": true, "can_export_reports": true}'::jsonb,
  updated_at = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'banegas.lizbeth@icolud.com');
```

Si el rol está mal (ej. `"Admin"` con mayúscula o typo):

```sql
-- Corregir rol a uno válido
UPDATE user_profiles
SET role = 'hr_manager',  -- o el rol correcto
    updated_at = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'banegas.lizbeth@icolud.com');
```

---

## Paso 7: Logs del servidor

En el entorno de deploy (Railway, Vercel, etc.), buscar en logs:

- `Usuario autenticado para reportes:` → incluye `userId`, `role`, `companyId`
- `Permisos insuficientes` o `Insufficient permissions`
- Errores 403 en las rutas de API

---

## Resumen de verificación

1. Ejecutar query del Paso 1 y anotar: `role`, `company_id`, `is_active`, `permissions`
2. Identificar **qué acción** provoca el error (¿exportar reporte? ¿calcular nómina? ¿editar empleado?)
3. Cruzar con la tabla del Paso 4 para ver si el rol debería tener acceso
4. Si el rol es `hr_analyst`, `department_manager` o `readonly` y necesita reportes → agregar `can_export_reports: true` al JSON
5. Si el rol tiene typo o valor inesperado → corregir a un rol válido
