-- Fix RLS policies for proper company isolation
-- Ensures multi-tenant security

-- Drop existing weak policies
DROP POLICY IF EXISTS "Authenticated users can read ihss_rules" ON public.ihss_rules;
DROP POLICY IF EXISTS "Authenticated users can read rap_rules" ON public.rap_rules;
DROP POLICY IF EXISTS "Authenticated users can read isr_brackets" ON public.isr_brackets;

-- Create proper RLS policies for payroll_runs
CREATE POLICY "Users can only access their company payroll runs" ON public.payroll_runs
  FOR ALL TO authenticated
  USING (
    company_uuid IN (
      SELECT company_id FROM public.user_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create proper RLS policies for payroll_run_lines
CREATE POLICY "Users can only access their company payroll lines" ON public.payroll_run_lines
  FOR ALL TO authenticated
  USING (
    company_uuid IN (
      SELECT company_id FROM public.user_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create proper RLS policies for employees
CREATE POLICY "Users can only access their company employees" ON public.employees
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create proper RLS policies for attendance_records
CREATE POLICY "Users can only access their company attendance" ON public.attendance_records
  FOR ALL TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees 
      WHERE company_id IN (
        SELECT company_id FROM public.user_profiles 
        WHERE id = auth.uid() AND is_active = true
      )
    )
  );

-- Create proper RLS policies for departments
CREATE POLICY "Users can only access their company departments" ON public.departments
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create proper RLS policies for companies (read-only for own company)
CREATE POLICY "Users can only read their own company" ON public.companies
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT company_id FROM public.user_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create proper RLS policies for user_profiles
CREATE POLICY "Users can only access their own profile" ON public.user_profiles
  FOR ALL TO authenticated
  USING (id = auth.uid());

-- Re-enable RLS on all tables
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Keep public read access for tax rules (they're public data)
CREATE POLICY "Anyone can read tax rules" ON public.ihss_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read tax rules" ON public.rap_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read tax rules" ON public.isr_brackets FOR SELECT TO authenticated USING (true);

-- Create function to test company isolation
CREATE OR REPLACE FUNCTION test_company_isolation(p_test_user_id UUID, p_target_company_id UUID)
RETURNS TABLE (
  can_access BOOLEAN,
  reason TEXT
) AS $$
BEGIN
  -- Check if user has access to target company
  IF EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = p_test_user_id 
    AND company_id = p_target_company_id 
    AND is_active = true
  ) THEN
    RETURN QUERY SELECT true, 'User has access to company'::TEXT;
  ELSE
    RETURN QUERY SELECT false, 'User does not have access to company'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION test_company_isolation TO authenticated;

-- Add comments
COMMENT ON POLICY "Users can only access their company payroll runs" ON public.payroll_runs 
IS 'Ensures users can only access payroll runs from their own company';
COMMENT ON POLICY "Users can only access their company employees" ON public.employees 
IS 'Ensures users can only access employees from their own company';
COMMENT ON FUNCTION test_company_isolation 
IS 'Test function to verify company isolation is working correctly';
