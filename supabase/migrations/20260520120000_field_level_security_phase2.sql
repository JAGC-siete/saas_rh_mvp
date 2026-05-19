-- Field-level security phase 2: Postgres hardening
-- Blocks direct JWT reads/writes of salary columns; guards writes via triggers.

CREATE SCHEMA IF NOT EXISTS app_private;

-- Canonical role defaults (aligned with lib/security/canonical-permissions.ts)
CREATE OR REPLACE FUNCTION app_private.role_default_salary_view(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, app_private
AS $$
  SELECT CASE lower(trim(COALESCE(p_role, '')))
    WHEN 'super_admin' THEN true
    WHEN 'admin' THEN true
    WHEN 'company_admin' THEN true
    WHEN 'hr_manager' THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION app_private.role_default_salary_edit(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, app_private
AS $$
  SELECT CASE lower(trim(COALESCE(p_role, '')))
    WHEN 'super_admin' THEN true
    WHEN 'admin' THEN true
    WHEN 'company_admin' THEN true
    WHEN 'hr_manager' THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION app_private.profile_permissions_jsonb(p_permissions JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public, app_private
AS $$
  SELECT CASE
    WHEN p_permissions IS NULL THEN '{}'::jsonb
    WHEN jsonb_typeof(p_permissions) = 'object' THEN p_permissions
    ELSE '{}'::jsonb
  END;
$$;

CREATE OR REPLACE FUNCTION app_private.access_from_level(p_level TEXT)
RETURNS TABLE (can_view BOOLEAN, can_edit BOOLEAN)
LANGUAGE sql
IMMUTABLE
SET search_path = public, app_private
AS $$
  SELECT
    CASE p_level
      WHEN 'write' THEN true
      WHEN 'read' THEN true
      ELSE false
    END,
    CASE p_level
      WHEN 'write' THEN true
      ELSE false
    END;
$$;

CREATE OR REPLACE FUNCTION app_private.resolve_salary_access(p_user_id UUID)
RETURNS TABLE (can_view_salary BOOLEAN, can_edit_salary BOOLEAN)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  v_role TEXT;
  v_perms JSONB;
  v_can_view BOOLEAN;
  v_can_edit BOOLEAN;
  v_has_view_override BOOLEAN;
  v_has_edit_override BOOLEAN;
  v_row public.role_field_permissions%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;

  SELECT up.role, app_private.profile_permissions_jsonb(up.permissions::jsonb)
  INTO v_role, v_perms
  FROM public.user_profiles up
  WHERE up.id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false;
    RETURN;
  END IF;

  v_can_view := app_private.role_default_salary_view(v_role);
  v_can_edit := app_private.role_default_salary_edit(v_role);

  SELECT * INTO v_row
  FROM public.role_field_permissions rfp
  WHERE rfp.role = v_role
    AND rfp.field_key = 'employee.base_salary';

  IF FOUND THEN
    SELECT a.can_view, a.can_edit
    INTO v_can_view, v_can_edit
    FROM app_private.access_from_level(v_row.access_level) a;
  END IF;

  v_has_view_override := v_perms ? 'can_view_salary'
    AND jsonb_typeof(v_perms->'can_view_salary') = 'boolean';
  v_has_edit_override := v_perms ? 'can_edit_salary'
    AND jsonb_typeof(v_perms->'can_edit_salary') = 'boolean';

  IF v_has_view_override THEN
    v_can_view := (v_perms->>'can_view_salary')::boolean;
  END IF;

  IF v_has_edit_override THEN
    v_can_edit := (v_perms->>'can_edit_salary')::boolean;
  END IF;

  -- Manager hard deny unless explicit JSON override (canonical-permissions.ts)
  IF lower(trim(COALESCE(v_role, ''))) = 'manager' THEN
    IF NOT v_has_view_override THEN
      v_can_view := false;
    END IF;
    IF NOT v_has_edit_override THEN
      v_can_edit := false;
    END IF;
  END IF;

  IF v_can_edit THEN
    v_can_view := true;
  END IF;

  RETURN QUERY SELECT v_can_view, v_can_edit;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.user_can_view_salary(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT COALESCE(
    (SELECT can_view_salary FROM app_private.resolve_salary_access(p_user_id)),
    false
  );
$$;

CREATE OR REPLACE FUNCTION app_private.user_can_edit_salary(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT COALESCE(
    (SELECT can_edit_salary FROM app_private.resolve_salary_access(p_user_id)),
    false
  );
$$;

REVOKE ALL ON FUNCTION app_private.resolve_salary_access(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.user_can_view_salary(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.user_can_edit_salary(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app_private.user_can_view_salary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.user_can_edit_salary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.user_can_view_salary(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION app_private.user_can_edit_salary(UUID) TO service_role;

COMMENT ON FUNCTION app_private.user_can_view_salary(UUID) IS
  'Effective can_view_salary: user JSON override > role_field_permissions > canonical defaults.';
COMMENT ON FUNCTION app_private.user_can_edit_salary(UUID) IS
  'Effective can_edit_salary; edit implies view.';

-- Write guard for direct PostgREST mutations (service role / null auth.uid() bypasses)
CREATE OR REPLACE FUNCTION app_private.guard_employees_salary_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.base_salary IS NOT NULL
      AND NOT app_private.user_can_edit_salary(auth.uid()) THEN
      RAISE EXCEPTION 'permission denied for column base_salary'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.base_salary IS DISTINCT FROM OLD.base_salary
      AND NOT app_private.user_can_edit_salary(auth.uid()) THEN
      NEW.base_salary := OLD.base_salary;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employees_guard_salary_write ON public.employees;
CREATE TRIGGER employees_guard_salary_write
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_employees_salary_write();

-- Column privileges: JWT clients cannot read or write salary columns directly
REVOKE SELECT (base_salary, hourly_rate_reference) ON public.employees FROM authenticated, anon;
REVOKE INSERT (base_salary) ON public.employees FROM authenticated, anon;
REVOKE UPDATE (base_salary) ON public.employees FROM authenticated, anon;

-- SECURITY DEFINER report RPCs: mask salary at source
CREATE OR REPLACE FUNCTION reports_employees(
    p_company_id UUID,
    p_status_filter TEXT DEFAULT 'all',
    p_department_ids UUID[] DEFAULT NULL
) RETURNS TABLE (
    employee_id UUID,
    employee_code TEXT,
    name TEXT,
    dni TEXT,
    email TEXT,
    phone TEXT,
    department_name TEXT,
    role TEXT,
    "position" TEXT,
    base_salary DECIMAL(10,2),
    hire_date DATE,
    termination_date DATE,
    status TEXT,
    years_tenure DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id AS employee_id,
        e.employee_code,
        e.name,
        e.dni,
        e.email,
        e.phone,
        d.name AS department_name,
        e.role,
        e."position",
        CASE
          WHEN app_private.user_can_view_salary(auth.uid()) THEN e.base_salary
          ELSE NULL
        END AS base_salary,
        e.hire_date,
        e.termination_date,
        e.status,
        CASE
            WHEN e.hire_date IS NOT NULL
            THEN EXTRACT(YEAR FROM AGE(COALESCE(e.termination_date, CURRENT_DATE), e.hire_date))::DECIMAL(5,2)
            ELSE 0
        END AS years_tenure
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.company_id = p_company_id
        AND (p_status_filter = 'all' OR e.status = p_status_filter)
        AND (p_department_ids IS NULL OR e.department_id = ANY(p_department_ids) OR e.department_id IS NULL)
    ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, app_private;

CREATE OR REPLACE FUNCTION reports_work_certificate_data(
    p_company_id UUID,
    p_employee_id UUID,
    p_certificate_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    employee_name TEXT,
    dni TEXT,
    "position" TEXT,
    department_name TEXT,
    hire_date DATE,
    base_salary DECIMAL(10,2),
    company_name TEXT,
    years_tenure INTEGER,
    months_tenure INTEGER,
    certificate_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.name AS employee_name,
        e.dni,
        COALESCE(e."position", e.role) AS "position",
        d.name AS department_name,
        e.hire_date,
        CASE
          WHEN app_private.user_can_view_salary(auth.uid()) THEN e.base_salary
          ELSE NULL
        END AS base_salary,
        c.name AS company_name,
        EXTRACT(YEAR FROM AGE(p_certificate_date, e.hire_date))::INTEGER AS years_tenure,
        EXTRACT(MONTH FROM AGE(p_certificate_date, e.hire_date))::INTEGER AS months_tenure,
        p_certificate_date AS certificate_date
    FROM employees e
    INNER JOIN companies c ON e.company_id = c.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.company_id = p_company_id
        AND e.id = p_employee_id
        AND e.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, app_private;

-- Shaped employee list for authenticated clients (optional safe read path)
CREATE OR REPLACE FUNCTION public.get_company_employees(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    department_id UUID,
    employee_code TEXT,
    dni TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    team TEXT,
    "position" TEXT,
    hire_date DATE,
    termination_date DATE,
    status TEXT,
    pay_type TEXT,
    payment_frequency TEXT,
    base_salary NUMERIC,
    base_salary_masked BOOLEAN,
    hourly_rate_reference NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
  SELECT
    e.id,
    e.company_id,
    e.department_id,
    e.employee_code,
    e.dni,
    e.name,
    e.email,
    e.phone,
    e.role,
    e.team,
    e."position",
    e.hire_date,
    e.termination_date,
    e.status,
    e.pay_type,
    e.payment_frequency,
    CASE WHEN app_private.user_can_view_salary(auth.uid()) THEN e.base_salary ELSE NULL END,
    NOT app_private.user_can_view_salary(auth.uid()),
    CASE WHEN app_private.user_can_view_salary(auth.uid()) THEN e.hourly_rate_reference ELSE NULL END,
    e.created_at,
    e.updated_at
  FROM public.employees e
  WHERE e.company_id = p_company_id
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.company_id = p_company_id
          OR lower(trim(up.role)) = 'super_admin'
        )
    );
$$;

REVOKE ALL ON FUNCTION public.get_company_employees(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_employees(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_company_employees(UUID) IS
  'Safe employee list with salary shaped per field-level security; use when PostgREST column REVOKE blocks direct selects.';
