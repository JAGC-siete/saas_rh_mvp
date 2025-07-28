-- ============================================
-- SCRIPT COMPLETO: MIGRACIÓN + FIX HORARIOS
-- ============================================

-- PASO 1: MIGRAR EMPLEADOS DE PARAGON
INSERT INTO companies (id, name, subdomain, settings, is_active, created_at, updated_at) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Paragon Honduras',
    'paragon-hn',
    '{"currency": "HNL", "timezone": "America/Tegucigalpa", "language": "es"}',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- PASO 2: INSERTAR EMPLEADOS CON DATOS CORREGIDOS
INSERT INTO employees (id, dni, name, role, base_salary, bank_name, bank_account, status, company_id, created_at, updated_at) VALUES
('111e4567-e89b-12d3-a456-426614174001', '08011234567890', 'Ana García López', 'Gerente de Ventas', 25000.0, 'BAC Honduras', '20240001001', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174002', '05019876543210', 'Carlos Mendoza', 'Desarrollador Senior', 22000.0, 'Banco Atlántida', '20240001002', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174003', '08015555444433', 'María Rodríguez', 'Diseñadora UI/UX', 18000.0, 'Banco de Occidente', '20240001003', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174004', '18012345678901', 'José Luis Fernández', 'Analista de Sistemas', 20000.0, 'Banrural', '20240001004', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174005', '05017777888899', 'Patricia Gómez', 'Contadora', 19000.0, 'BAC Honduras', '20240001005', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174006', '08013333222211', 'Roberto Castro', 'Técnico de Soporte', 15500.0, 'Banco Atlántida', '20240001006', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174007', '18011111000099', 'Lucia Morales', 'Especialista en Marketing', 17000.0, 'Banco de Occidente', '20240001007', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174008', '05014444333322', 'Fernando Jiménez', 'Administrador de Base de Datos', 21000.0, 'Banrural', '20240001008', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174009', '08016666777788', 'Sandra Vargas', 'Jefa de Recursos Humanos', 24000.0, 'BAC Honduras', '20240001009', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174010', '18019999888877', 'Andrés Navarro', 'Desarrollador Frontend', 18500.0, 'Banco Atlántida', '20240001010', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174011', '05011122334455', 'Carmen Flores', 'Analista de Calidad', 17500.0, 'Banco de Occidente', '20240001011', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174012', '08015566778899', 'Diego Herrera', 'Supervisor de Producción', 19500.0, 'Banrural', '20240001012', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174013', '18013344556677', 'Elena Ruiz', 'Coordinadora de Proyectos', 20500.0, 'BAC Honduras', '20240001013', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174014', '05017788990011', 'Gabriel Santos', 'Técnico de Redes', 16000.0, 'Banco Atlántida', '20240001014', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174015', '08012233445566', 'Isabel Delgado', 'Asistente Ejecutiva', 15500.0, 'Banco de Occidente', '20240001015', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174016', '18016677889900', 'Manuel Torres', 'Desarrollador Backend', 19000.0, 'Banrural', '20240001016', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174017', '05014455667788', 'Natalia Espinoza', 'Especialista en Seguridad', 22500.0, 'BAC Honduras', '20240001017', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174018', '08018899001122', 'Oscar Medina', 'Ingeniero DevOps', 23000.0, 'Banco Atlántida', '20240001018', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174019', '18015566778800', 'Paola Guerrero', 'Analista Financiera', 18000.0, 'Banco de Occidente', '20240001019', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174020', '05012233445500', 'Ricardo Aguilar', 'Jefe de Operaciones', 26000.0, 'Banrural', '20240001020', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174021', '08016677889911', 'Silvia Romero', 'Consultora de TI', 21500.0, 'BAC Honduras', '20240001021', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174022', '18013344556600', 'Tomás Vega', 'Arquitecto de Software', 25500.0, 'Banco Atlántida', '20240001022', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174023', '05019988776655', 'Valeria Campos', 'Product Manager', 24500.0, 'Banco de Occidente', '20240001023', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174024', '08014455667700', 'William Peña', 'Especialista en Datos', 20000.0, 'Banrural', '20240001024', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174025', '18017788990022', 'Ximena Ramos', 'UX Researcher', 18500.0, 'BAC Honduras', '20240001025', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174026', '05015566778833', 'Yolanda Soto', 'Gerente de Calidad', 23500.0, 'Banco Atlántida', '20240001026', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174027', '08013344556611', 'Zacarias Luna', 'Coordinador de TI', 19500.0, 'Banco de Occidente', '20240001027', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174028', '18011122334400', 'Alberto Chávez', 'Auditor Interno', 21000.0, 'Banrural', '20240001028', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174029', '05018899001144', 'Beatriz Moreno', 'Secretaria Ejecutiva', 15500.0, 'BAC Honduras', '20240001029', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174030', '08015566778844', 'César Paredes', 'Técnico en Sistemas', 16500.0, 'Banco Atlántida', '20240001030', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174031', '18012233445577', 'Daniela Ortega', 'Desarrolladora Mobile', 19000.0, 'Banco de Occidente', '20240001031', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174032', '05016677889955', 'Eduardo Silva', 'Gerente de Proyecto', 24000.0, 'Banrural', '20240001032', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174033', '08014455667722', 'Fabiola Cruz', 'Especialista en Testing', 17500.0, 'BAC Honduras', '20240001033', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174034', '18018899001166', 'Guillermo Reyes', 'Ingeniero de Software', 20500.0, 'Banco Atlántida', '20240001034', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174035', '05013344556699', 'Helena Varela', 'Analista de Negocios', 18500.0, 'Banco de Occidente', '20240001035', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174036', '08017788990055', 'Iván Sandoval', 'DevOps Engineer', 22000.0, 'Banrural', '20240001036', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174037', '18015566778866', 'Juana Méndez', 'Coordinadora de Ventas', 19500.0, 'BAC Honduras', '20240001037', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174038', '05012233445588', 'Kevin López', 'Administrador de Sistemas', 18000.0, 'Banco Atlántida', '20240001038', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174039', '08016677889977', 'Liliana Fuentes', 'Especialista en CRM', 17000.0, 'Banco de Occidente', '20240001039', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174040', '18014455667744', 'Mario Castillo', 'Jefe de Infraestructura', 25000.0, 'Banrural', '20240001040', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174041', '05019988776600', 'Norma Alvarado', 'Consultora Senior', 23000.0, 'BAC Honduras', '20240001041', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174042', '08013344556655', 'Orlando Díaz', 'Técnico Especializado', 16000.0, 'Banco Atlántida', '20240001042', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174043', '18011122334488', 'Pilar Hernández', 'Gerente de Desarrollo', 26500.0, 'Banco de Occidente', '20240001043', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174044', '05018899001199', 'Quintín Velásquez', 'Coordinador Técnico', 19000.0, 'Banrural', '20240001044', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174045', '08015566778899', 'Rosa Martínez', 'Analista Senior', 20000.0, 'BAC Honduras', '20240001045', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174046', '18017788990077', 'Sergio Ramírez', 'Lead Developer', 24000.0, 'Banco Atlántida', '20240001046', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174047', '05014455667766', 'Teresa Jiménez', 'Especialista en BI', 21500.0, 'Banco de Occidente', '20240001047', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174048', '08012233445533', 'Ulises García', 'Supervisor de TI', 20500.0, 'Banrural', '20240001048', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174049', '18016677889988', 'Verónica Sánchez', 'Project Manager', 22500.0, 'BAC Honduras', '20240001049', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174050', '05011122334422', 'Walter Morales', 'Ingeniero Senior', 23500.0, 'Banco Atlántida', '20240001050', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174051', '08019988776611', 'Xiomara Cáceres', 'Analista de Procesos', 18000.0, 'Banco de Occidente', '20240001051', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174052', '18015566778811', 'Yuri Contreras', 'Desarrollador Full Stack', 21000.0, 'Banrural', '20240001052', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
('111e4567-e89b-12d3-a456-426614174053', '05013344556644', 'Zenón Villanueva', 'Director Técnico', 28000.0, 'BAC Honduras', '20240001053', 'active', '00000000-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (dni, company_id) DO NOTHING;

-- PASO 3: CREAR HORARIO ESTÁNDAR PARAGON
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
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'Horario Estándar Paragon 8AM-5PM',
    '08:00', '17:00',  -- Lunes
    '08:00', '17:00',  -- Martes  
    '08:00', '17:00',  -- Miércoles
    '08:00', '17:00',  -- Jueves
    '08:00', '17:00',  -- Viernes
    NULL, NULL,        -- Sábado (no trabajan)
    NULL, NULL,        -- Domingo (no trabajan)
    60,                -- 1 hora de almuerzo
    'America/Tegucigalpa'
) ON CONFLICT (id) DO NOTHING;

-- PASO 4: ASIGNAR HORARIO A TODOS LOS EMPLEADOS
UPDATE employees 
SET 
    work_schedule_id = '22222222-2222-2222-2222-222222222222',
    company_id = COALESCE(company_id, '00000000-0000-0000-0000-000000000001')
WHERE work_schedule_id IS NULL;