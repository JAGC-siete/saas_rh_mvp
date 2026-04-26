-- Migration: Align plan_catalog with commercial plans (trial/basic/premium/enterprise)
-- Date: 2026-04-18
-- Context:
--   - plan_catalog in prod had only `starter, pro, enterprise`, so the admin UI
--     at /app/admin/plan-features only rendered pro and enterprise (it filters by
--     the internal keys `free_trial, basic, pro, enterprise`).
--   - companies.plan_type is the commercial label and had mixed casings
--     (e.g. `Premium`) plus no CHECK constraint.
--   - app_private.has_feature() mapped basic and trial to `starter`, so there
--     was no way to differentiate Free Trial vs Basic in the feature matrix.
--
-- Goal:
--   1. Ensure plan_catalog has the 4 internal plans (free_trial, basic, pro, enterprise).
--   2. Carry over any existing `starter` feature assignments into `basic` (and
--      seed `free_trial` with the same baseline).
--   3. Deactivate `starter` (keep the row to respect any existing FKs).
--   4. Normalize companies.plan_type values and lock them via CHECK constraint.
--   5. Update has_feature() to use the commercial -> internal mapping
--      (trial->free_trial, basic->basic, premium->pro, enterprise->enterprise).
--
-- Idempotent: safe to run multiple times.

-- =====================================================
-- 1) Ensure plan_catalog has the 4 internal plans
-- =====================================================

INSERT INTO public.plan_catalog (plan_key, name, description, is_active)
VALUES
  ('free_trial', 'Free Trial', 'Trial gratuito con acceso al mínimo operativo', true),
  ('basic',      'Basic',      'Plan base: empleados, departamentos, asistencia, planilla, deducciones', true),
  ('pro',        'Pro',        'Basic + contabilidad, 13/14, reportes, cesantías', true),
  ('enterprise', 'Enterprise', 'Pro + portal de empleados', true)
ON CONFLICT (plan_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = now();

-- =====================================================
-- 2) Make sure every feature_catalog row used below exists
--    (no-op if already present)
-- =====================================================

INSERT INTO public.feature_catalog (feature_key, name, description)
VALUES
  ('employees',       'Empleados',        'Gestión de empleados'),
  ('departments',     'Departamentos',    'Gestión de departamentos'),
  ('attendance',      'Asistencia',       'Asistencia y marcajes'),
  ('payroll',         'Nómina',           'Planillas'),
  ('deducciones',     'Deducciones',      'Deducciones y planes de deducción'),
  ('contabilidad',    'Contabilidad',     'Catálogo contable, mapeos y asientos'),
  ('decimo_13_14',    '13 & 14 Salario',  'Provisiones y pagos 13/14'),
  ('reports',         'Reportes',         'Exportaciones y reportes'),
  ('cesantias',       'Cesantías',        'Cálculo y gestión de cesantías / finiquitos'),
  ('employee_portal', 'Portal Empleados', 'Portal de autoservicio para empleados')
ON CONFLICT (feature_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = now();

-- =====================================================
-- 3) Seed/refresh plan_features assignments
--    Strategy:
--      - `basic` inherits from legacy `starter` if present, plus the documented baseline.
--      - `free_trial` mirrors the baseline (employees, departments, attendance, payroll, deducciones).
--      - `pro` = baseline + contabilidad, decimo_13_14, reports, cesantias.
--      - `enterprise` = pro + employee_portal.
--    Only inserts; never removes existing overrides made from the UI for pro/enterprise.
-- =====================================================

-- Carry legacy starter -> basic (if starter exists and has features)
INSERT INTO public.plan_features (plan_key, feature_key)
SELECT 'basic', pf.feature_key
FROM public.plan_features pf
WHERE pf.plan_key = 'starter'
ON CONFLICT DO NOTHING;

-- Baseline for basic (in case starter didn't cover everything or didn't exist)
INSERT INTO public.plan_features (plan_key, feature_key)
VALUES
  ('basic', 'employees'),
  ('basic', 'departments'),
  ('basic', 'attendance'),
  ('basic', 'payroll'),
  ('basic', 'deducciones')
ON CONFLICT DO NOTHING;

-- Free trial = same baseline as basic
INSERT INTO public.plan_features (plan_key, feature_key)
VALUES
  ('free_trial', 'employees'),
  ('free_trial', 'departments'),
  ('free_trial', 'attendance'),
  ('free_trial', 'payroll'),
  ('free_trial', 'deducciones')
ON CONFLICT DO NOTHING;

-- Pro baseline (keeps any extra rows already defined via the UI)
INSERT INTO public.plan_features (plan_key, feature_key)
VALUES
  ('pro', 'employees'),
  ('pro', 'departments'),
  ('pro', 'attendance'),
  ('pro', 'payroll'),
  ('pro', 'deducciones'),
  ('pro', 'contabilidad'),
  ('pro', 'decimo_13_14'),
  ('pro', 'reports'),
  ('pro', 'cesantias')
ON CONFLICT DO NOTHING;

-- Enterprise baseline
INSERT INTO public.plan_features (plan_key, feature_key)
VALUES
  ('enterprise', 'employees'),
  ('enterprise', 'departments'),
  ('enterprise', 'attendance'),
  ('enterprise', 'payroll'),
  ('enterprise', 'deducciones'),
  ('enterprise', 'contabilidad'),
  ('enterprise', 'decimo_13_14'),
  ('enterprise', 'reports'),
  ('enterprise', 'cesantias'),
  ('enterprise', 'employee_portal')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4) Deprecate legacy `starter` plan if present.
--    We keep the row so any historical FK references stay intact,
--    but mark it inactive so the admin UI can hide it.
-- =====================================================
UPDATE public.plan_catalog
SET is_active = false,
    description = COALESCE(description, '') ||
                  CASE
                    WHEN description IS NULL OR description !~ 'DEPRECATED'
                      THEN ' [DEPRECATED: replaced by basic]'
                    ELSE ''
                  END,
    updated_at = now()
WHERE plan_key = 'starter';

-- =====================================================
-- 5) Normalize companies.plan_type + CHECK constraint
--    Allowed commercial values: trial, basic, premium, enterprise.
-- =====================================================

-- Trim + lowercase
UPDATE public.companies
SET plan_type = lower(btrim(plan_type))
WHERE plan_type IS DISTINCT FROM lower(btrim(plan_type));

-- Fallback to 'basic' when null/empty or unknown
UPDATE public.companies
SET plan_type = 'basic'
WHERE plan_type IS NULL
   OR plan_type = ''
   OR plan_type NOT IN ('trial', 'basic', 'premium', 'enterprise');

-- Drop and recreate the CHECK constraint (idempotent)
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_plan_type_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_plan_type_check
  CHECK (plan_type IN ('trial', 'basic', 'premium', 'enterprise'));

-- =====================================================
-- 6) Rewrite has_feature() with the final commercial -> internal mapping.
-- =====================================================

CREATE OR REPLACE FUNCTION app_private.has_feature(p_company_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  v_company_plan_type TEXT;
  v_plan_key TEXT;
  v_override BOOLEAN;
BEGIN
  IF p_company_id IS NULL OR p_feature_key IS NULL OR btrim(p_feature_key) = '' THEN
    RETURN FALSE;
  END IF;

  -- Per-company override wins (explicit on/off)
  SELECT cfo.is_enabled
  INTO v_override
  FROM public.company_feature_overrides cfo
  WHERE cfo.company_id = p_company_id
    AND cfo.feature_key = p_feature_key
  LIMIT 1;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  -- Map commercial plan_type -> internal plan_key
  SELECT lower(btrim(coalesce(c.plan_type, 'basic')))
  INTO v_company_plan_type
  FROM public.companies c
  WHERE c.id = p_company_id;

  v_plan_key := CASE v_company_plan_type
    WHEN 'enterprise' THEN 'enterprise'
    WHEN 'premium'    THEN 'pro'
    WHEN 'basic'      THEN 'basic'
    WHEN 'trial'      THEN 'free_trial'
    ELSE 'basic'
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.plan_features pf
    WHERE pf.plan_key = v_plan_key
      AND pf.feature_key = p_feature_key
  );
END;
$$;

REVOKE ALL ON FUNCTION app_private.has_feature(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.has_feature(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION app_private.has_feature(UUID, TEXT) IS
  'Returns whether a company has a feature enabled. Resolution order: company override > plan mapping (trial->free_trial, basic->basic, premium->pro, enterprise->enterprise).';

-- =====================================================
-- 7) Convenience view: effective features per company
--    (used by the admin UI to display module access).
-- =====================================================

CREATE OR REPLACE VIEW public.v_company_effective_features AS
SELECT
  c.id AS company_id,
  c.plan_type,
  fc.feature_key,
  fc.name AS feature_name,
  CASE
    WHEN cfo.is_enabled IS NOT NULL THEN cfo.is_enabled
    ELSE EXISTS (
      SELECT 1
      FROM public.plan_features pf
      WHERE pf.feature_key = fc.feature_key
        AND pf.plan_key = (
          CASE lower(btrim(coalesce(c.plan_type, 'basic')))
            WHEN 'enterprise' THEN 'enterprise'
            WHEN 'premium'    THEN 'pro'
            WHEN 'basic'      THEN 'basic'
            WHEN 'trial'      THEN 'free_trial'
            ELSE 'basic'
          END
        )
    )
  END AS is_enabled,
  (cfo.is_enabled IS NOT NULL) AS has_override,
  cfo.reason AS override_reason
FROM public.companies c
CROSS JOIN public.feature_catalog fc
LEFT JOIN public.company_feature_overrides cfo
  ON cfo.company_id = c.id
 AND cfo.feature_key = fc.feature_key;

COMMENT ON VIEW public.v_company_effective_features IS
  'Effective feature access per company (plan mapping + overrides). Read via service role in admin endpoints.';
