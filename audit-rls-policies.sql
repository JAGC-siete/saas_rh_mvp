-- 🔍 AUDITORÍA COMPLETA DE RLS Y POLÍTICAS EN SUPABASE
-- Ejecutar este script en Supabase Studio → SQL Editor

-- ========================================
-- PASO 1: VERIFICAR TABLAS CON RLS HABILITADO
-- ========================================

SELECT '=== TABLAS CON RLS HABILITADO ===' as section;

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
ORDER BY tablename;

-- ========================================
-- PASO 2: VERIFICAR POLÍTICAS RLS POR TABLA
-- ========================================

SELECT '=== POLÍTICAS RLS POR TABLA ===' as section;

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
ORDER BY tablename, policyname;

-- ========================================
-- PASO 3: VERIFICAR TABLAS IMPORTANTES
-- ========================================

SELECT '=== VERIFICACIÓN DE TABLAS IMPORTANTES ===' as section;

-- user_profiles
SELECT 'user_profiles' as table_name,
       COUNT(*) as total_records,
       COUNT(CASE WHEN role = 'company_admin' THEN 1 END) as company_admins,
       COUNT(CASE WHEN role = 'hr_manager' THEN 1 END) as hr_managers,
       COUNT(CASE WHEN role = 'employee' THEN 1 END) as employees
FROM user_profiles;

-- companies
SELECT 'companies' as table_name,
       COUNT(*) as total_companies,
       STRING_AGG(name, ', ') as company_names
FROM companies;

-- employees
SELECT 'employees' as table_name,
       COUNT(*) as total_employees,
       COUNT(CASE WHEN status = 'active' THEN 1 END) as active_employees
FROM employees;

-- attendance_records
SELECT 'attendance_records' as table_name,
       COUNT(*) as total_records,
       COUNT(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_records
FROM attendance_records;

-- payroll_records
SELECT 'payroll_records' as table_name,
       COUNT(*) as total_records,
       COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_records
FROM payroll_records;

-- ========================================
-- PASO 4: VERIFICAR PERMISOS DE USUARIO ESPECÍFICO
-- ========================================

SELECT '=== PERMISOS DE JORGE ===' as section;

SELECT 
    up.id,
    up.role,
    up.permissions,
    up.is_active,
    up.company_id,
    c.name as company_name,
    up.created_at
FROM user_profiles up
LEFT JOIN companies c ON c.id = up.company_id
WHERE up.id = '325a749e-7818-4d24-b29f-2c859e332aa1';

-- ========================================
-- PASO 5: VERIFICAR POLÍTICAS ESPECÍFICAS
-- ========================================

SELECT '=== POLÍTICAS DE PAYROLL ===' as section;

SELECT 
    tablename,
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('payroll_records', 'user_profiles', 'employees')
ORDER BY tablename, policyname;

-- ========================================
-- PASO 6: VERIFICAR FUNCIONES Y TRIGGERS
-- ========================================

SELECT '=== FUNCIONES Y TRIGGERS ===' as section;

-- Funciones relacionadas con RLS
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND prosrc LIKE '%auth.uid%'
ORDER BY proname;

-- Triggers
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgtype,
    tgenabled
FROM pg_trigger
WHERE tgrelid::regnamespace::name = 'public'
ORDER BY table_name, trigger_name;

-- ========================================
-- PASO 7: RESUMEN DE SEGURIDAD
-- ========================================

SELECT '=== RESUMEN DE SEGURIDAD ===' as section;

-- Tablas sin RLS
SELECT 'TABLAS SIN RLS (CRÍTICO):' as issue,
       STRING_AGG(tablename, ', ') as tables
FROM pg_tables 
WHERE schemaname = 'public' 
AND NOT rowsecurity
AND tablename NOT IN ('schema_migrations', 'supabase_migrations');

-- Tablas sin políticas
SELECT 'TABLAS SIN POLÍTICAS (CRÍTICO):' as issue,
       t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public' 
AND t.rowsecurity = true
AND p.policyname IS NULL
AND t.tablename NOT IN ('schema_migrations', 'supabase_migrations');

-- Usuarios sin perfil
SELECT 'USUARIOS AUTH SIN PERFIL:' as issue,
       COUNT(*) as count
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- ========================================
-- PASO 8: RECOMENDACIONES
-- ========================================

SELECT '=== RECOMENDACIONES ===' as section;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity) 
        THEN '❌ HABILITAR RLS EN TODAS LAS TABLAS'
        ELSE '✅ RLS HABILITADO EN TODAS LAS TABLAS'
    END as recommendation

UNION ALL

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables t
            LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
            WHERE t.schemaname = 'public' AND t.rowsecurity = true AND p.policyname IS NULL
        )
        THEN '❌ CREAR POLÍTICAS PARA TABLAS CON RLS'
        ELSE '✅ TODAS LAS TABLAS CON RLS TIENEN POLÍTICAS'
    END as recommendation

UNION ALL

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = '325a749e-7818-4d24-b29f-2c859e332aa1')
        THEN '✅ USUARIO JORGE TIENE PERFIL'
        ELSE '❌ CREAR PERFIL PARA USUARIO JORGE'
    END as recommendation

UNION ALL

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = '325a749e-7818-4d24-b29f-2c859e332aa1' AND role = 'company_admin')
        THEN '✅ USUARIO JORGE TIENE ROL COMPANY_ADMIN'
        ELSE '❌ ASIGNAR ROL COMPANY_ADMIN A JORGE'
    END as recommendation; 