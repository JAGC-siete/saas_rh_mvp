-- P1: Harden gamification score writes and unify point logic
-- - Ensure employee_scores has a unique constraint on employee_id (required by ON CONFLICT usage)
-- - Allow authenticated users to SELECT scores (company-scoped via RLS), but prevent arbitrary INSERT/UPDATE/DELETE
-- - Provide a single, server-only function to apply attendance gamification updates

-- 1) Ensure uniqueness for employee_scores upserts
CREATE UNIQUE INDEX IF NOT EXISTS ux_employee_scores_employee_id ON public.employee_scores(employee_id);

-- 2) Tighten privileges: authenticated can read, not write
REVOKE INSERT, UPDATE, DELETE ON public.employee_scores FROM authenticated;
GRANT SELECT ON public.employee_scores TO authenticated;

-- (Keep service_role ability to write; service_role bypasses RLS and retains privileges.)

-- 3) Tighten RLS policies on employee_scores
-- Drop broad write policies that allow any same-company user to mutate other employees' scores.
DROP POLICY IF EXISTS "Users can update scores from their company" ON public.employee_scores;
DROP POLICY IF EXISTS "Users can insert scores for their company" ON public.employee_scores;

-- Keep/ensure SELECT policy exists (company-scoped)
-- (If it already exists, this is a no-op due to IF NOT EXISTS not being supported for policies.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'employee_scores'
      AND policyname = 'Users can view scores from their company'
  ) THEN
    CREATE POLICY "Users can view scores from their company" ON public.employee_scores
      FOR SELECT
      USING (
        company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
      );
  END IF;
END $$;

-- 4) Single source of truth for attendance -> points + streak counters + history (server-side)
-- NOTE: This function is intended to be called by backend code using the service role.
CREATE OR REPLACE FUNCTION public.apply_attendance_gamification(
  p_employee_id UUID,
  p_company_id UUID,
  p_rule TEXT,
  p_late_minutes INTEGER
) RETURNS INTEGER AS $$
DECLARE
  late_mins INTEGER := GREATEST(0, COALESCE(p_late_minutes, 0));
  is_early BOOLEAN := (p_rule = 'early');
  is_late BOOLEAN := (p_rule = 'late' OR p_rule = 'oor');
  points_to_add INTEGER := 0;
BEGIN
  -- Calculate points using the canonical DB function
  points_to_add := public.calculate_attendance_points(p_employee_id, late_mins, is_early);

  -- Upsert score row (requires unique index on employee_id)
  INSERT INTO public.employee_scores (
    employee_id,
    company_id,
    total_points,
    weekly_points,
    monthly_points,
    punctuality_streak,
    early_arrival_count
  ) VALUES (
    p_employee_id,
    p_company_id,
    points_to_add,
    points_to_add,
    points_to_add,
    CASE WHEN is_late THEN 0 ELSE 1 END,
    CASE WHEN is_early THEN 1 ELSE 0 END
  )
  ON CONFLICT (employee_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    total_points = public.employee_scores.total_points + EXCLUDED.total_points,
    weekly_points = public.employee_scores.weekly_points + EXCLUDED.weekly_points,
    monthly_points = public.employee_scores.monthly_points + EXCLUDED.monthly_points,
    punctuality_streak = CASE
      WHEN is_late THEN 0
      ELSE public.employee_scores.punctuality_streak + 1
    END,
    early_arrival_count = public.employee_scores.early_arrival_count + CASE WHEN is_early THEN 1 ELSE 0 END,
    updated_at = CURRENT_TIMESTAMP;

  -- Record point history (best audit trail)
  INSERT INTO public.point_history (employee_id, company_id, points_earned, reason, action_type)
  VALUES (
    p_employee_id,
    p_company_id,
    points_to_add,
    CONCAT('attendance:', COALESCE(p_rule, 'unknown')),
    'check_in'
  );

  RETURN points_to_add;
END;
$$ LANGUAGE plpgsql;

-- Lock down function execution from client roles (backend uses service_role / server key).
REVOKE ALL ON FUNCTION public.apply_attendance_gamification(UUID, UUID, TEXT, INTEGER) FROM anon, authenticated;

