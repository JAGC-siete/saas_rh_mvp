-- Create initial users for testing
-- This creates users in Supabase Auth and links them to your HR system

-- Insert test users into auth.users (Supabase Auth)
-- Note: In production, users would sign up through your app
-- For development, we create them directly

-- Create user profiles that link to sample employees
-- The auth.users records need to be created through Supabase Studio or your app's signup

-- Create user profiles for existing employees (assumes auth users exist)
-- User: admin@acme.com / Password: admin123 (to be created in Supabase Studio)
INSERT INTO user_profiles (id, company_id, employee_id, role, permissions) VALUES 
-- You'll need to replace these UUIDs with actual auth.users IDs once created
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333331', 'company_admin', '{"can_manage_employees": true, "can_view_payroll": true, "can_manage_attendance": true}');

-- HR Manager: maria.gonzalez@acme.com / Password: maria123
INSERT INTO user_profiles (id, company_id, employee_id, role, permissions) VALUES 
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333331', 'hr_manager', '{"can_manage_employees": true, "can_view_payroll": true, "can_manage_attendance": true}');

-- Regular Employee: carlos.rodriguez@acme.com / Password: carlos123  
INSERT INTO user_profiles (id, company_id, employee_id, role, permissions) VALUES 
('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333332', 'employee', '{"can_view_own_data": true}');

-- Department Manager: pedro.lopez@acme.com / Password: pedro123
INSERT INTO user_profiles (id, company_id, employee_id, role, permissions) VALUES 
('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333334', 'manager', '{"can_manage_department": true, "can_approve_leave": true}');
