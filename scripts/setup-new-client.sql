-- CONFIGURACIÓN RÁPIDA DE CLIENTE NUEVO
-- Reemplazar los valores según el cliente específico

-- PASO 1: Crear Company
INSERT INTO companies (id, name, address, phone, email, created_at, updated_at)
VALUES (
  'CLIENT-UUID-HERE', -- Cambiar por UUID único del cliente
  'NOMBRE_EMPRESA',   -- Cambiar por nombre real
  'DIRECCION_EMPRESA',
  'TELEFONO_EMPRESA',
  'EMAIL_EMPRESA',
  NOW(),
  NOW()
);

-- PASO 2: Crear Departamentos
INSERT INTO departments (name, description, company_id, created_at, updated_at)
VALUES 
  ('Recursos Humanos', 'Gestión de personal', 'CLIENT-UUID-HERE', NOW(), NOW()),
  ('Ventas', 'Equipo comercial', 'CLIENT-UUID-HERE', NOW(), NOW()),
  ('Contabilidad', 'Área financiera', 'CLIENT-UUID-HERE', NOW(), NOW()),
  ('IT', 'Tecnología', 'CLIENT-UUID-HERE', NOW(), NOW()),
  ('Operaciones', 'Producción y logística', 'CLIENT-UUID-HERE', NOW(), NOW());

-- PASO 3: Crear Horarios
INSERT INTO work_schedules (id, name, company_id, 
  monday_start, monday_end, tuesday_start, tuesday_end,
  wednesday_start, wednesday_end, thursday_start, thursday_end,
  friday_start, friday_end, saturday_start, saturday_end,
  created_at, updated_at)
VALUES 
  -- Horario Administrativo (8AM-5PM)
  ('SCHED1-UUID-HERE', 'Administrativo 8AM-5PM', 'CLIENT-UUID-HERE',
   '08:00:00', '17:00:00', '08:00:00', '17:00:00', 
   '08:00:00', '17:00:00', '08:00:00', '17:00:00',
   '08:00:00', '17:00:00', null, null, NOW(), NOW()),
  
  -- Horario Ventas (9AM-6PM + Sábados)
  ('SCHED2-UUID-HERE', 'Ventas 9AM-6PM', 'CLIENT-UUID-HERE',
   '09:00:00', '18:00:00', '09:00:00', '18:00:00',
   '09:00:00', '18:00:00', '09:00:00', '18:00:00',
   '09:00:00', '18:00:00', '09:00:00', '13:00:00', NOW(), NOW()),
  
  -- Horario Producción (6AM-3PM)
  ('SCHED3-UUID-HERE', 'Producción 6AM-3PM', 'CLIENT-UUID-HERE',
   '06:00:00', '15:00:00', '06:00:00', '15:00:00',
   '06:00:00', '15:00:00', '06:00:00', '15:00:00',
   '06:00:00', '15:00:00', '06:00:00', '12:00:00', NOW(), NOW());

-- PASO 4: Crear Empleados (Ejemplo de 10 empleados)
INSERT INTO employees (
  id, company_id, department_id, work_schedule_id, employee_code, 
  name, email, phone, dni, position, base_salary, hire_date, 
  status, created_at, updated_at
)
VALUES 
  -- Gerencia/RRHH
  (gen_random_uuid(), 'CLIENT-UUID-HERE', 
   (SELECT id FROM departments WHERE name = 'Recursos Humanos' AND company_id = 'CLIENT-UUID-HERE' LIMIT 1),
   'SCHED1-UUID-HERE', 'EMP001', 
   'María José García', 'maria.garcia@empresa.com', '+504 9988-7766', '0801199012345', 
   'Gerente de RRHH', 45000.00, '2024-01-15', 'active', NOW(), NOW()),
  
  -- Ventas
  (gen_random_uuid(), 'CLIENT-UUID-HERE',
   (SELECT id FROM departments WHERE name = 'Ventas' AND company_id = 'CLIENT-UUID-HERE' LIMIT 1),
   'SCHED2-UUID-HERE', 'EMP002',
   'Carlos Alberto Mendoza', 'carlos.mendoza@empresa.com', '+504 9977-8855', '0801198812346',
   'Ejecutivo de Ventas', 25000.00, '2024-02-01', 'active', NOW(), NOW()),
   
  (gen_random_uuid(), 'CLIENT-UUID-HERE',
   (SELECT id FROM departments WHERE name = 'Ventas' AND company_id = 'CLIENT-UUID-HERE' LIMIT 1),
   'SCHED2-UUID-HERE', 'EMP003',
   'Ana Lucía Rodríguez', 'ana.rodriguez@empresa.com', '+504 9966-7744', '0801199112347',
   'Coordinadora de Ventas', 30000.00, '2024-01-20', 'active', NOW(), NOW()),
  
  -- Contabilidad
  (gen_random_uuid(), 'CLIENT-UUID-HERE',
   (SELECT id FROM departments WHERE name = 'Contabilidad' AND company_id = 'CLIENT-UUID-HERE' LIMIT 1),
   'SCHED1-UUID-HERE', 'EMP004',
   'Roberto Suárez López', 'roberto.suarez@empresa.com', '+504 9955-6633', '0801197812348',
   'Contador General', 35000.00, '2024-01-10', 'active', NOW(), NOW()),
   
  (gen_random_uuid(), 'CLIENT-UUID-HERE',
   (SELECT id FROM departments WHERE name = 'Contabilidad' AND company_id = 'CLIENT-UUID-HERE' LIMIT 1),
   'SCHED1-UUID-HERE', 'EMP005',
   'Patricia Morales', 'patricia.morales@empresa.com', '+504 9944-5522', '0801199212349',
   'Asistente Contable', 20000.00, '2024-03-01', 'active', NOW(), NOW()),
  
  -- IT
  (gen_random_uuid(), 'CLIENT-UUID-HERE',
   (SELECT id FROM departments WHERE name = 'IT' AND company_id = 'CLIENT-UUID-HERE' LIMIT 1),
   'SCHED1-UUID-HERE', 'EMP006',
   'Jorge Luis Hernández', 'jorge.hernandez@empresa.com', '+504 9933-4411', '0801199312350',
   'Desarrollador Senior', 40000.00, '2024-01-08', 'active', NOW(), NOW()),
  
  -- Operaciones
  (gen_random_uuid(), 'CLIENT-UUID-HERE',
   (SELECT id FROM departments WHERE name = 'Operaciones' AND company_id = 'CLIENT-UUID-HERE' LIMIT 1),
   'SCHED3-UUID-HERE', 'EMP007',
   'Sandra Elizabeth Cruz', 'sandra.cruz@empresa.com', '+504 9922-3300', '0801198612351',
   'Supervisor de Producción', 28000.00, '2024-02-15', 'active', NOW(), NOW()),
   
  (gen_random_uuid(), 'CLIENT-UUID-HERE',
   (SELECT id FROM departments WHERE name = 'Operaciones' AND company_id = 'CLIENT-UUID-HERE' LIMIT 1),
   'SCHED3-UUID-HERE', 'EMP008',
   'Miguel Ángel Flores', 'miguel.flores@empresa.com', '+504 9911-2299', '0801197712352',
   'Operario Especializado', 18000.00, '2024-03-10', 'active', NOW(), NOW()),
   
  (gen_random_uuid(), 'CLIENT-UUID-HERE',
   (SELECT id FROM departments WHERE name = 'Operaciones' AND company_id = 'CLIENT-UUID-HERE' LIMIT 1),
   'SCHED3-UUID-HERE', 'EMP009',
   'Carmen Rosa Díaz', 'carmen.diaz@empresa.com', '+504 9900-1188', '0801199412353',
   'Operario General', 15000.00, '2024-04-01', 'active', NOW(), NOW()),
   
  (gen_random_uuid(), 'CLIENT-UUID-HERE',
   (SELECT id FROM departments WHERE name = 'Operaciones' AND company_id = 'CLIENT-UUID-HERE' LIMIT 1),
   'SCHED3-UUID-HERE', 'EMP010',
   'Fernando José Martínez', 'fernando.martinez@empresa.com', '+504 9899-0077', '0801198812354',
   'Auxiliar de Producción', 14000.00, '2024-04-15', 'active', NOW(), NOW());

-- PASO 5: Verificar que todo se creó correctamente
SELECT 
  c.name as empresa,
  d.name as departamento,
  ws.name as horario,
  e.employee_code,
  e.name as empleado,
  e.position as cargo
FROM employees e
JOIN companies c ON e.company_id = c.id
JOIN departments d ON e.department_id = d.id
JOIN work_schedules ws ON e.work_schedule_id = ws.id
WHERE c.id = 'CLIENT-UUID-HERE'
ORDER BY d.name, e.employee_code;
