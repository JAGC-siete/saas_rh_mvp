-- Fix Critical: rls_disabled_in_public
-- Tables in public were reachable via PostgREST without RLS.

-- ---------------------------------------------------------------------------
-- employee_aliases: company-scoped via employees.company_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.employee_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_aliases_select_company ON public.employee_aliases;
DROP POLICY IF EXISTS employee_aliases_insert_company ON public.employee_aliases;
DROP POLICY IF EXISTS employee_aliases_update_company ON public.employee_aliases;
DROP POLICY IF EXISTS employee_aliases_delete_company ON public.employee_aliases;
DROP POLICY IF EXISTS employee_aliases_super_admin ON public.employee_aliases;

CREATE POLICY employee_aliases_select_company
  ON public.employee_aliases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_aliases.employee_id
        AND e.company_id = public.get_user_company()
    )
  );

CREATE POLICY employee_aliases_insert_company
  ON public.employee_aliases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_aliases.employee_id
        AND e.company_id = public.get_user_company()
    )
  );

CREATE POLICY employee_aliases_update_company
  ON public.employee_aliases
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_aliases.employee_id
        AND e.company_id = public.get_user_company()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_aliases.employee_id
        AND e.company_id = public.get_user_company()
    )
  );

CREATE POLICY employee_aliases_delete_company
  ON public.employee_aliases
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_aliases.employee_id
        AND e.company_id = public.get_user_company()
    )
  );

CREATE POLICY employee_aliases_super_admin
  ON public.employee_aliases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

REVOKE ALL ON TABLE public.employee_aliases FROM anon;

-- ---------------------------------------------------------------------------
-- company_schedule_rules: company-scoped via work_schedules.company_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.company_schedule_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_schedule_rules_select_company ON public.company_schedule_rules;
DROP POLICY IF EXISTS company_schedule_rules_insert_company ON public.company_schedule_rules;
DROP POLICY IF EXISTS company_schedule_rules_update_company ON public.company_schedule_rules;
DROP POLICY IF EXISTS company_schedule_rules_delete_company ON public.company_schedule_rules;
DROP POLICY IF EXISTS company_schedule_rules_super_admin ON public.company_schedule_rules;

CREATE POLICY company_schedule_rules_select_company
  ON public.company_schedule_rules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.work_schedules ws
      WHERE ws.id = company_schedule_rules.schedule_id
        AND ws.company_id = public.get_user_company()
    )
  );

CREATE POLICY company_schedule_rules_insert_company
  ON public.company_schedule_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.work_schedules ws
      WHERE ws.id = company_schedule_rules.schedule_id
        AND ws.company_id = public.get_user_company()
    )
  );

CREATE POLICY company_schedule_rules_update_company
  ON public.company_schedule_rules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.work_schedules ws
      WHERE ws.id = company_schedule_rules.schedule_id
        AND ws.company_id = public.get_user_company()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.work_schedules ws
      WHERE ws.id = company_schedule_rules.schedule_id
        AND ws.company_id = public.get_user_company()
    )
  );

CREATE POLICY company_schedule_rules_delete_company
  ON public.company_schedule_rules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.work_schedules ws
      WHERE ws.id = company_schedule_rules.schedule_id
        AND ws.company_id = public.get_user_company()
    )
  );

CREATE POLICY company_schedule_rules_super_admin
  ON public.company_schedule_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

REVOKE ALL ON TABLE public.company_schedule_rules FROM anon;

-- ---------------------------------------------------------------------------
-- Disposable backup/staging (empty, marked to_delete): RLS on, no API grants
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles_permissions_backup_to_delete_20260411 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stg_employees_departments_to_delete_20260411 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_profiles_permissions_backup_to_delete_20260411 FROM anon;
REVOKE ALL ON TABLE public.user_profiles_permissions_backup_to_delete_20260411 FROM authenticated;
REVOKE ALL ON TABLE public.stg_employees_departments_to_delete_20260411 FROM anon;
REVOKE ALL ON TABLE public.stg_employees_departments_to_delete_20260411 FROM authenticated;
