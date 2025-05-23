-- Sample data for staging environment
INSERT INTO employees (id, name, role, departament, base_salary, checkin_time, checkout_time, fecha_ingreso, banco, cuenta)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Juan Pérez', 'Developer', 'Engineering', 2500.00, '08:00:00', '17:00:00', '2023-01-15', 'Banco Nacional', '1234-5678'),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Maria García', 'Designer', 'Design', 2300.00, '09:00:00', '18:00:00', '2023-02-01', 'Banco Popular', '8765-4321');

INSERT INTO attendance (id_empleado, date, check_in, check_out, justificacion)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', CURRENT_DATE, '08:05:00', '17:02:00', NULL),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', CURRENT_DATE, '09:01:00', '18:00:00', NULL);

INSERT INTO payroll (id_empleado, periodo, salario_bruto, deducciones, salario_neto)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2024-01-Q1', 1250.00, 187.50, 1062.50),
    ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', '2024-01-Q1', 1150.00, 172.50, 977.50);
