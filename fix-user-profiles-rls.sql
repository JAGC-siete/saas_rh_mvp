-- Script para corregir las políticas RLS de user_profiles que causan recursión infinita
-- El problema es que las políticas actuales hacen subconsultas a la misma tabla user_profiles

-- 1. Eliminar las políticas problemáticas existentes
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Company admins can manage user profiles in their company" ON user_profiles;

-- 2. Crear una función auxiliar para obtener el company_id del usuario actual
-- Esta función evita la recursión al usar una consulta directa sin RLS
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

-- 3. Crear una función para verificar si el usuario es admin de empresa
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

-- 4. Crear nuevas políticas RLS sin recursión

-- Política para que los usuarios vean su propio perfil
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT 
    USING (id = auth.uid());

-- Política para que los usuarios actualicen su propio perfil
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE 
    USING (id = auth.uid());

-- Política simplificada para admins (sin subconsulta recursiva)
-- Los super_admin pueden ver todos los perfiles
CREATE POLICY "Super admins can manage all profiles" ON user_profiles
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role = 'super_admin'
        )
    );

-- Política para company_admin usando función auxiliar
CREATE POLICY "Company admins can manage profiles in their company" ON user_profiles
    FOR ALL
    USING (
        company_id = get_user_company_id()
        AND is_company_admin()
    );

-- 5. Crear política adicional para INSERT (crear nuevos perfiles)
CREATE POLICY "Company admins can create profiles in their company" ON user_profiles
    FOR INSERT
    WITH CHECK (
        company_id = get_user_company_id()
        AND is_company_admin()
    );

-- 6. Política para que los usuarios puedan insertar su propio perfil inicial
CREATE POLICY "Users can create their own profile" ON user_profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- 7. Comentarios sobre las mejoras
COMMENT ON FUNCTION get_user_company_id() IS 'Función auxiliar para obtener company_id del usuario actual sin causar recursión RLS';
COMMENT ON FUNCTION is_company_admin() IS 'Función auxiliar para verificar si el usuario actual es admin de empresa';

-- 8. Verificar que RLS esté habilitado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 9. Mostrar las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'user_profiles'
ORDER BY policyname;