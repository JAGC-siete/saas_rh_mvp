-- VERIFICAR Y CORREGIR POLÍTICAS RLS PARA GAMIFICACIÓN
-- Ejecutar este script en el SQL Editor de Supabase DESPUÉS del anterior

-- 1. Verificar políticas RLS existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('employee_scores', 'achievement_types', 'employee_achievements', 'point_history');

-- 2. Eliminar políticas RLS problemáticas si existen
DROP POLICY IF EXISTS "Users can view scores from their company" ON employee_scores;
DROP POLICY IF EXISTS "Users can update scores from their company" ON employee_scores;
DROP POLICY IF EXISTS "Users can insert scores for their company" ON employee_scores;

DROP POLICY IF EXISTS "Anyone can view achievement types" ON achievement_types;

DROP POLICY IF EXISTS "Users can view achievements from their company" ON employee_achievements;
DROP POLICY IF EXISTS "Users can insert achievements for their company" ON employee_achievements;

DROP POLICY IF EXISTS "Users can view point history from their company" ON point_history;
DROP POLICY IF EXISTS "Users can insert point history for their company" ON point_history;

-- 3. Crear políticas RLS simplificadas y funcionales
-- Para employee_scores
CREATE POLICY "company_admin_can_access_scores" ON employee_scores
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid() AND role = 'company_admin'
        )
    );

CREATE POLICY "super_admin_can_access_all_scores" ON employee_scores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Para achievement_types (lectura pública)
CREATE POLICY "public_read_achievement_types" ON achievement_types
    FOR SELECT USING (true);

-- Para employee_achievements
CREATE POLICY "company_admin_can_access_achievements" ON employee_achievements
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid() AND role = 'company_admin'
        )
    );

CREATE POLICY "super_admin_can_access_all_achievements" ON employee_achievements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Para point_history
CREATE POLICY "company_admin_can_access_point_history" ON point_history
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE id = auth.uid() AND role = 'company_admin'
        )
    );

CREATE POLICY "super_admin_can_access_all_point_history" ON point_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- 4. Verificar que las políticas se crearon
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('employee_scores', 'achievement_types', 'employee_achievements', 'point_history')
ORDER BY tablename, policyname;

-- 5. Verificar que RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('employee_scores', 'achievement_types', 'employee_achievements', 'point_history');

-- 6. Verificar permisos de usuario
SELECT 
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name IN ('employee_scores', 'achievement_types', 'employee_achievements', 'point_history')
AND grantee = 'authenticated';

-- 7. Estado final
SELECT '✅ POLÍTICAS RLS VERIFICADAS Y CORREGIDAS' as status;
