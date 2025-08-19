-- ARREGLAR API DE LOGIN - BUSCAR POR EMAIL EN VEZ DE DNI
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si Gustavo existe en employees
SELECT 
    'GUSTAVO EN EMPLOYEES:' as info,
    id,
    name,
    email,
    dni,
    role,
    position
FROM employees 
WHERE email = 'gustavo.gnaz@gmail.com'
OR dni = 'gustavo.gnaz@gmail.com';

-- 2. Si no existe, crear entrada básica
INSERT INTO employees (name, email, dni, role, position, company_id, status, created_at, updated_at)
VALUES (
    'Gustavo Gnaz',
    'gustavo.gnaz@gmail.com',
    'gustavo.gnaz@gmail.com',
    'admin',
    'Administrador',
    '00000000-0000-0000-0000-000000000001',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- 3. Verificar que se creó
SELECT 
    'GUSTAVO DESPUÉS DE INSERT:' as info,
    id,
    name,
    email,
    dni,
    role,
    position,
    status
FROM employees 
WHERE email = 'gustavo.gnaz@gmail.com';

-- 4. Estado final
SELECT '✅ GUSTAVO DEBERÍA ESTAR EN EMPLOYEES AHORA' as status;
