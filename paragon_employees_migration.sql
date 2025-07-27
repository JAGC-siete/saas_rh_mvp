-- MIGRACIÓN DE EMPLEADOS DE PARAGON AL ESQUEMA EXISTENTE
-- Generado automáticamente desde employees_202504060814.sql
-- Total de empleados: 53

-- 1. Asegurar que existe una empresa
INSERT INTO companies (id, name, subdomain, plan_type, is_active)
VALUES (
    gen_random_uuid(),
    'Paragon Company',
    'paragon',
    'premium',
    true
) ON CONFLICT (subdomain) DO NOTHING;

-- 2. Crear horario estándar
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
    timezone
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM companies WHERE subdomain = 'paragon' LIMIT 1),
    'Horario Estándar Paragon',
    '08:00:00', '17:00:00',  -- Lunes
    '08:00:00', '17:00:00',  -- Martes
    '08:00:00', '17:00:00',  -- Miércoles
    '08:00:00', '17:00:00',  -- Jueves
    '08:00:00', '17:00:00',  -- Viernes
    NULL, NULL,              -- Sábado
    NULL, NULL,              -- Domingo
    60,                      -- 1 hora de break
    'America/Tegucigalpa'
) ON CONFLICT DO NOTHING;

-- 3. Insertar empleados
INSERT INTO employees (
    id, dni, name, role, base_salary, hired_date, bank, account, status
) VALUES
(
    '8ce1ee24-b32e-4228-8f20-a1b33179c9e7',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1999-10071',                                            -- dni
    'Ericka Daniela Martinez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Procesador de Datos',                                           -- role
    'Procesador de Datos',                                           -- position (mismo que role)
    17750.0,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '746392181',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '656a1007-4f7c-4eaa-8716-569db78a8b33',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-2001-04394',                                            -- dni
    'Evelin Daniela Oseguera Aguilar',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Actualizacion de Datos',                                           -- role
    'Actualizacion de Datos',                                           -- position (mismo que role)
    17500.0,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317181',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'dc718ef3-47a9-417e-82df-9240240f2e4a',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1999-10070',                                            -- dni
    'Astrid Mariela Colindres Zelaya',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Procesador de Datos',                                           -- role
    'Procesador de Datos',                                           -- position (mismo que role)
    17750.0,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '746030901',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '60461ba4-b082-4974-8baa-dd51ec20be9f',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-2000-20638',                                            -- dni
    'Helen Daniela Matute Zambrano',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Vericacion de Datos-Español',                                           -- role
    'Vericacion de Datos-Español',                                           -- position (mismo que role)
    17500.0,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317246',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'f40960fc-8a9b-41bd-92ea-642c8bfd9bf6',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1999-15616',                                            -- dni
    'Emely Rachel Romero Cabrera',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Vericacion de Datos-Español',                                           -- role
    'Vericacion de Datos-Español',                                           -- position (mismo que role)
    17500.0,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317289',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '9414bfba-3b6f-4d48-9569-ff25c6b6ac2e',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1988-21145',                                            -- dni
    'Yorleny Paveth Oliva Maldonado',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Vericacion de Datos-Español',                                           -- role
    'Vericacion de Datos-Español',                                           -- position (mismo que role)
    17500.0,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317335',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'aa7f3059-2222-47cc-8203-4801994055cb',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-2012-22694',                                            -- dni
    'Isis Amaleth Ardon Maradiaga',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Vericacion de Datos-Español',                                           -- role
    'Vericacion de Datos-Español',                                           -- position (mismo que role)
    17500.0,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317386',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '22602237-cecd-4b7c-bf8f-42b130374015',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0510-1997-00186',                                            -- dni
    'David Gonzales Maldonado',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Data Entry',                                           -- role
    'Data Entry',                                           -- position (mismo que role)
    18200.0,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317408',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '9ee95a39-e8fa-44ae-9949-330dc1f33351',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1988-14537',                                            -- dni
    'Luis Francisco Murillo Carcamo',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Negociación',                                           -- role
    'Negociación',                                           -- position (mismo que role)
    17500.0,                                      -- base_salary
    '2024-02-15',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317203',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '1f03db9d-76f9-41ce-a3fb-09b91a9f517f',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1999-18157',                                            -- dni
    'Scarleth Darlene Archaga Vasquez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-02-15',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317149',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'd1e4605d-18b2-4e53-bba9-faaa95e0796f',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1999-01397',                                            -- dni
    'Juan De Dios Caceres Nuñez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    19100.0,                                      -- base_salary
    '2024-02-19',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317238',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '182db905-24b8-4f73-a278-bb4eefde3d26',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1997-04866',                                            -- dni
    'Jesús Alcides Sagastume Martínez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    17500.0,                                      -- base_salary
    '2024-04-02',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '744381051',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '54f89fe0-ecb5-402c-8364-9cbcfe806149',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '1505-1990-00439',                                            -- dni
    'Jonny Omar Salinas Rosales',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    15500.0,                                      -- base_salary
    '2024-04-11',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213180188733',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'bcef4f64-6049-409c-adff-83c9f9fafd95',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0615-1986-00142',                                            -- dni
    'Francisco Javier Mendez Montenegro Manager',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    '21000',                                           -- role
    '21000',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317300',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '18dd818c-ee95-49d5-aff7-1075c76120cb',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-2001-22056',                                            -- dni
    'Angel David Alvarenga Martinez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Actualizacion de Datos',                                           -- role
    'Actualizacion de Datos',                                           -- position (mismo que role)
    17300.0,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317122',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '08d05e30-35f9-4709-b00c-79a0aae07e07',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1990-21037',                                            -- dni
    'Lourdes Raquel Aguirre',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Actualizacion de Datos',                                           -- role
    'Actualizacion de Datos',                                           -- position (mismo que role)
    17300.0,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317165',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '8724ec76-cf14-49ed-a092-b04b4f07e95a',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1998-22685',                                            -- dni
    'Reynaldo Ariel Ramos Sierra',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-05-08',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '744501661',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '6b632a77-3a11-4192-afee-bf4849b1caa8',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1985-22949',                                            -- dni
    'Gustavo Noel Argueta Zelaya',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Gerente de Operaciones',                                           -- role
    'Gerente de Operaciones',                                           -- position (mismo que role)
    42419.0,                                      -- base_salary
    '2024-04-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'ATLANTIDA',                                           -- bank_name
    '14720267948',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '01a2cc3f-8b07-41ef-9c52-675053074a3d',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1997-11633',                                            -- dni
    'Maria de los Angeles Torres Salgado',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Procesador de Datos',                                           -- role
    'Procesador de Datos',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-06-04',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317220',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'e88be546-83cb-4da7-a776-8e6d47c04fd4',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1994-05515',                                            -- dni
    'Jose Fernando Torres Rueda',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Verificacion de Datos-Ingles',                                           -- role
    'Verificacion de Datos-Ingles',                                           -- position (mismo que role)
    18200.0,                                      -- base_salary
    '2024-06-04',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317262',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '4dab23d2-a675-4eb0-b9d2-f691f273a87a',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0823-1999-00134',                                            -- dni
    'Genesis Andrea Castro Martinez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Verificacion de Datos-Ingles',                                           -- role
    'Verificacion de Datos-Ingles',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-06-11',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317297',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '1267b80c-8fcf-4310-8cf8-ed8b06145e8c',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1998-03487',                                            -- dni
    'Kenia Isabel Zambrano Molina',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Verificacion de Datos-Ingles',                                           -- role
    'Verificacion de Datos-Ingles',                                           -- position (mismo que role)
    19100.0,                                      -- base_salary
    '2024-06-11',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317319',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'ff522b47-9260-4817-9d3f-eea009a958d1',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1999-20200',                                            -- dni
    'Wolfang Andre Sosa Lanza',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Verificacion de Datos-Ingles',                                           -- role
    'Verificacion de Datos-Ingles',                                           -- position (mismo que role)
    18700.0,                                      -- base_salary
    '2024-06-18',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317378',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '8302afd1-f600-4ce3-b27d-7dc5aeb4f5d8',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0510-1991-00731',                                            -- dni
    'Jorge Arturo Gómez Coello',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Jefe de Personal',                                           -- role
    'Jefe de Personal',                                           -- position (mismo que role)
    35000.0,                                      -- base_salary
    '2024-07-01',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317424',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '3bddd77a-3174-401e-bb01-a7fecf4d8c17',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1982-09649',                                            -- dni
    'María Lizeth Martinez Osorto',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Negociación',                                           -- role
    'Negociación',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-07-09',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '21-300-031736-0',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'e220d20b-8aa9-4bea-a929-f8f9045ac6f8',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0806-1998-00200',                                            -- dni
    'Jorge Luis Rodriguez Macedo',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Verificacion de Datos-Ingles',                                           -- role
    'Verificacion de Datos-Ingles',                                           -- position (mismo que role)
    15500.0,                                      -- base_salary
    '2024-07-16',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317467',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'a7ee8309-f1ee-4c45-8dfa-0af1f6ab88ef',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1998-04838',                                            -- dni
    'Andrea Alejandra Rojas Zuniga',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Verificacion de Datos-Ingles',                                           -- role
    'Verificacion de Datos-Ingles',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-07-16',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317440',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '2bcc5221-9eda-415b-9f23-995e0d59042c',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0101-1983-02150',                                            -- dni
    'Claudette Desiree Rollings Martinez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Negociación',                                           -- role
    'Negociación',                                           -- position (mismo que role)
    15500.0,                                      -- base_salary
    '2024-07-29',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000317572',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'ec011fd9-13e3-4add-a74a-9c3aa0185370',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1985-07239',                                            -- dni
    'Josue David Ramirez Zelaya',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Negociación',                                           -- role
    'Negociación',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-08-19',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '21-322-007062-2',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'e3341c27-3d7e-4d66-b954-3f017d8e713d',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-2003-13354',                                            -- dni
    'Gabriel Torres Salgado',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-09-02',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '751095011',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '70f76ce5-ab6d-4659-9305-7b9fbf99419e',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '1807-2003-01211',                                            -- dni
    'Javier Alberto Díaz Puerto',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Negociación',                                           -- role
    'Negociación',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-09-09',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '751204031',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'f7a05273-1110-449e-b781-e88cf959f0d1',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-2000-03226',                                            -- dni
    'Paolo Alejandro Luciano Laprade Anderson',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-09-17',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213000322762',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '2c30869b-f255-4356-8796-f8a1866c2ccb',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-2002-10616',                                            -- dni
    'Roberto Carlos Meraz Canales',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    15500.0,                                      -- base_salary
    '2024-10-11',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213050138221',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '5198c5f8-1062-48ec-8a7d-cf7fc13a9693',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1992-08677',                                            -- dni
    'Boris Arturo Rodriguez Salomon',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-06-12',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'ATLANTIDA',                                           -- bank_name
    '2020045872',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '186a1234-fd77-42e8-871c-6f417340fee1',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1993-04856',                                            -- dni
    'Gustavo Yenderson Aguilar Pérez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-10-17',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '753009291',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'cfa8f0f0-c315-4121-a2a9-6c94114633d4',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0705-1979-00080',                                            -- dni
    'Marly Lizzeth  Ávila López',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2024-10-17',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'FICOHSA',                                           -- bank_name
    '200016784019',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '8bf10112-e27f-4df3-821a-52fd6d29fedf',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1996-15245',                                            -- dni
    'Marcelo Alejandro Folgar Bonilla',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    15500.0,                                      -- base_salary
    '2024-12-16',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213050138078',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '5ca0343a-f6a0-42e8-a803-201fd7069574',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1997-23863',                                            -- dni
    'André Alexander  García Laínez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    15500.0,                                      -- base_salary
    '2025-01-02',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213210052982',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '24adfa81-de3e-4d22-969e-c398fd137ad0',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1997-04223',                                            -- dni
    'Henry Misael Corea Juares',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    15500.0,                                      -- base_salary
    '2025-01-06',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213050136695',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '2fba1b1f-dbd5-429b-8853-1495a9215d90',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-2005-09404',                                            -- dni
    'David Alejandro Santos Ordoñez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    15500.0,                                      -- base_salary
    '2025-01-06',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213050138302',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'fde53fc4-1cf6-4ae2-826e-076007f5e5c4',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801 2006 13174',                                            -- dni
    'Amsi Abigail  Urquía Durón',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    15500.0,                                      -- base_salary
    '2025-01-09',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BANPAIS',                                           -- bank_name
    '213210061698',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'a06226b8-f5ab-451c-91b3-a9f3f681aa7f',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1990-04471',                                            -- dni
    'Mario Alexander  Sanchez Vallecillo',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    14500.0,                                      -- base_salary
    '2025-01-20',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '747672791',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'd0cde21c-ead0-49f0-b384-0ee6964916ff',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1995-16860',                                            -- dni
    'Eduardo José Díaz Fernandez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2025-01-20',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '753566761',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '88e9f9fc-1b9f-4f9b-89f7-527151402595',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1993-17888',                                            -- dni
    'Charles Jair Barrientos Juarez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    14500.0,                                      -- base_salary
    '2025-01-20',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '746098571',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '073e6c22-36f7-44b4-9692-6353d824037e',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-2000-06525',                                            -- dni
    'Diana Katheryne Tejeda Elvir',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2025-01-20',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '754369161',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'f0b491d8-e9d9-4cbf-8e3d-03b906c50aba',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1974-09418',                                            -- dni
    'Sara Jhoselyn  Rodriguez López',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2025-01-20',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '750635221',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'f8e71b63-d8e1-4b8e-8643-cb845c3967b4',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '1104-1993-00014',                                            -- dni
    'Scott Holding Maradiaga Ramón',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    14500.0,                                      -- base_salary
    '2025-01-27',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '750656431',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    'a45526dc-3661-48f3-ae67-e137f7d3a693',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1996-12309',                                            -- dni
    'Fabiola Yadira Castillo Moncada',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    14500.0,                                      -- base_salary
    '2025-01-27',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'LAFISE',                                           -- bank_name
    '103504010757',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '07fc737e-bcac-4427-a2e6-8f9bdfc9e4d2',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1985-12526',                                            -- dni
    'Ligia Johana Santos Castro',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    NULL,                                      -- base_salary
    '2025-02-03',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '747268191',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '5d57a843-2293-428b-bfba-364a6280eded',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1991-05878',                                            -- dni
    'Vladimir Rodriguez Castejón',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    14500.0,                                      -- base_salary
    '2025-02-03',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '743849161',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '44b8aecc-b8b6-4edd-94a9-46e2e9bba7fe',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-1996-13787',                                            -- dni
    'Lidio Jafeth  Lino Gómez',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    14500.0,                                      -- base_salary
    '2025-02-03',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Activo' = 'Activo' THEN 'active' 
         WHEN 'Activo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '747584431',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '6bf2c47f-3858-4efa-a115-96000bee0a40',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-2003-00485',                                            -- dni
    'Jose David Garcia Zelaya',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    14500.0,                                      -- base_salary
    '2025-03-19',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '750656451',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
),(
    '114f6dec-c5e6-46ab-a2c2-1bb436fa3818',                                    -- id
    (SELECT id FROM companies LIMIT 1),                -- company_id
    NULL,                                               -- department_id (a asignar después)
    (SELECT id FROM work_schedules WHERE name = 'Horario Estándar Paragon' LIMIT 1), -- work_schedule_id
    NULL,                                               -- employee_code (a asignar después)
    '0801-2004-08839',                                            -- dni
    'Ariana Elieth Escobar Villeda',                                      -- name
    NULL,                                               -- email (a completar después)
    NULL,                                               -- phone (a completar después)
    'Contact Center Agent',                                           -- role
    'Contact Center Agent',                                           -- position (mismo que role)
    14500.0,                                      -- base_salary
    '2025-03-19',                                     -- hire_date
    NULL,                                               -- termination_date
    CASE WHEN 'Inactivo' = 'Activo' THEN 'active' 
         WHEN 'Inactivo' = 'Inactivo' THEN 'inactive' 
         ELSE 'inactive' END,                           -- status
    'BAC',                                           -- bank_name
    '749253701',                                        -- bank_account
    NULL,                                               -- emergency_contact_name
    NULL,                                               -- emergency_contact_phone
    NULL,                                               -- address
    '{}'::jsonb,                                        -- metadata
    NOW(),                                              -- created_at
    NOW()                                               -- updated_at
);

-- 4. Mensaje de confirmación
SELECT 
    COUNT(*) as empleados_insertados,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as activos,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactivos
FROM employees 
WHERE company_id = (SELECT id FROM companies WHERE subdomain = 'paragon' LIMIT 1);
