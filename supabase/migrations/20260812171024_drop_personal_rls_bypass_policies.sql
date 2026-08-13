-- Remove redundant personal UID bypass policies.
-- Precondition: that user already has user_profiles.role = 'super_admin'
-- and these tables already have super_admin / admin policies.

DROP POLICY IF EXISTS companies_jorge_access ON public.companies;
DROP POLICY IF EXISTS departments_jorge_access ON public.departments;
DROP POLICY IF EXISTS employees_jorge_access ON public.employees;
DROP POLICY IF EXISTS payroll_jorge_access ON public.payroll_records;
