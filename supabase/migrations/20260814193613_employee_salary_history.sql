-- Append-only salary history. employees.base_salary remains the current monthly amount.
-- Writes go through the employees API (service role). RLS isolates by company.
-- Salary ACL functions (app_private.user_can_view_salary) are not assumed present.

CREATE TABLE public.employee_salary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  old_amount numeric(10,2),
  new_amount numeric(10,2) NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_salary_history_new_amount_positive CHECK (new_amount > 0),
  CONSTRAINT employee_salary_history_old_amount_nonneg CHECK (old_amount IS NULL OR old_amount >= 0)
);

CREATE INDEX employee_salary_history_employee_created_idx
  ON public.employee_salary_history (employee_id, created_at DESC);

CREATE INDEX employee_salary_history_company_created_idx
  ON public.employee_salary_history (company_id, created_at DESC);

COMMENT ON TABLE public.employee_salary_history IS
  'Historial de cambios de salario mensual. old_amount NULL en alta inicial. RLS por empresa; roles con acceso a salario.';

ALTER TABLE public.employee_salary_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_salary_history_select_company
  ON public.employee_salary_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (select auth.uid())
        AND (
          lower(trim(up.role)) = 'super_admin'
          OR (
            up.company_id = employee_salary_history.company_id
            AND lower(trim(up.role)) IN ('admin', 'company_admin', 'hr_manager')
          )
        )
    )
  );

CREATE POLICY employee_salary_history_insert_company
  ON public.employee_salary_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (select auth.uid())
        AND (
          lower(trim(up.role)) = 'super_admin'
          OR (
            up.company_id = employee_salary_history.company_id
            AND lower(trim(up.role)) IN ('admin', 'company_admin', 'hr_manager')
          )
        )
    )
  );

REVOKE ALL ON TABLE public.employee_salary_history FROM PUBLIC;
REVOKE ALL ON TABLE public.employee_salary_history FROM anon;
GRANT SELECT, INSERT ON TABLE public.employee_salary_history TO authenticated;
GRANT ALL ON TABLE public.employee_salary_history TO service_role;
