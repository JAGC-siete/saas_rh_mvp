-- 🔧 HABILITAR RLS Y POLÍTICAS EN SUPABASE
-- Ejecutar este script en Supabase Studio → SQL Editor

-- ========================================
-- PASO 1: HABILITAR RLS EN TODAS LAS TABLAS
-- ========================================

SELECT '=== HABILITANDO RLS EN TABLAS ===' as section;

-- Habilitar RLS en todas las tablas importantes
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PASO 2: VERIFICAR QUE RLS ESTÁ HABILITADO
-- ========================================

SELECT '=== VERIFICANDO RLS HABILITADO ===' as section;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ACTIVO'
        ELSE '❌ RLS INACTIVO'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'companies', 'employees', 'attendance_records', 'payroll_records', 'departments', 'leave_requests', 'audit_logs')
ORDER BY tablename;

-- ========================================
-- PASO 3: VERIFICAR POLÍTICAS EXISTENTES
-- ========================================

SELECT '=== POLÍTICAS EXISTENTES ===' as section;

SELECT 
    tablename,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- PASO 4: CREAR POLÍTICAS FALTANTES (si no existen)
-- ========================================

SELECT '=== CREANDO POLÍTICAS FALTANTES ===' as section;

-- Política para user_profiles (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" ON user_profiles
            FOR SELECT USING (id = auth.uid());
    END IF;
END $$;

-- Política para companies (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'companies' 
        AND policyname = 'Users can view their own company'
    ) THEN
        CREATE POLICY "Users can view their own company" ON companies
            FOR SELECT USING (
                id IN (
                    SELECT company_id FROM user_profiles 
                    WHERE user_profiles.id = auth.uid()
                )
            );
    END IF;
END $$;

-- Política para employees (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'employees' 
        AND policyname = 'Users can view employees in their company'
    ) THEN
        CREATE POLICY "Users can view employees in their company" ON employees
            FOR SELECT USING (
                company_id IN (
                    SELECT company_id FROM user_profiles 
                    WHERE user_profiles.id = auth.uid()
                )
            );
    END IF;
END $$;

-- Política para payroll_records (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payroll_records' 
        AND policyname = 'Company admins and HR managers can manage payroll'
    ) THEN
        CREATE POLICY "Company admins and HR managers can manage payroll" ON payroll_records
            FOR ALL USING (
                employee_id IN (
                    SELECT e.id FROM employees e
                    JOIN user_profiles up ON up.company_id = e.company_id
                    WHERE up.id = auth.uid() 
                    AND up.role IN ('company_admin', 'hr_manager')
                )
            );
    END IF;
END $$;

-- ========================================
-- PASO 5: VERIFICAR POLÍTICAS DESPUÉS DE CREAR
-- ========================================

SELECT '=== POLÍTICAS DESPUÉS DE CREAR ===' as section;

SELECT 
    tablename,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- PASO 6: PROBAR ACCESO CON RLS
-- ========================================

SELECT '=== RESUMEN FINAL ===' as section;

SELECT 
    'RLS HABILITADO' as status,
    COUNT(*) as tables_with_rls
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = true
AND tablename IN ('user_profiles', 'companies', 'employees', 'attendance_records', 'payroll_records', 'departments', 'leave_requests', 'audit_logs')

UNION ALL

SELECT 
    'POLÍTICAS CREADAS' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- ========================================
-- PASO 7: INSTRUCCIONES FINALES
-- ========================================

SELECT '=== INSTRUCCIONES ===' as section;

SELECT 
    '✅ RLS habilitado en todas las tablas' as instruction

UNION ALL

SELECT 
    '✅ Políticas de seguridad activas' as instruction

UNION ALL

SELECT 
    '🔧 Ahora ve a https://zesty-abundance-production.up.railway.app' as instruction

UNION ALL

SELECT 
    '🔧 Haz login y prueba generar nómina' as instruction; 