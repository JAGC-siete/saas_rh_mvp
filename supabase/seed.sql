-- Sample data for HR SaaS testing
-- Run this after your migrations are applied

-- Insert sample company
INSERT INTO companies (id, name, subdomain, plan_type) VALUES 
('00000000-0000-0000-0000-000000000001', 'Acme Corporation', 'acme', 'premium'),
('00000000-0000-0000-0000-000000000002', 'Tech Solutions Ltd', 'techsolutions', 'basic');

-- Insert departments
INSERT INTO departments (id, company_id, name, description) VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Human Resources', 'HR Department'),
('11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000001', 'Engineering', 'Software Development'),
('11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000001', 'Sales', 'Sales and Marketing'),
('11111111-1111-1111-1111-111111111114', '00000000-0000-0000-0000-000000000002', 'Operations', 'Daily Operations');

-- Insert work schedules
INSERT INTO work_schedules (id, company_id, name, monday_start, monday_end, tuesday_start, tuesday_end, wednesday_start, wednesday_end, thursday_start, thursday_end, friday_start, friday_end) VALUES 
('22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000001', 'Standard 8-5', '08:00', '17:00', '08:00', '17:00', '08:00', '17:00', '08:00', '17:00', '08:00', '17:00'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Flexible 9-6', '09:00', '18:00', '09:00', '18:00', '09:00', '18:00', '09:00', '18:00', '09:00', '16:00'),
('22222222-2222-2222-2222-222222222223', '00000000-0000-0000-0000-000000000002', 'Early Bird', '07:00', '16:00', '07:00', '16:00', '07:00', '16:00', '07:00', '16:00', '07:00', '15:00');

-- Insert sample employees
INSERT INTO employees (id, company_id, department_id, work_schedule_id, employee_code, dni, name, email, phone, role, position, base_salary, hire_date, status, bank_name, bank_account) VALUES 
('33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'EMP001', '0801-1990-12345', 'María González', 'maria.gonzalez@acme.com', '+504 9999-9999', 'admin', 'HR Manager', 35000.00, '2023-01-15', 'active', 'Banco Atlántida', '12345678901'),
('33333333-3333-3333-3333-333333333332', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222221', 'EMP002', '0801-1985-67890', 'Carlos Rodríguez', 'carlos.rodriguez@acme.com', '+504 8888-8888', 'employee', 'Senior Developer', 45000.00, '2023-02-01', 'active', 'BAC Honduras', '98765432109'),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111112', '22222222-2222-2222-2222-222222222222', 'EMP003', '0801-1992-11111', 'Ana Martínez', 'ana.martinez@acme.com', '+504 7777-7777', 'employee', 'Frontend Developer', 30000.00, '2023-03-10', 'active', 'Banco de Occidente', '11111111111'),
('33333333-3333-3333-3333-333333333334', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111113', '22222222-2222-2222-2222-222222222221', 'EMP004', '0801-1988-22222', 'Pedro López', 'pedro.lopez@acme.com', '+504 6666-6666', 'employee', 'Sales Representative', 25000.00, '2023-04-20', 'active', 'Banco Ficohsa', '22222222222'),
('33333333-3333-3333-3333-333333333335', '00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111114', '22222222-2222-2222-2222-222222222223', 'EMP005', '0801-1990-33333', 'Laura Hernández', 'laura.hernandez@techsolutions.com', '+504 5555-5555', 'manager', 'Operations Manager', 40000.00, '2023-01-01', 'active', 'Banco Popular', '33333333333');

-- Update department managers
UPDATE departments SET manager_id = '33333333-3333-3333-3333-333333333331' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE departments SET manager_id = '33333333-3333-3333-3333-333333333332' WHERE id = '11111111-1111-1111-1111-111111111112';
UPDATE departments SET manager_id = '33333333-3333-3333-3333-333333333334' WHERE id = '11111111-1111-1111-1111-111111111113';
UPDATE departments SET manager_id = '33333333-3333-3333-3333-333333333335' WHERE id = '11111111-1111-1111-1111-111111111114';

-- Insert leave types
INSERT INTO leave_types (id, company_id, name, max_days_per_year, is_paid, requires_approval) VALUES 
('44444444-4444-4444-4444-444444444441', '00000000-0000-0000-0000-000000000001', 'Vacation', 15, true, true),
('44444444-4444-4444-4444-444444444442', '00000000-0000-0000-0000-000000000001', 'Sick Leave', 10, true, false),
('44444444-4444-4444-4444-444444444443', '00000000-0000-0000-0000-000000000001', 'Personal Day', 5, true, true),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'Maternity/Paternity', 90, true, false),
('44444444-4444-4444-4444-444444444445', '00000000-0000-0000-0000-000000000002', 'Vacation', 12, true, true),
('44444444-4444-4444-4444-444444444446', '00000000-0000-0000-0000-000000000002', 'Sick Leave', 8, true, false);

-- Insert sample attendance records (for the last week)
INSERT INTO attendance_records (employee_id, date, check_in, check_out, expected_check_in, expected_check_out, late_minutes, status) VALUES 
('33333333-3333-3333-3333-333333333331', '2025-07-21', '2025-07-21 08:00:00+00', '2025-07-21 17:00:00+00', '08:00', '17:00', 0, 'present'),
('33333333-3333-3333-3333-333333333331', '2025-07-22', '2025-07-22 08:15:00+00', '2025-07-22 17:05:00+00', '08:00', '17:00', 15, 'late'),
('33333333-3333-3333-3333-333333333332', '2025-07-21', '2025-07-21 08:00:00+00', '2025-07-21 17:30:00+00', '08:00', '17:00', 0, 'present'),
('33333333-3333-3333-3333-333333333332', '2025-07-22', '2025-07-22 07:55:00+00', '2025-07-22 17:00:00+00', '08:00', '17:00', 0, 'present'),
('33333333-3333-3333-3333-333333333333', '2025-07-21', '2025-07-21 09:00:00+00', '2025-07-21 18:00:00+00', '09:00', '18:00', 0, 'present'),
('33333333-3333-3333-3333-333333333333', '2025-07-22', '2025-07-22 09:10:00+00', '2025-07-22 18:00:00+00', '09:00', '18:00', 10, 'late');

-- Insert sample leave requests
INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days_requested, reason, status, approved_by) VALUES 
('33333333-3333-3333-3333-333333333332', '44444444-4444-4444-4444-444444444441', '2025-08-01', '2025-08-05', 5, 'Family vacation', 'approved', '33333333-3333-3333-3333-333333333331'),
('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444443', '2025-07-25', '2025-07-25', 1, 'Medical appointment', 'pending', null),
('33333333-3333-3333-3333-333333333334', '44444444-4444-4444-4444-444444444442', '2025-07-23', '2025-07-24', 2, 'Flu symptoms', 'approved', '33333333-3333-3333-3333-333333333331');

-- Insert sample payroll records
INSERT INTO payroll_records (employee_id, period_start, period_end, base_salary, gross_salary, income_tax, professional_tax, social_security, total_deductions, net_salary, days_worked, days_absent, late_days, status) VALUES 
('33333333-3333-3333-3333-333333333331', '2025-06-01', '2025-06-30', 35000.00, 35000.00, 1750.00, 525.00, 1225.00, 3500.00, 31500.00, 22, 0, 2, 'paid'),
('33333333-3333-3333-3333-333333333332', '2025-06-01', '2025-06-30', 45000.00, 45000.00, 3200.00, 675.00, 1575.00, 5450.00, 39550.00, 22, 0, 0, 'paid'),
('33333333-3333-3333-3333-333333333333', '2025-06-01', '2025-06-30', 30000.00, 30000.00, 1200.00, 450.00, 1050.00, 2700.00, 27300.00, 21, 1, 1, 'paid'),
('33333333-3333-3333-3333-333333333334', '2025-06-01', '2025-06-30', 25000.00, 25000.00, 800.00, 375.00, 875.00, 2050.00, 22950.00, 20, 2, 3, 'paid');

-- Note: You'll need to create auth users and user_profiles separately through Supabase Auth UI or API
-- This is because auth.users is managed by Supabase Auth service

COMMENT ON TABLE companies IS 'Multi-tenant companies using the HR system';
COMMENT ON TABLE employees IS 'Employee records with enhanced HR features';
COMMENT ON TABLE attendance_records IS 'Daily attendance tracking with justifications';
COMMENT ON TABLE payroll_records IS 'Payroll records with Honduras tax calculations';
COMMENT ON TABLE leave_requests IS 'Employee leave requests and approvals';
COMMENT ON TABLE user_profiles IS 'User profiles linked to Supabase Auth users';
