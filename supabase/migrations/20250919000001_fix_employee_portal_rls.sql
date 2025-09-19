-- 🔧 FIX: Employee Portal RLS Policies
-- Soluciona los problemas de acceso en el portal de empleados

-- 1. Agregar política para que empleados puedan ver su propio perfil
DROP POLICY IF EXISTS "Employees can view their own profile" ON employees;
CREATE POLICY "Employees can view their own profile" ON employees
    FOR SELECT USING (
        id IN (
            SELECT employee_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

-- 2. Asegurar que empleados puedan ver su propia información de asistencia
DROP POLICY IF EXISTS "Employees can view their own attendance" ON attendance_records;
CREATE POLICY "Employees can view their own attendance" ON attendance_records
    FOR SELECT USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

-- 3. Política para que empleados vean departamentos (para mostrar en su perfil)
DROP POLICY IF EXISTS "Employees can view their department" ON departments;
CREATE POLICY "Employees can view their department" ON departments
    FOR SELECT USING (
        id IN (
            SELECT e.department_id FROM employees e
            JOIN user_profiles up ON up.employee_id = e.id
            WHERE up.id = auth.uid()
        )
        OR
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

-- 4. Política para que empleados vean horarios de trabajo
DROP POLICY IF EXISTS "Employees can view their work schedule" ON work_schedules;
CREATE POLICY "Employees can view their work schedule" ON work_schedules
    FOR SELECT USING (
        id IN (
            SELECT e.work_schedule_id FROM employees e
            JOIN user_profiles up ON up.employee_id = e.id
            WHERE up.id = auth.uid()
        )
        OR
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

-- 5. Verificar y corregir datos de ejemplo si es necesario
-- Asegurar que jorge7gomez@gmail.com tenga un user_profile correcto
DO $$
DECLARE
    jorge_user_id uuid;
    jorge_employee_id uuid;
    company_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Buscar el usuario de Jorge en auth.users
    SELECT id INTO jorge_user_id 
    FROM auth.users 
    WHERE email = 'jorge7gomez@gmail.com' 
    LIMIT 1;
    
    -- Buscar el empleado Jorge
    SELECT id INTO jorge_employee_id 
    FROM employees 
    WHERE email = 'jorge7gomez@gmail.com' 
    AND company_id = company_id
    LIMIT 1;
    
    -- Si ambos existen, asegurar que el user_profile esté correcto
    IF jorge_user_id IS NOT NULL AND jorge_employee_id IS NOT NULL THEN
        INSERT INTO user_profiles (id, company_id, employee_id, role, is_active)
        VALUES (jorge_user_id, company_id, jorge_employee_id, 'employee', true)
        ON CONFLICT (id) DO UPDATE SET
            employee_id = EXCLUDED.employee_id,
            company_id = EXCLUDED.company_id,
            role = CASE 
                WHEN user_profiles.role = 'super_admin' THEN 'super_admin'
                ELSE 'employee'
            END,
            updated_at = NOW();
            
        RAISE NOTICE 'User profile updated for jorge7gomez@gmail.com: user_id=%, employee_id=%', jorge_user_id, jorge_employee_id;
    ELSE
        RAISE NOTICE 'Missing data: jorge_user_id=%, jorge_employee_id=%', jorge_user_id, jorge_employee_id;
    END IF;
END $$;

-- 6. Función de diagnóstico para verificar el estado
CREATE OR REPLACE FUNCTION diagnose_employee_access(employee_email TEXT)
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check 1: Usuario existe en auth.users
    RETURN QUERY
    SELECT 
        'auth_user_exists'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM auth.users WHERE email = employee_email) 
             THEN 'OK' ELSE 'MISSING' END::TEXT,
        COALESCE(
            (SELECT 'User ID: ' || id::TEXT FROM auth.users WHERE email = employee_email LIMIT 1),
            'No user found in auth.users'
        )::TEXT;
    
    -- Check 2: Empleado existe en employees
    RETURN QUERY
    SELECT 
        'employee_exists'::TEXT,
        CASE WHEN EXISTS(SELECT 1 FROM employees WHERE email = employee_email) 
             THEN 'OK' ELSE 'MISSING' END::TEXT,
        COALESCE(
            (SELECT 'Employee ID: ' || id::TEXT || ', Company: ' || company_id::TEXT 
             FROM employees WHERE email = employee_email LIMIT 1),
            'No employee found in employees table'
        )::TEXT;
    
    -- Check 3: user_profile existe y está vinculado
    RETURN QUERY
    SELECT 
        'user_profile_linked'::TEXT,
        CASE WHEN EXISTS(
            SELECT 1 FROM user_profiles up
            JOIN auth.users au ON au.id = up.id
            WHERE au.email = employee_email AND up.employee_id IS NOT NULL
        ) THEN 'OK' ELSE 'MISSING' END::TEXT,
        COALESCE(
            (SELECT 'Profile exists, employee_id: ' || up.employee_id::TEXT || ', role: ' || up.role
             FROM user_profiles up
             JOIN auth.users au ON au.id = up.id
             WHERE au.email = employee_email LIMIT 1),
            'No linked user_profile found'
        )::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar diagnóstico para jorge
SELECT * FROM diagnose_employee_access('jorge7gomez@gmail.com');
