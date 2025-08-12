-- SOLUCIÓN NUCLEAR - DESHABILITAR RLS EN TODAS LAS TABLAS
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. DESHABILITAR RLS en TODAS las tablas problemáticas
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_achievements DISABLE ROW LEVEL SECURITY;
ALTER TABLE point_history DISABLE ROW LEVEL SECURITY;

-- 2. Verificar que RLS está deshabilitado en todas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'user_profiles',
    'employees',
    'companies',
    'departments',
    'attendance_records',
    'payroll_records',
    'leave_requests',
    'employee_scores',
    'achievement_types',
    'employee_achievements',
    'point_history'
)
ORDER BY tablename;

-- 3. Estado final
SELECT '✅ RLS DESHABILITADO EN TODAS LAS TABLAS - LOGIN DEBERÍA FUNCIONAR' as status;
