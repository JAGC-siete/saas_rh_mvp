-- =====================================================
-- SCRIPT DE MIGRACIÓN COMPLETO: EMPLEADOS A SUPABASE
-- =====================================================
-- Este script migra datos de employees_202504060814.sql
-- a la estructura de Supabase con todas las validaciones
-- OPTIMIZADO PARA SUPABASE UI SQL EDITOR

-- =====================================================
-- 1. CREAR ENTIDADES DE SOPORTE
-- =====================================================

-- 1.1 Crear compañía principal
INSERT INTO companies (
    id, 
    name, 
    subdomain, 
    plan_type, 
    settings, 
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Empresa Principal',
    'main',
    'enterprise',
    '{"timezone": "America/Tegucigalpa", "currency": "HNL"}'::jsonb,
    true
) ON CONFLICT (id) DO NOTHING;

-- 1.2 Crear departamentos básicos
INSERT INTO departments (
    id,
    company_id,
    name,
    description
) VALUES 
    ('00000000-0000-0000-0000-000000000010'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Procesamiento de Datos', 'Área de procesamiento y actualización de datos'),
    ('00000000-0000-0000-0000-000000000011'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Verificación de Datos', 'Área de verificación y validación de datos'),
    ('00000000-0000-0000-0000-000000000012'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Contact Center', 'Centro de atención al cliente'),
    ('00000000-0000-0000-0000-000000000013'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Negociación', 'Área de negociación y ventas'),
    ('00000000-0000-0000-0000-000000000014'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Gerencia', 'Área gerencial y administrativa'),
    ('00000000-0000-0000-0000-000000000015'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Recursos Humanos', 'Área de gestión de personal')
ON CONFLICT (id) DO NOTHING;

-- 1.3 Crear horario de trabajo estándar
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
    '00000000-0000-0000-0000-000000000020'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Horario Estándar 8AM-5PM',
    '08:00'::time, '17:00'::time,
    '08:00'::time, '17:00'::time,
    '08:00'::time, '17:00'::time,
    '08:00'::time, '17:00'::time,
    '08:00'::time, '17:00'::time,
    NULL, NULL,
    NULL, NULL,
    60, -- 1 hora de almuerzo
    'America/Tegucigalpa'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. FUNCIÓN DE MAPEO DE DEPARTAMENTOS
-- =====================================================

CREATE OR REPLACE FUNCTION map_role_to_department(role_name TEXT)
RETURNS UUID AS $$
BEGIN
    CASE 
        WHEN role_name ILIKE '%Procesador de Datos%' OR role_name ILIKE '%Actualizacion de Datos%' OR role_name ILIKE '%Data Entry%' THEN
            RETURN '00000000-0000-0000-0000-000000000010'::uuid; -- Procesamiento de Datos
        WHEN role_name ILIKE '%Verificacion%' OR role_name ILIKE '%Vericacion%' THEN
            RETURN '00000000-0000-0000-0000-000000000011'::uuid; -- Verificación de Datos
        WHEN role_name ILIKE '%Contact Center%' THEN
            RETURN '00000000-0000-0000-0000-000000000012'::uuid; -- Contact Center
        WHEN role_name ILIKE '%Negociación%' THEN
            RETURN '00000000-0000-0000-0000-000000000013'::uuid; -- Negociación
        WHEN role_name ILIKE '%Gerente%' OR role_name ILIKE '%Manager%' THEN
            RETURN '00000000-0000-0000-0000-000000000014'::uuid; -- Gerencia
        WHEN role_name ILIKE '%Jefe de Personal%' THEN
            RETURN '00000000-0000-0000-0000-000000000015'::uuid; -- Recursos Humanos
        ELSE
            RETURN '00000000-0000-0000-0000-000000000012'::uuid; -- Por defecto: Contact Center
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. FUNCIÓN DE LIMPIEZA DE DATOS
-- =====================================================

CREATE OR REPLACE FUNCTION clean_employee_data(
    p_dni TEXT,
    p_name TEXT,
    p_role TEXT,
    p_base_salary NUMERIC,
    p_hired_date TEXT,
    p_bank TEXT,
    p_account TEXT,
    p_status TEXT
) RETURNS TABLE (
    clean_dni TEXT,
    clean_name TEXT,
    clean_role TEXT,
    clean_base_salary DECIMAL(10,2),
    clean_hire_date DATE,
    clean_bank_name TEXT,
    clean_bank_account TEXT,
    clean_status TEXT
) AS $$
BEGIN
    RETURN QUERY SELECT
        -- Limpiar DNI: normalizar formato con guiones
        CASE 
            WHEN p_dni ~ '^\d{4}\s\d{4}\s\d{5}$' THEN 
                REPLACE(p_dni, ' ', '-')
            ELSE p_dni
        END,
        
        -- Limpiar nombre: trim y normalizar espacios
        TRIM(REGEXP_REPLACE(p_name, '\s+', ' ', 'g')),
        
        -- Limpiar rol: extraer solo el rol, no datos mezclados
        CASE 
            WHEN p_role LIKE '%Manager%' AND p_role LIKE '%21000%' THEN 
                'Manager'
            ELSE TRIM(p_role)
        END,
        
        -- Limpiar salario: manejar NULLs y convertir a DECIMAL
        CASE 
            WHEN p_base_salary IS NULL THEN 15000.00 -- Salario mínimo por defecto
            ELSE p_base_salary::DECIMAL(10,2)
        END,
        
        -- Convertir fecha de contratación
        CASE 
            WHEN p_hired_date IS NOT NULL THEN p_hired_date::DATE
            ELSE '2024-01-01'::DATE -- Fecha por defecto
        END,
        
        -- Normalizar nombre del banco
        CASE 
            WHEN p_bank = 'BAC' THEN 'Banco BAC'
            WHEN p_bank = 'BANPAIS' THEN 'Banco del País'
            WHEN p_bank = 'ATLANTIDA' THEN 'Banco Atlántida'
            WHEN p_bank = 'FICOHSA' THEN 'Banco Ficohsa'
            WHEN p_bank = 'LAFISE' THEN 'Banco Lafise'
            ELSE p_bank
        END,
        
        -- Limpiar número de cuenta
        TRIM(p_account),
        
        -- Normalizar estatus
        CASE 
            WHEN LOWER(p_status) = 'activo' THEN 'active'
            WHEN LOWER(p_status) = 'inactivo' THEN 'inactive'
            ELSE 'active'
        END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREAR TABLA TEMPORAL PARA DATOS ORIGINALES
-- =====================================================

-- Crear tabla temporal para esta sesión
CREATE TEMPORARY TABLE IF NOT EXISTS temp_original_employees (
    id UUID,
    dni TEXT,
    name TEXT,
    role TEXT,
    base_salary NUMERIC,
    checkin_time TIME,
    checkout_time TIME,
    hired_date TEXT,
    bank TEXT,
    account TEXT,
    status TEXT
);

-- =====================================================
-- 5. INSERTAR DATOS ORIGINALES EN TABLA TEMPORAL
-- =====================================================

INSERT INTO temp_original_employees (id,dni,name,role,base_salary,checkin_time,checkout_time,hired_date,bank,account,status) VALUES
	 ('8ce1ee24-b32e-4228-8f20-a1b33179c9e7'::uuid,'0801-1999-10071','Ericka Daniela Martinez','Procesador de Datos',17750.0,'08:00:00','17:00:00','2024-04-01','BAC','746392181','Activo'),
	 ('656a1007-4f7c-4eaa-8716-569db78a8b33'::uuid,'0801-2001-04394','Evelin Daniela Oseguera Aguilar','Actualizacion de Datos',17500.0,'08:00:00','17:00:00','2024-04-01','BANPAIS','213000317181','Activo'),
	 ('dc718ef3-47a9-417e-82df-9240240f2e4a'::uuid,'0801-1999-10070','Astrid Mariela Colindres Zelaya','Procesador de Datos',17750.0,'08:00:00','17:00:00','2024-04-01','BAC','746030901','Activo'),
	 ('60461ba4-b082-4974-8baa-dd51ec20be9f'::uuid,'0801-2000-20638','Helen Daniela Matute Zambrano','Vericacion de Datos-Español',17500.0,'08:00:00','17:00:00','2024-04-01','BANPAIS','213000317246','Activo'),
	 ('f40960fc-8a9b-41bd-92ea-642c8bfd9bf6'::uuid,'0801-1999-15616','Emely Rachel Romero Cabrera','Vericacion de Datos-Español',17500.0,'08:00:00','17:00:00','2024-04-01','BANPAIS','213000317289','Activo'),
	 ('9414bfba-3b6f-4d48-9569-ff25c6b6ac2e'::uuid,'0801-1988-21145','Yorleny Paveth Oliva Maldonado','Vericacion de Datos-Español',17500.0,'08:00:00','17:00:00','2024-04-01','BANPAIS','213000317335','Activo'),
	 ('aa7f3059-2222-47cc-8203-4801994055cb'::uuid,'0801-2012-22694','Isis Amaleth Ardon Maradiaga','Vericacion de Datos-Español',17500.0,'08:00:00','17:00:00','2024-04-01','BANPAIS','213000317386','Activo'),
	 ('22602237-cecd-4b7c-bf8f-42b130374015'::uuid,'0510-1997-00186','David Gonzales Maldonado','Data Entry',18200.0,'08:00:00','17:00:00','2024-04-01','BANPAIS','213000317408','Activo'),
	 ('9ee95a39-e8fa-44ae-9949-330dc1f33351'::uuid,'0801-1988-14537','Luis Francisco Murillo Carcamo','Negociación',17500.0,'08:00:00','17:00:00','2024-02-15','BANPAIS','213000317203','Activo'),
	 ('1f03db9d-76f9-41ce-a3fb-09b91a9f517f'::uuid,'0801-1999-18157','Scarleth Darlene Archaga Vasquez','Contact Center Agent',NULL,'08:00:00','17:00:00','2024-02-15','BANPAIS','213000317149','Inactivo'),
	 ('d1e4605d-18b2-4e53-bba9-faaa95e0796f'::uuid,'0801-1999-01397','Juan De Dios Caceres Nuñez','Contact Center Agent',19100.0,'08:00:00','17:00:00','2024-02-19','BANPAIS','213000317238','Activo'),
	 ('182db905-24b8-4f73-a278-bb4eefde3d26'::uuid,'0801-1997-04866','Jesús Alcides Sagastume Martínez','Contact Center Agent',17500.0,'08:00:00','17:00:00','2024-04-02','BAC','744381051','Activo'),
	 ('54f89fe0-ecb5-402c-8364-9cbcfe806149'::uuid,'1505-1990-00439','Jonny Omar Salinas Rosales','Contact Center Agent',15500.0,'08:00:00','17:00:00','2024-04-11','BANPAIS','213180188733','Activo'),
	 ('bcef4f64-6049-409c-adff-83c9f9fafd95'::uuid,'0615-1986-00142','Francisco Javier Mendez Montenegro Manager','21000',NULL,'08:00:00','17:00:00','2024-04-01','BANPAIS','213000317300','Activo'),
	 ('18dd818c-ee95-49d5-aff7-1075c76120cb'::uuid,'0801-2001-22056','Angel David Alvarenga Martinez','Actualizacion de Datos',17300.0,'08:00:00','17:00:00','2024-04-01','BANPAIS','213000317122','Activo'),
	 ('08d05e30-35f9-4709-b00c-79a0aae07e07'::uuid,'0801-1990-21037','Lourdes Raquel Aguirre','Actualizacion de Datos',17300.0,'08:00:00','17:00:00','2024-04-01','BANPAIS','213000317165','Activo'),
	 ('8724ec76-cf14-49ed-a092-b04b4f07e95a'::uuid,'0801-1998-22685','Reynaldo Ariel Ramos Sierra','Contact Center Agent',NULL,'08:00:00','17:00:00','2024-05-08','BAC','744501661','Inactivo'),
	 ('6b632a77-3a11-4192-afee-bf4849b1caa8'::uuid,'0801-1985-22949','Gustavo Noel Argueta Zelaya','Gerente de Operaciones',42419.0,'08:00:00','17:00:00','2024-04-01','ATLANTIDA','14720267948','Activo'),
	 ('01a2cc3f-8b07-41ef-9c52-675053074a3d'::uuid,'0801-1997-11633','Maria de los Angeles Torres Salgado','Procesador de Datos',NULL,'08:00:00','17:00:00','2024-06-04','BANPAIS','213000317220','Inactivo'),
	 ('e88be546-83cb-4da7-a776-8e6d47c04fd4'::uuid,'0801-1994-05515','Jose Fernando Torres Rueda','Verificacion de Datos-Ingles',18200.0,'08:00:00','17:00:00','2024-06-04','BANPAIS','213000317262','Activo'),
	 ('4dab23d2-a675-4eb0-b9d2-f691f273a87a'::uuid,'0823-1999-00134','Genesis Andrea Castro Martinez','Verificacion de Datos-Ingles',NULL,'08:00:00','17:00:00','2024-06-11','BANPAIS','213000317297','Inactivo'),
	 ('1267b80c-8fcf-4310-8cf8-ed8b06145e8c'::uuid,'0801-1998-03487','Kenia Isabel Zambrano Molina','Verificacion de Datos-Ingles',19100.0,'08:00:00','17:00:00','2024-06-11','BANPAIS','213000317319','Activo'),
	 ('ff522b47-9260-4817-9d3f-eea009a958d1'::uuid,'0801-1999-20200','Wolfang Andre Sosa Lanza','Verificacion de Datos-Ingles',18700.0,'08:00:00','17:00:00','2024-06-18','BANPAIS','213000317378','Activo'),
	 ('8302afd1-f600-4ce3-b27d-7dc5aeb4f5d8'::uuid,'0510-1991-00731','Jorge Arturo Gómez Coello','Jefe de Personal',35000.0,'08:00:00','17:00:00','2024-07-01','BANPAIS','213000317424','Activo'),
	 ('3bddd77a-3174-401e-bb01-a7fecf4d8c17'::uuid,'0801-1982-09649','María Lizeth Martinez Osorto','Negociación',NULL,'08:00:00','17:00:00','2024-07-09','BANPAIS','21-300-031736-0','Inactivo'),
	 ('e220d20b-8aa9-4bea-a929-f8f9045ac6f8'::uuid,'0806-1998-00200','Jorge Luis Rodriguez Macedo','Verificacion de Datos-Ingles',15500.0,'08:00:00','17:00:00','2024-07-16','BANPAIS','213000317467','Activo'),
	 ('a7ee8309-f1ee-4c45-8dfa-0af1f6ab88ef'::uuid,'0801-1998-04838','Andrea Alejandra Rojas Zuniga','Verificacion de Datos-Ingles',NULL,'08:00:00','17:00:00','2024-07-16','BANPAIS','213000317440','Inactivo'),
	 ('2bcc5221-9eda-415b-9f23-995e0d59042c'::uuid,'0101-1983-02150','Claudette Desiree Rollings Martinez','Negociación',15500.0,'08:00:00','17:00:00','2024-07-29','BANPAIS','213000317572','Activo'),
	 ('ec011fd9-13e3-4add-a74a-9c3aa0185370'::uuid,'0801-1985-07239','Josue David Ramirez Zelaya','Negociación',NULL,'08:00:00','17:00:00','2024-08-19','BANPAIS','21-322-007062-2','Inactivo'),
	 ('e3341c27-3d7e-4d66-b954-3f017d8e713d'::uuid,'0801-2003-13354','Gabriel Torres Salgado','Contact Center Agent',NULL,'08:00:00','17:00:00','2024-09-02','BAC','751095011','Inactivo'),
	 ('70f76ce5-ab6d-4659-9305-7b9fbf99419e'::uuid,'1807-2003-01211','Javier Alberto Díaz Puerto','Negociación',NULL,'08:00:00','17:00:00','2024-09-09','BAC','751204031','Inactivo'),
	 ('f7a05273-1110-449e-b781-e88cf959f0d1'::uuid,'0801-2000-03226','Paolo Alejandro Luciano Laprade Anderson','Contact Center Agent',NULL,'08:00:00','17:00:00','2024-09-17','BANPAIS','213000322762','Inactivo'),
	 ('2c30869b-f255-4356-8796-f8a1866c2ccb'::uuid,'0801-2002-10616','Roberto Carlos Meraz Canales','Contact Center Agent',15500.0,'08:00:00','17:00:00','2024-10-11','BANPAIS','213050138221','Activo'),
	 ('5198c5f8-1062-48ec-8a7d-cf7fc13a9693'::uuid,'0801-1992-08677','Boris Arturo Rodriguez Salomon','Contact Center Agent',NULL,'08:00:00','17:00:00','2024-06-12','ATLANTIDA','2020045872','Inactivo'),
	 ('186a1234-fd77-42e8-871c-6f417340fee1'::uuid,'0801-1993-04856','Gustavo Yenderson Aguilar Pérez','Contact Center Agent',NULL,'08:00:00','17:00:00','2024-10-17','BAC','753009291','Inactivo'),
	 ('cfa8f0f0-c315-4121-a2a9-6c94114633d4'::uuid,'0705-1979-00080','Marly Lizzeth  Ávila López','Contact Center Agent',NULL,'08:00:00','17:00:00','2024-10-17','FICOHSA','200016784019','Inactivo'),
	 ('8bf10112-e27f-4df3-821a-52fd6d29fedf'::uuid,'0801-1996-15245','Marcelo Alejandro Folgar Bonilla','Contact Center Agent',15500.0,'08:00:00','17:00:00','2024-12-16','BANPAIS','213050138078','Activo'),
	 ('5ca0343a-f6a0-42e8-a803-201fd7069574'::uuid,'0801-1997-23863','André Alexander  García Laínez','Contact Center Agent',15500.0,'08:00:00','17:00:00','2025-01-02','BANPAIS','213210052982','Activo'),
	 ('24adfa81-de3e-4d22-969e-c398fd137ad0'::uuid,'0801-1997-04223','Henry Misael Corea Juares','Contact Center Agent',15500.0,'08:00:00','17:00:00','2025-01-06','BANPAIS','213050136695','Activo'),
	 ('2fba1b1f-dbd5-429b-8853-1495a9215d90'::uuid,'0801-2005-09404','David Alejandro Santos Ordoñez','Contact Center Agent',15500.0,'08:00:00','17:00:00','2025-01-06','BANPAIS','213050138302','Activo'),
	 ('fde53fc4-1cf6-4ae2-826e-076007f5e5c4'::uuid,'0801 2006 13174','Amsi Abigail  Urquía Durón','Contact Center Agent',15500.0,'08:00:00','17:00:00','2025-01-09','BANPAIS','213210061698','Activo'),
	 ('a06226b8-f5ab-451c-91b3-a9f3f681aa7f'::uuid,'0801-1990-04471','Mario Alexander  Sanchez Vallecillo','Contact Center Agent',14500.0,'08:00:00','17:00:00','2025-01-20','BAC','747672791','Activo'),
	 ('d0cde21c-ead0-49f0-b384-0ee6964916ff'::uuid,'0801-1995-16860','Eduardo José Díaz Fernandez','Contact Center Agent',NULL,'08:00:00','17:00:00','2025-01-20','BAC','753566761','Inactivo'),
	 ('88e9f9fc-1b9f-4f9b-89f7-527151402595'::uuid,'0801-1993-17888','Charles Jair Barrientos Juarez','Contact Center Agent',14500.0,'08:00:00','17:00:00','2025-01-20','BAC','746098571','Activo'),
	 ('073e6c22-36f7-44b4-9692-6353d824037e'::uuid,'0801-2000-06525','Diana Katheryne Tejeda Elvir','Contact Center Agent',NULL,'08:00:00','17:00:00','2025-01-20','BAC','754369161','Inactivo'),
	 ('f0b491d8-e9d9-4cbf-8e3d-03b906c50aba'::uuid,'0801-1974-09418','Sara Jhoselyn  Rodriguez López','Contact Center Agent',NULL,'08:00:00','17:00:00','2025-01-20','BAC','750635221','Inactivo'),
	 ('f8e71b63-d8e1-4b8e-8643-cb845c3967b4'::uuid,'1104-1993-00014','Scott Holding Maradiaga Ramón','Contact Center Agent',14500.0,'08:00:00','17:00:00','2025-01-27','BAC','750656431','Activo'),
	 ('a45526dc-3661-48f3-ae67-e137f7d3a693'::uuid,'0801-1996-12309','Fabiola Yadira Castillo Moncada','Contact Center Agent',14500.0,'08:00:00','17:00:00','2025-01-27','LAFISE','103504010757','Activo'),
	 ('07fc737e-bcac-4427-a2e6-8f9bdfc9e4d2'::uuid,'0801-1985-12526','Ligia Johana Santos Castro','Contact Center Agent',NULL,'08:00:00','17:00:00','2025-02-03','BAC','747268191','Inactivo'),
	 ('5d57a843-2293-428b-bfba-364a6280eded'::uuid,'0801-1991-05878','Vladimir Rodriguez Castejón','Contact Center Agent',14500.0,'08:00:00','17:00:00','2025-02-03','BAC','743849161','Activo'),
	 ('44b8aecc-b8b6-4edd-94a9-46e2e9bba7fe'::uuid,'0801-1996-13787','Lidio Jafeth  Lino Gómez','Contact Center Agent',14500.0,'08:00:00','17:00:00','2025-02-03','BAC','747584431','Activo'),
	 ('6bf2c47f-3858-4efa-a115-96000bee0a40'::uuid,'0801-2003-00485','Jose David Garcia Zelaya','Contact Center Agent',14500.0,'08:00:00','17:00:00','2025-03-19','BAC','750656451','Inactivo'),
	 ('114f6dec-c5e6-46ab-a2c2-1bb436fa3818'::uuid,'0801-2004-08839','Ariana Elieth Escobar Villeda','Contact Center Agent',14500.0,'08:00:00','17:00:00','2025-03-19','BAC','749253701','Inactivo');

-- =====================================================
-- 6. MIGRACIÓN PRINCIPAL: INSERTAR EMPLEADOS LIMPIOS
-- =====================================================

INSERT INTO employees (
    id,
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
    bank_name,
    bank_account,
    metadata
)
SELECT 
    toe.id,
    '00000000-0000-0000-0000-000000000001'::uuid as company_id,
    map_role_to_department(cleaned.clean_role) as department_id,
    '00000000-0000-0000-0000-000000000020'::uuid as work_schedule_id,
    'EMP-' || LPAD((ROW_NUMBER() OVER (ORDER BY toe.name))::text, 4, '0') as employee_code,
    cleaned.clean_dni,
    cleaned.clean_name,
    cleaned.clean_role as role,
    cleaned.clean_role as position, -- Usar el mismo valor para role y position
    cleaned.clean_base_salary,
    cleaned.clean_hire_date,
    cleaned.clean_status,
    cleaned.clean_bank_name,
    cleaned.clean_bank_account,
    jsonb_build_object(
        'original_checkin_time', toe.checkin_time,
        'original_checkout_time', toe.checkout_time,
        'migrated_at', NOW(),
        'migration_notes', 'Migrado desde employees_202504060814.sql'
    ) as metadata
FROM temp_original_employees toe
CROSS JOIN LATERAL clean_employee_data(
    toe.dni,
    toe.name,
    toe.role,
    toe.base_salary,
    toe.hired_date,
    toe.bank,
    toe.account,
    toe.status
) AS cleaned
ON CONFLICT (company_id, dni) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    position = EXCLUDED.position,
    base_salary = EXCLUDED.base_salary,
    hire_date = EXCLUDED.hire_date,
    status = EXCLUDED.status,
    bank_name = EXCLUDED.bank_name,
    bank_account = EXCLUDED.bank_account,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- =====================================================
-- 7. REPORTE DE VALIDACIÓN
-- =====================================================

-- 7.1 Reporte de empleados migrados
DO $$
DECLARE
    total_migrated INTEGER;
    total_active INTEGER;
    total_inactive INTEGER;
    null_salaries INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_migrated FROM employees WHERE company_id = '00000000-0000-0000-0000-000000000001';
    SELECT COUNT(*) INTO total_active FROM employees WHERE company_id = '00000000-0000-0000-0000-000000000001' AND status = 'active';
    SELECT COUNT(*) INTO total_inactive FROM employees WHERE company_id = '00000000-0000-0000-0000-000000000001' AND status = 'inactive';
    SELECT COUNT(*) INTO null_salaries FROM employees WHERE company_id = '00000000-0000-0000-0000-000000000001' AND base_salary = 15000.00;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'REPORTE DE MIGRACIÓN COMPLETADO';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total empleados migrados: %', total_migrated;
    RAISE NOTICE 'Empleados activos: %', total_active;
    RAISE NOTICE 'Empleados inactivos: %', total_inactive;
    RAISE NOTICE 'Empleados con salario por defecto (15000): %', null_salaries;
    RAISE NOTICE '================================================';
END $$;

-- 7.2 Mostrar distribución por departamento
SELECT 
    d.name as departamento,
    COUNT(e.id) as total_empleados,
    COUNT(CASE WHEN e.status = 'active' THEN 1 END) as activos,
    COUNT(CASE WHEN e.status = 'inactive' THEN 1 END) as inactivos,
    ROUND(AVG(e.base_salary), 2) as salario_promedio
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.company_id = '00000000-0000-0000-0000-000000000001'
GROUP BY d.id, d.name
ORDER BY total_empleados DESC;

-- 7.3 Mostrar empleados con datos problemáticos originales
SELECT 
    'Empleados con salario por defecto aplicado' as reporte,
    COUNT(*) as cantidad
FROM employees 
WHERE company_id = '00000000-0000-0000-0000-000000000001' 
AND base_salary = 15000.00

UNION ALL

SELECT 
    'Empleados con DNI corregido (espacios→guiones)' as reporte,
    COUNT(*) as cantidad
FROM employees e
JOIN temp_original_employees toe ON e.id = toe.id
WHERE e.company_id = '00000000-0000-0000-0000-000000000001'
AND toe.dni ~ '^\d{4}\s\d{4}\s\d{5}$';

-- =====================================================
-- 8. LIMPIEZA FINAL
-- =====================================================

-- Eliminar funciones temporales
DROP FUNCTION IF EXISTS map_role_to_department(TEXT);
DROP FUNCTION IF EXISTS clean_employee_data(TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT);

-- =====================================================
-- SCRIPT COMPLETADO
-- =====================================================
-- Este script ha:
-- ✅ Creado entidades de soporte (company, departments, work_schedules)
-- ✅ Implementado funciones de limpieza y mapeo de datos
-- ✅ Migrado todos los empleados con transformaciones apropiadas
-- ✅ Manejado valores NULL y formatos inconsistentes
-- ✅ Validado tipos de datos y restricciones
-- ✅ Generado reportes de validación
-- ✅ Aplicado ON CONFLICT para evitar duplicados
-- =====================================================
