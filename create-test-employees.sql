-- Script para crear empleados de prueba para el primer día del SaaS
-- Ejecutar en Supabase SQL Editor

-- Primero, asegurarnos de que existe una empresa
INSERT INTO companies (id, name, subdomain, plan_type, is_active, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Empresa Demo',
  'demo',
  'premium',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Crear departamentos
INSERT INTO departments (id, company_id, name, description, created_at, updated_at)
VALUES 
  ('dept-001', '550e8400-e29b-41d4-a716-446655440000', 'HR', 'Recursos Humanos', NOW(), NOW()),
  ('dept-002', '550e8400-e29b-41d4-a716-446655440000', 'Customer Service', 'Atención al Cliente', NOW(), NOW()),
  ('dept-003', '550e8400-e29b-41d4-a716-446655440000', 'Warehouse', 'Almacén', NOW(), NOW()),
  ('dept-004', '550e8400-e29b-41d4-a716-446655440000', 'Manager', 'Gerencia', NOW(), NOW()),
  ('dept-005', '550e8400-e29b-41d4-a716-446655440000', 'IT', 'Tecnología', NOW(), NOW()),
  ('dept-006', '550e8400-e29b-41d4-a716-446655440000', 'Marketing', 'Mercadeo', NOW(), NOW()),
  ('dept-007', '550e8400-e29b-41d4-a716-446655440000', 'Finance', 'Finanzas', NOW(), NOW()),
  ('dept-008', '550e8400-e29b-41d4-a716-446655440000', 'Sales', 'Ventas', NOW(), NOW()),
  ('dept-009', '550e8400-e29b-41d4-a716-446655440000', 'Operations', 'Operaciones', NOW(), NOW()),
  ('dept-010', '550e8400-e29b-41d4-a716-446655440000', 'Legal', 'Legal', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Crear horarios de trabajo por defecto
INSERT INTO work_schedules (id, company_id, name, monday_start, monday_end, tuesday_start, tuesday_end, wednesday_start, wednesday_end, thursday_start, thursday_end, friday_start, friday_end, saturday_start, saturday_end, sunday_start, sunday_end, created_at, updated_at)
VALUES 
  ('schedule-001', '550e8400-e29b-41d4-a716-446655440000', 'Horario Estándar', '08:00', '17:00', '08:00', '17:00', '08:00', '17:00', '08:00', '17:00', '08:00', '17:00', '00:00', '00:00', '00:00', '00:00', NOW(), NOW()),
  ('schedule-002', '550e8400-e29b-41d4-a716-446655440000', 'Horario Warehouse', '07:00', '16:00', '07:00', '16:00', '07:00', '16:00', '07:00', '16:00', '07:00', '16:00', '00:00', '00:00', '00:00', '00:00', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Crear empleados de prueba con los DNIs específicos
INSERT INTO employees (id, company_id, department_id, work_schedule_id, employee_code, dni, name, email, phone, role, position, base_salary, hire_date, status, created_at, updated_at)
VALUES 
  -- Empleados con DNIs de prueba para mañana
  ('emp-001', '550e8400-e29b-41d4-a716-446655440000', 'dept-001', 'schedule-001', 'EMP001', '123456789012345', 'María González', 'maria.gonzalez@empresa.com', '+504 9999-0001', 'employee', 'Especialista HR', 25000, '2024-01-15', 'active', NOW(), NOW()),
  ('emp-002', '550e8400-e29b-41d4-a716-446655440000', 'dept-002', 'schedule-001', 'EMP002', '234567890123456', 'Carlos Rodríguez', 'carlos.rodriguez@empresa.com', '+504 9999-0002', 'employee', 'Representante CS', 22000, '2024-02-01', 'active', NOW(), NOW()),
  ('emp-003', '550e8400-e29b-41d4-a716-446655440000', 'dept-003', 'schedule-002', 'EMP003', '345678901234567', 'Ana Martínez', 'ana.martinez@empresa.com', '+504 9999-0003', 'employee', 'Operador Almacén', 20000, '2024-01-20', 'active', NOW(), NOW()),
  ('emp-004', '550e8400-e29b-41d4-a716-446655440000', 'dept-004', 'schedule-001', 'EMP004', '456789012345678', 'Luis Hernández', 'luis.hernandez@empresa.com', '+504 9999-0004', 'manager', 'Gerente General', 35000, '2024-01-10', 'active', NOW(), NOW()),
  ('emp-005', '550e8400-e29b-41d4-a716-446655440000', 'dept-005', 'schedule-001', 'EMP005', '567890123456789', 'Sofia López', 'sofia.lopez@empresa.com', '+504 9999-0005', 'employee', 'Desarrollador', 30000, '2024-02-15', 'active', NOW(), NOW()),
  ('emp-006', '550e8400-e29b-41d4-a716-446655440000', 'dept-006', 'schedule-001', 'EMP006', '678901234567890', 'Roberto Jiménez', 'roberto.jimenez@empresa.com', '+504 9999-0006', 'employee', 'Especialista Marketing', 28000, '2024-01-25', 'active', NOW(), NOW()),
  ('emp-007', '550e8400-e29b-41d4-a716-446655440000', 'dept-007', 'schedule-001', 'EMP007', '789012345678901', 'Carmen Vega', 'carmen.vega@empresa.com', '+504 9999-0007', 'employee', 'Contador', 26000, '2024-02-10', 'active', NOW(), NOW()),
  ('emp-008', '550e8400-e29b-41d4-a716-446655440000', 'dept-008', 'schedule-001', 'EMP008', '890123456789012', 'Diego Morales', 'diego.morales@empresa.com', '+504 9999-0008', 'employee', 'Vendedor', 24000, '2024-01-30', 'active', NOW(), NOW()),
  ('emp-009', '550e8400-e29b-41d4-a716-446655440000', 'dept-009', 'schedule-001', 'EMP009', '901234567890123', 'Patricia Castro', 'patricia.castro@empresa.com', '+504 9999-0009', 'employee', 'Coordinador Operaciones', 27000, '2024-02-05', 'active', NOW(), NOW()),
  ('emp-010', '550e8400-e29b-41d4-a716-446655440000', 'dept-010', 'schedule-001', 'EMP010', '012345678901234', 'Fernando Ruiz', 'fernando.ruiz@empresa.com', '+504 9999-0010', 'employee', 'Asesor Legal', 32000, '2024-01-18', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Verificar que se crearon correctamente
SELECT 
  e.name,
  e.dni,
  RIGHT(e.dni, 5) as last5_digits,
  d.name as department,
  e.employee_code
FROM employees e
JOIN departments d ON e.department_id = d.id
WHERE e.company_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY e.employee_code; 