-- =====================================================
-- SCRIPT PARA ACTUALIZAR EMPLEADOS ACTIVOS
-- =====================================================

-- Primero, desactivar todos los empleados existentes
UPDATE employees 
SET status = 'inactive', updated_at = NOW() 
WHERE company_id = '007'::uuid;

-- Insertar/actualizar empleados activos
INSERT INTO employees (
    company_id,
    name,
    dni,
    base_salary,
    role,
    department_id,
    hire_date,
    status,
    bank_name,
    bank_account,
    email,
    created_at,
    updated_at
) VALUES 
-- Ericka Daniela Martinez
('007'::uuid, 'Ericka Daniela Martinez', '0801-1999-10071', 17750.00, 'Procesador de Datos', 'PROCESSING', '2024-04-01', 'active', 'BANPAIS', '213000317130', 'danu.martinez07@gmail.com', NOW(), NOW()),

-- Evelin Daniela Oseguera Aguilar
('007'::uuid, 'Evelin Daniela Oseguera Aguilar', '0801-2001-04394', 17500.00, 'Actualizacion de Datos', 'DATA ENTRY', '2024-04-01', 'active', 'BANPAIS', '213000317181', 'evelynoseguera2201@gmail.com', NOW(), NOW()),

-- Astrid Mariela Colindres Zelaya
('007'::uuid, 'Astrid Mariela Colindres Zelaya', '0801-1999-10070', 17750.00, 'Procesador de Datos', 'PROCESSING', '2024-04-01', 'active', 'BAC', '746030901', 'maryzelaya1999@gmail.com', NOW(), NOW()),

-- Helen Daniela Matute Zambrano
('007'::uuid, 'Helen Daniela Matute Zambrano', '0801-2000-20638', 17500.00, 'Vericacion de Datos-Español', 'COMPLIANCE', '2024-04-01', 'active', 'BANPAIS', '213000317246', 'matutedaniela2403@gmail.com', NOW(), NOW()),

-- Emely Rachel Romero Cabrera
('007'::uuid, 'Emely Rachel Romero Cabrera', '0801-1999-15616', 17500.00, 'Vericacion de Datos-Español', 'COMPLIANCE', '2024-04-01', 'active', 'BANPAIS', '213000317289', 'emelyromerocabrera24@gmail.com', NOW(), NOW()),

-- Yorleny Paveth Oliva Maldonado
('007'::uuid, 'Yorleny Paveth Oliva Maldonado', '0801-1988-21145', 17500.00, 'Vericacion de Datos-Español', 'COMPLIANCE', '2024-04-01', 'active', 'BANPAIS', '213000317335', NULL, NOW(), NOW()),

-- Isis Amaleth Ardon Maradiaga
('007'::uuid, 'Isis Amaleth Ardon Maradiaga', '0801-2012-22694', 17500.00, 'Vericacion de Datos-Español', 'COMPLIANCE', '2024-04-01', 'active', 'BANPAIS', '213000317386', 'ardonmaradiagaisisamaleth@gmail.com', NOW(), NOW()),

-- David Gonzales Maldonado
('007'::uuid, 'David Gonzales Maldonado', '0510-1997-00186', 18200.00, 'Data Entry', 'DATA ENTRY', '2024-04-01', 'active', 'BANPAIS', '213000317408', 'dgmaldonado.dev@gmail.com', NOW(), NOW()),

-- Luis Francisco Murillo Carcamo
('007'::uuid, 'Luis Francisco Murillo Carcamo', '0801-1988-14537', 17500.00, 'Negociación', 'NEGOTIATION', '2024-02-15', 'active', 'BANPAIS', '213000317203', 'murilofrancisco88@outlook.com', NOW(), NOW()),

-- Jesús Alcides Sagastume Martínez
('007'::uuid, 'Jesús Alcides Sagastume Martínez', '0801-1997-04866', 17500.00, 'Contact Center Agent', 'Customer Service', '2024-04-02', 'active', 'BANPAIS', '213000317270', 'jsagastume@paragonfinancialcorp.com', NOW(), NOW()),

-- Jonny Omar Salinas Rosales
('007'::uuid, 'Jonny Omar Salinas Rosales', '1505-1990-00439', 15500.00, 'Contact Center Agent', 'Customer Service', '2024-11-04', 'active', 'BANPAIS', '213180188733', 'kingkatracho1990@gmail.com', NOW(), NOW()),

-- Francisco Javier Mendez Montenegro
('007'::uuid, 'Francisco Javier Mendez Montenegro', '0615-1986-00142', 21000.00, 'Customer Service Manager', 'Customer Service', '2024-04-01', 'active', 'BANPAIS', '213000317300', 'frankberries07@gmail.com', NOW(), NOW()),

-- Angel David Alvarenga Martinez
('007'::uuid, 'Angel David Alvarenga Martinez', '0801-2001-22056', 17300.00, 'Actualizacion de Datos', 'DATA ENTRY', '2024-04-01', 'active', 'BANPAIS', '213000317122', 'alvarengangel15@gmail.com', NOW(), NOW()),

-- Lourdes Raquel Aguirre
('007'::uuid, 'Lourdes Raquel Aguirre', '0801-1990-21037', 17300.00, 'Actualizacion de Datos', 'DATA ENTRY', '2024-04-01', 'active', 'BANPAIS', '213000317165', 'raguirre489@gmail.com', NOW(), NOW()),

-- Gustavo Noel Argueta Zelaya
('007'::uuid, 'Gustavo Noel Argueta Zelaya', '0801-1985-22949', 42418.92, 'Gerente de Operaciones', 'MANAGER', '2024-04-01', 'active', 'ATLANTIDA', '14720267948', 'gustavo.gnaz@gmail.com', NOW(), NOW()),

-- Kenia Isabel Zambrano Molina
('007'::uuid, 'Kenia Isabel Zambrano Molina', '0801-1998-03487', 19100.00, 'Verificacion de Datos-Ingles', 'Customer Service', '2024-06-11', 'active', 'BANPAIS', '213000317319', 'zkenia993@gmail.com', NOW(), NOW()),

-- Wolfang Andre Sosa Lanza
('007'::uuid, 'Wolfang Andre Sosa Lanza', '0801-1999-20200', 18700.00, 'Verificacion de Datos-Ingles', 'Customer Service', '2024-06-18', 'active', 'BANPAIS', '213000317378', 'wolfangsosa5@gmail.com', NOW(), NOW()),

-- Jorge Arturo Gómez Coello
('007'::uuid, 'Jorge Arturo Gómez Coello', '0510-1991-00731', 35000.00, 'Jefe de Personal', 'HR', '2024-07-01', 'active', 'BANPAIS', '213000317424', 'jorge7gomez@gmail.com', NOW(), NOW()),

-- Jorge Luis Rodriguez Macedo
('007'::uuid, 'Jorge Luis Rodriguez Macedo', '0806-1998-00200', 17750.00, 'Verificacion de Datos-Ingles', 'COMPLIANCE', '2024-07-16', 'active', 'BANPAIS', '213000317467', '12rodruguez@gmail.com', NOW(), NOW()),

-- Claudette Desiree Rollings Martinez
('007'::uuid, 'Claudette Desiree Rollings Martinez', '0101-1983-02150', 17500.00, 'Negociación', 'NEGOTIATION', '2024-07-29', 'active', 'BANPAIS', '213000317572', 'claudetterollins@hotmail.com', NOW(), NOW()),

-- Roberto Carlos Meraz Canales
('007'::uuid, 'Roberto Carlos Meraz Canales', '0801-2002-10616', 17250.00, 'Contact Center Agent', 'COMPLIANCE', '2024-10-11', 'active', 'BANPAIS', '213050138221', 'charliemeraz.rcmc@gmail.com', NOW(), NOW()),

-- Marcelo Alejandro Folgar Bonilla
('007'::uuid, 'Marcelo Alejandro Folgar Bonilla', '0801-1996-15245', 15500.00, 'Contact Center Agent', 'Customer Service', '2024-12-16', 'active', 'BANPAIS', '213050138078', 'alejandrosbonillas@gmail.com', NOW(), NOW()),

-- André Alexander García Laínez
('007'::uuid, 'André Alexander García Laínez', '0801-1997-23863', 15500.00, 'Contact Center Agent', 'Customer Service', '2025-01-02', 'active', 'BANPAIS', '213210052982', 'andregarcia27_@outlook.com', NOW(), NOW()),

-- David Alejandro Santos Ordoñez
('007'::uuid, 'David Alejandro Santos Ordoñez', '0801-2005-09404', 15500.00, 'Contact Center Agent', 'Customer Service', '2025-01-06', 'active', 'BANPAIS', '213050138302', 'dsantosordonez007@gmail.com', NOW(), NOW()),

-- Amsi Abigail Urquía Durón
('007'::uuid, 'Amsi Abigail Urquía Durón', '0801-2006-13174', 15500.00, 'Contact Center Agent', 'DATA ENTRY', '2025-01-09', 'active', 'BANPAIS', '213210061698', 'urquiaabi@gmail.com', NOW(), NOW()),

-- Fabiola Yadira Castillo Moncada
('007'::uuid, 'Fabiola Yadira Castillo Moncada', '0801-1996-12309', 15500.00, 'Contact Center Agent', 'COMPLIANCE', '2025-01-27', 'active', 'BANPAIS', '213050139295', 'fabiolacastillo1995@yahoo.com', NOW(), NOW()),

-- Vladimir Rodriguez Castejón
('007'::uuid, 'Vladimir Rodriguez Castejón', '0801-1991-05878', 15500.00, 'Contact Center Agent', 'NEGOTIATION', '2025-02-03', 'active', 'BANPAIS', '214090002019', 'vladicastejon21@gmail.com', NOW(), NOW()),

-- Alejandro José Salgado Girón
('007'::uuid, 'Alejandro José Salgado Girón', '0801-2004-10716', 14500.00, 'Contact Center Agent', 'Customer Service', '2025-05-28', 'active', 'BANPAIS', '213180197481', NULL, NOW(), NOW()),

-- Daniel Vladimir Hernadez Salgado
('007'::uuid, 'Daniel Vladimir Hernadez Salgado', '0801-2000-15164', 14500.00, 'Contact Center Agent', 'INSURANCE', '2025-07-01', 'active', 'ATLANTIDA', '2010028825', NULL, NOW(), NOW()),

-- Enrique Alejandro Casco Murillo
('007'::uuid, 'Enrique Alejandro Casco Murillo', '0801-1987-02088', 14500.00, 'Contact Center Agent', 'INSURANCE', '2025-07-01', 'active', 'BANCO CUSCATLAN', '211060070069', NULL, NOW(), NOW()),

-- Gerardo Leonel Fernandez Martinez
('007'::uuid, 'Gerardo Leonel Fernandez Martinez', '0801-1982-09157', 14500.00, 'Contact Center Agent', 'INSURANCE', '2025-07-01', 'active', 'FICOHSA', '8148627', NULL, NOW(), NOW()),

-- Seth Isaí Godoy Cantarero
('007'::uuid, 'Seth Isaí Godoy Cantarero', '0801-2003-14588', 14500.00, 'Contact Center Agent', 'INSURANCE', '2025-07-01', 'active', 'BAC', '748162521', NULL, NOW(), NOW()),

-- Raúl Eduardo Espinoza Núñez
('007'::uuid, 'Raúl Eduardo Espinoza Núñez', '0801-2003-17862', 14500.00, 'Contact Center Agent', 'INSURANCE', '2025-07-21', 'active', 'BAC', '755925271', NULL, NOW(), NOW()),

-- Gerson Enoc Zuniga Chang
('007'::uuid, 'Gerson Enoc Zuniga Chang', '0801-2001-07986', 14500.00, 'Contact Center Agent', 'INSURANCE', '2025-07-30', 'active', 'BAC', '751109431', NULL, NOW(), NOW())

ON CONFLICT (dni) 
DO UPDATE SET
    name = EXCLUDED.name,
    base_salary = EXCLUDED.base_salary,
    role = EXCLUDED.role,
    department_id = EXCLUDED.department_id,
    hire_date = EXCLUDED.hire_date,
    status = EXCLUDED.status,
    bank_name = EXCLUDED.bank_name,
    bank_account = EXCLUDED.bank_account,
    email = EXCLUDED.email,
    updated_at = NOW();

-- Verificar resultados
SELECT 
    COUNT(*) as total_empleados,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as empleados_activos,
    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as empleados_inactivos
FROM employees 
WHERE company_id = '007'::uuid; 