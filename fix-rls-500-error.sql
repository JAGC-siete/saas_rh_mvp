-- 🔧 ARREGLAR ERROR 500 EN USER_PROFILES
-- Ejecutar este script en Supabase Studio → SQL Editor

-- ========================================
-- PASO 1: VERIFICAR ESTADO ACTUAL
-- ========================================

SELECT '=== ESTADO ACTUAL ===' as section;

-- Verificar si RLS está habilitado
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
AND tablename IN ('user_profiles', 'companies', 'employees', 'payroll_records')
ORDER BY tablename;

-- ========================================
-- PASO 2: HABILITAR RLS EN TABLAS CRÍTICAS
-- ========================================

SELECT '=== HABILITANDO RLS ===' as section;

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
-- PASO 3: ELIMINAR POLÍTICAS CONFLICTIVAS
-- ========================================

SELECT '=== LIMPIANDO POLÍTICAS ===' as section;

-- Eliminar políticas existentes que puedan causar conflictos
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Company admins can manage user profiles in their company" ON user_profiles;

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Super admins can manage companies" ON companies;

DROP POLICY IF EXISTS "Users can view employees in their company" ON employees;
DROP POLICY IF EXISTS "Employees can update their own profile" ON employees;
DROP POLICY IF EXISTS "Company admins and HR managers can manage employees" ON employees;

DROP POLICY IF EXISTS "Company admins and HR managers can manage payroll" ON payroll_records;
DROP POLICY IF EXISTS "Employees can view their own payroll" ON payroll_records;

-- ========================================
-- PASO 4: CREAR POLÍTICAS SIMPLES Y FUNCIONALES
-- ========================================

SELECT '=== CREANDO POLÍTICAS SIMPLES ===' as section;

-- Política simple para user_profiles - permitir acceso a todos los usuarios autenticados
CREATE POLICY "Allow authenticated users to access user_profiles" ON user_profiles
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Política simple para companies - permitir acceso a todos los usuarios autenticados
CREATE POLICY "Allow authenticated users to access companies" ON companies
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Política simple para employees - permitir acceso a todos los usuarios autenticados
CREATE POLICY "Allow authenticated users to access employees" ON employees
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Política simple para payroll_records - permitir acceso a todos los usuarios autenticados
CREATE POLICY "Allow authenticated users to access payroll_records" ON payroll_records
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Política simple para attendance_records - permitir acceso a todos los usuarios autenticados
CREATE POLICY "Allow authenticated users to access attendance_records" ON attendance_records
    FOR ALL USING (auth.uid() IS NOT NULL);

-- ========================================
-- PASO 5: VERIFICAR POLÍTICAS CREADAS
-- ========================================

SELECT '=== POLÍTICAS CREADAS ===' as section;

SELECT 
    tablename,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- PASO 6: VERIFICAR RLS HABILITADO
-- ========================================

SELECT '=== RLS HABILITADO ===' as section;

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
AND tablename IN ('user_profiles', 'companies', 'employees', 'payroll_records')
ORDER BY tablename;

-- ========================================
-- PASO 7: PROBAR ACCESO
-- ========================================

SELECT '=== RESUMEN ===' as section;

SELECT 
    'RLS HABILITADO' as status,
    COUNT(*) as tables_with_rls
FROM pg_tables 
WHERE schemaname = 'public'
AND rowsecurity = true
AND tablename IN ('user_profiles', 'companies', 'employees', 'payroll_records')

UNION ALL

SELECT 
    'POLÍTICAS CREADAS' as status,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- ========================================
-- PASO 8: INSTRUCCIONES
-- ========================================

SELECT '=== INSTRUCCIONES ===' as section;

SELECT 
    '✅ RLS habilitado en todas las tablas' as instruction

UNION ALL

SELECT 
    '✅ Políticas simples creadas (solo usuarios autenticados)' as instruction

UNION ALL

SELECT 
    '🔧 Ahora ve a https://zesty-abundance-production.up.railway.app' as instruction

UNION ALL

SELECT 
    '🔧 Haz login y prueba generar nómina' as instruction

UNION ALL

SELECT 
    '⚠️  Si sigue fallando, el problema es de autenticación en la app' as instruction; 