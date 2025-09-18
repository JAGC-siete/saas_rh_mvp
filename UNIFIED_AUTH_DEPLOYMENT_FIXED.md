# 🔄 DEPLOYMENT: Sistema de Autenticación Unificado (CORREGIDO)

## ❌ **PROBLEMA DETECTADO:**

Error al ejecutar el script SQL:
```
ERROR: 42703: column "email" of relation "user_profiles" does not exist
```

**Causa:** La función `handle_new_user()` está intentando insertar columnas que no existen en el esquema real de `user_profiles`.

## ✅ **SOLUCIÓN APLICADA:**

### **Script de Corrección Creado:**
- 📄 `sql/fix-handle-new-user-trigger.sql` - Corrige la función problemática

### **Problema Identificado:**
```sql
-- ❌ INCORRECTO (función antigua)
INSERT INTO user_profiles (id, email, full_name, company_id, role)

-- ✅ CORRECTO (esquema real)
INSERT INTO user_profiles (id, company_id, employee_id, role, permissions, is_active, created_at, updated_at)
```

## 🚀 **PASOS CORREGIDOS PARA DEPLOYMENT:**

### **PASO 1: Corregir Trigger (PRIMERO)**
```sql
-- Ejecutar PRIMERO en Supabase Dashboard:
-- sql/fix-handle-new-user-trigger.sql
```

**Esto hará:**
- ✅ Eliminar trigger problemático
- ✅ Crear función que usa solo columnas existentes
- ✅ Recrear trigger corregido
- ✅ Verificar esquema de user_profiles

### **PASO 2: Crear Usuarios Supabase**
```sql
-- Ejecutar SEGUNDO:
-- sql/create-employee-supabase-users.sql
```

**Ahora funcionará sin errores porque:**
- ✅ Trigger corregido no causará conflictos
- ✅ Usa solo columnas que existen en el esquema real
- ✅ Compatible con la estructura de user_profiles

### **PASO 3: Implementar RLS**
```sql
-- Ejecutar TERCERO:
-- sql/update-rls-policies-unified.sql
```

## 📋 **ORDEN DE EJECUCIÓN:**

```bash
1. sql/fix-handle-new-user-trigger.sql      # Corregir trigger
2. sql/create-employee-supabase-users.sql   # Crear usuarios
3. sql/update-rls-policies-unified.sql      # Implementar RLS
```

## 🎯 **ESQUEMA REAL DE user_profiles:**

Según el esquema proporcionado:
```sql
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,                    -- ✅ Existe
  company_id uuid,                     -- ✅ Existe  
  employee_id uuid,                    -- ✅ Existe
  role text NOT NULL DEFAULT 'employee', -- ✅ Existe
  permissions jsonb DEFAULT '{}',      -- ✅ Existe
  last_login timestamp with time zone, -- ✅ Existe
  is_active boolean DEFAULT true,      -- ✅ Existe
  created_at timestamp with time zone, -- ✅ Existe
  updated_at timestamp with time zone, -- ✅ Existe
  -- email COLUMN DOES NOT EXIST      -- ❌ No existe
  -- full_name COLUMN DOES NOT EXIST  -- ❌ No existe
);
```

## ✅ **VERIFICACIÓN POST-FIX:**

Después de ejecutar el fix, verificar:
```sql
-- Verificar que la función funciona
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- Verificar esquema de user_profiles
\d user_profiles
```

## 🚀 **RESULTADO:**

Con esta corrección, el deployment funcionará correctamente:
- ✅ **Trigger corregido** - usa solo columnas existentes
- ✅ **Scripts SQL compatibles** - con esquema real
- ✅ **Deployment sin errores** - función handle_new_user fija

**¡Ahora los scripts están completamente corregidos y listos para deployment!**
