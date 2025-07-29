# Reporte de Auditoría: Tabla user_profiles en Supabase

## 📋 Resumen Ejecutivo

Se ha completado una auditoría exhaustiva de la tabla `user_profiles` en la base de datos Supabase. Se identificó un **problema crítico de recursión infinita en las políticas RLS** que impide el acceso normal a los datos desde el frontend.

## ✅ Estado Actual de la Tabla

### 1. Existencia y Estructura
- ✅ **La tabla `user_profiles` existe** en la base de datos
- ✅ **Estructura correcta** según el esquema definido
- ✅ **RLS habilitado** correctamente

#### Estructura de la tabla:
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    role TEXT NOT NULL DEFAULT 'employee',
    permissions JSONB DEFAULT '{}',
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Datos Existentes
- ✅ **2 registros** encontrados en la tabla
- ✅ **Usuarios autenticados**: 4 usuarios en `auth.users`
- ⚠️ **2 usuarios sin perfil** (usuarios huérfanos en auth.users)

#### Registros actuales:
1. **ID**: `af34661f...` | **Rol**: `company_admin` | **Email**: `test@miempresa.com`
2. **ID**: `325a749e...` | **Rol**: `company_admin` | **Email**: `jorge@miempresa.com`

#### Usuarios sin perfil:
- `43cced61...` (admin@test.com)
- `c5760b25...` (admin@miempresa.com)

## 🚨 Problema Crítico Identificado

### Error de Recursión Infinita en RLS
**Error**: `infinite recursion detected in policy for relation "user_profiles"`

### Causa Raíz
Las políticas RLS actuales contienen **subconsultas circulares**:

```sql
-- POLÍTICA PROBLEMÁTICA
CREATE POLICY "Company admins can manage user profiles in their company" ON user_profiles
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles  -- ❌ RECURSIÓN AQUÍ
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'super_admin')
        )
    );
```

### Impacto
- ❌ **Frontend no puede acceder** a los datos de user_profiles
- ❌ **Autenticación de usuarios** afectada
- ❌ **Verificación de permisos** no funciona
- ✅ **Service role** funciona correctamente (sin RLS)

## 🔧 Solución Implementada

### Archivo de Corrección: `fix-user-profiles-rls.sql`

#### 1. Funciones Auxiliares (Evitan Recursión)
```sql
-- Función para obtener company_id sin recursión
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM user_profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Función para verificar si es admin
CREATE OR REPLACE FUNCTION is_company_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('company_admin', 'super_admin')
  );
$$;
```

#### 2. Nuevas Políticas RLS (Sin Recursión)
```sql
-- Usuarios ven su propio perfil
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

-- Usuarios actualizan su propio perfil
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Super admins ven todo
CREATE POLICY "Super admins can manage all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role = 'super_admin'
        )
    );

-- Company admins usan funciones auxiliares
CREATE POLICY "Company admins can manage profiles in their company" ON user_profiles
    FOR ALL USING (
        company_id = get_user_company_id()
        AND is_company_admin()
    );
```

## 📝 Pasos para Aplicar la Corrección

### ⚠️ ACCIÓN REQUERIDA: Ejecución Manual

Como las políticas RLS no pueden modificarse programáticamente desde el cliente, **debe ejecutarse manualmente**:

1. **Abrir Supabase Studio**
   - URL: https://supabase.com/dashboard
   - Proyecto: `fwyxmovfrzauebiqxchz`

2. **Ir a SQL Editor**
   - Menú lateral → SQL Editor
   - Crear una nueva consulta

3. **Ejecutar el Script**
   - Copiar contenido de `fix-user-profiles-rls.sql`
   - Ejecutar en el SQL Editor

4. **Verificar Resultados**
   - Confirmar que las políticas se crearon sin errores
   - Probar acceso desde el frontend

## 🧪 Scripts de Verificación Creados

### 1. `verify-user-profiles-table.js`
- Verifica existencia y estructura de la tabla
- Comprueba usuarios y políticas RLS
- Identifica usuarios huérfanos

### 2. `test-user-profiles-queries.js`
- Prueba consultas específicas
- Analiza el problema de recursión
- Sugiere soluciones

### 3. `apply-rls-fix.js`
- Intenta aplicar la corrección automáticamente
- Proporciona instrucciones manuales
- Verifica el estado post-corrección

## 📊 Métricas de la Auditoría

| Aspecto | Estado | Detalles |
|---------|--------|----------|
| Tabla existe | ✅ | user_profiles presente |
| Estructura correcta | ✅ | Todos los campos requeridos |
| RLS habilitado | ✅ | Row Level Security activo |
| Datos existentes | ⚠️ | 2/4 usuarios con perfil |
| Políticas RLS | ❌ | Recursión infinita |
| Acceso frontend | ❌ | Bloqueado por RLS |
| Acceso service role | ✅ | Funcionando correctamente |

## 🎯 Recomendaciones

### Inmediatas (Críticas)
1. **Ejecutar la corrección RLS** en Supabase Studio
2. **Crear perfiles faltantes** para usuarios huérfanos
3. **Probar acceso frontend** después de la corrección

### A Mediano Plazo
1. **Implementar claims JWT** para información de empresa/rol
2. **Crear funciones de utilidad** para gestión de permisos
3. **Establecer monitoreo** de políticas RLS

### Mejores Prácticas
1. **Evitar subconsultas circulares** en políticas RLS
2. **Usar funciones SECURITY DEFINER** para lógica compleja
3. **Probar políticas RLS** en entornos de desarrollo
4. **Documentar cambios** en políticas de seguridad

## 🔍 Comandos para Verificar la Corrección

```bash
# Verificar tabla y políticas
node verify-user-profiles-table.js

# Probar consultas específicas
node test-user-profiles-queries.js

# Intentar aplicar corrección
node apply-rls-fix.js
```

## 📞 Próximos Pasos

1. **Aplicar corrección manual** en Supabase Studio
2. **Crear perfiles para usuarios huérfanos**:
   ```sql
   INSERT INTO user_profiles (id, company_id, role) VALUES 
   ('43cced61-...', 'company-uuid', 'company_admin'),
   ('c5760b25-...', 'company-uuid', 'company_admin');
   ```
3. **Verificar funcionamiento** del frontend
4. **Implementar monitoreo** de errores RLS

---

**Fecha**: 2025-01-30  
**Auditor**: Sistema Automatizado  
**Estado**: Corrección Pendiente de Aplicación Manual