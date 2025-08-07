-- ============================================
-- CREAR EMPLEADOS WALTER Y VICTOR EN SUPABASE
-- ============================================

-- 1. Crear departamento COMPLIANCE si no existe
INSERT INTO departments (id, company_id, name, description, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM companies LIMIT 1),
    'COMPLIANCE',
    'Departamento de Cumplimiento',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM departments WHERE name = 'COMPLIANCE'
);

-- 2. Crear horario estándar si no existe
INSERT INTO work_schedules (
    id,
    company_id,
    name,
    monday_start, monday_end,
    tuesday_start, tuesday_end,
    wednesday_start, wednesday_end,
    thursday_start, thursday_end,
    friday_start, friday_end,
    saturday_start, saturday_end,
    sunday_start, sunday_end,
    break_duration,
    timezone,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM companies LIMIT 1),
    'Horario Estándar Paragon 8AM-5PM',
    '08:00', '17:00',
    '08:00', '17:00',
    '08:00', '17:00',
    '08:00', '17:00',
    '08:00', '17:00',
    NULL, NULL,
    NULL, NULL,
    60,
    'America/Tegucigalpa',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM work_schedules WHERE name = 'Horario Estándar Paragon 8AM-5PM'
);

-- 3. Crear Walter Ernesto Varela Sevilla
INSERT INTO employees (
    company_id,
    department_id,
    work_schedule_id,
    employee_code,
    dni,
    name,
    role,
    position,
    base_salary,
    hire_date,
    status,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM companies LIMIT 1),
    (SELECT id FROM departments WHERE name = 'COMPLIANCE' LIMIT 1),
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon 8AM-5PM' LIMIT 1),
    'C-0097',
    '0801-1961-02339',
    'Walter Ernesto Varela Sevilla',
    'Contact Center Agent',
    'Contact Center Agent',
    14500.00,
    '2025-08-04',
    'active',
    NOW(),
    NOW()
);

-- 4. Crear Victor Enrique Maldonado Zelaya
INSERT INTO employees (
    company_id,
    department_id,
    work_schedule_id,
    employee_code,
    dni,
    name,
    role,
    position,
    base_salary,
    hire_date,
    status,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM companies LIMIT 1),
    (SELECT id FROM departments WHERE name = 'COMPLIANCE' LIMIT 1),
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon 8AM-5PM' LIMIT 1),
    'C-0098',
    '0801-1981-02936',
    'Victor Enrique Maldonado Zelaya',
    'Contact Center Agent',
    'Contact Center Agent',
    14500.00,
    '2025-08-04',
    'active',
    NOW(),
    NOW()
);

-- 5. Verificar que se crearon correctamente
SELECT 
    employee_code,
    name,
    dni,
    role,
    base_salary,
    hire_date,
    status,
    d.name as department,
    ws.name as work_schedule
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
WHERE e.employee_code IN ('C-0097', 'C-0098')
ORDER BY e.employee_code;