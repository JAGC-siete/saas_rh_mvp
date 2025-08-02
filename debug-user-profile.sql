-- Debug del perfil del usuario actual
-- Ejecutar esto en Supabase SQL Editor

-- Verificar el usuario autenticado
SELECT 
    'Current user ID' as info,
    auth.uid() as user_id;

-- Verificar el perfil del usuario
SELECT 
    'User profile' as info,
    id,
    company_id,
    employee_id,
    role,
    is_active,
    created_at
FROM user_profiles 
WHERE id = auth.uid();

-- Verificar si hay empresas
SELECT 
    'Companies count' as info,
    COUNT(*) as total_companies
FROM companies;

-- Verificar si hay empleados
SELECT 
    'Employees count' as info,
    COUNT(*) as total_employees
FROM employees;

-- Verificar permisos del usuario
SELECT 
    'User permissions' as info,
    permissions
FROM user_profiles 
WHERE id = auth.uid(); 