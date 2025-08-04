-- Verificar estructura de la tabla employees
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'employees' 
ORDER BY ordinal_position;

-- Ver algunos registros existentes para entender el formato
SELECT 
    id,
    name,
    dni,
    base_salary,
    department_id,
    role,
    hire_date,
    status,
    bank_name,
    bank_account,
    email,
    created_at
FROM employees 
LIMIT 5;

-- Verificar company_id existente
SELECT DISTINCT company_id FROM employees; 