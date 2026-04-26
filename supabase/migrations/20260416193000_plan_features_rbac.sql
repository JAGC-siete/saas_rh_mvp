-- Migration: Plan features (RBAC + feature flags)
-- Date: 2026-04-16
-- Goal: model SaaS module categories as features per plan, with per-company overrides.
-- Notes:
-- - companies.plan_type stays as the commercial label (trial/basic/premium/enterprise).
-- - Effective access should be enforced in backend (API/RPC/Edge) and optionally in RLS for module-specific tables.
-- - No secrets are stored here.

-- =====================================================
-- 1) Catalog tables
-- =====================================================

CREATE TABLE IF NOT EXISTS public.plan_catalog (
  plan_key TEXT PRIMARY KEY CHECK (plan_key ~ '^[a-z0-9_]+$' AND length(plan_key) <= 32),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_catalog (
  feature_key TEXT PRIMARY KEY CHECK (feature_key ~ '^[a-z0-9_]+$' AND length(feature_key) <= 64),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_features (
  plan_key TEXT NOT NULL REFERENCES public.plan_catalog(plan_key) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES public.feature_catalog(feature_key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_key, feature_key)
);

-- Per-company overrides (add-ons, grandfathering, custom deals)
CREATE TABLE IF NOT EXISTS public.company_feature_overrides (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES public.feature_catalog(feature_key) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_feature ON public.plan_features(feature_key);
CREATE INDEX IF NOT EXISTS idx_company_feature_overrides_company ON public.company_feature_overrides(company_id);

-- updated_at triggers (requires public.update_updated_at_column() to exist)
DROP TRIGGER IF EXISTS plan_catalog_updated_at ON public.plan_catalog;
CREATE TRIGGER plan_catalog_updated_at
  BEFORE UPDATE ON public.plan_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS feature_catalog_updated_at ON public.feature_catalog;
CREATE TRIGGER feature_catalog_updated_at
  BEFORE UPDATE ON public.feature_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS company_feature_overrides_updated_at ON public.company_feature_overrides;
CREATE TRIGGER company_feature_overrides_updated_at
  BEFORE UPDATE ON public.company_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2) Seed internal plans (free_trial, basic, pro, enterprise) + features
-- =====================================================

INSERT INTO public.plan_catalog (plan_key, name, description)
VALUES
  ('free_trial', 'Free Trial', 'Trial gratuito con acceso al módulo mínimo'),
  ('basic', 'Basic', 'Módulo mínimo'),
  ('pro', 'Pro', 'Basic + contabilidad, 13/14, reportes, cesantías'),
  ('enterprise', 'Enterprise', 'Pro + portal de empleados')
ON CONFLICT (plan_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = now();

-- Feature keys (normalized)
INSERT INTO public.feature_catalog (feature_key, name, description)
VALUES
  ('employees', 'Employees', 'Gestión de empleados'),
  ('departments', 'Departments', 'Gestión de departamentos'),
  ('attendance', 'Attendance', 'Asistencia y marcajes'),
  ('payroll', 'Payroll', 'Planillas'),
  ('deducciones', 'Deducciones', 'Deducciones y planes de deducción'),
  ('contabilidad', 'Contabilidad', 'Catálogo contable, mapeos y asientos'),
  ('decimo_13_14', 'Décimo 13/14', 'Provisiones y pagos 13/14'),
  ('reports', 'Reports', 'Exportaciones y reportes (asistencia, planilla, etc.)'),
  ('cesantias', 'Cesantías', 'Cálculo y gestión de cesantías / finiquitos'),
  ('employee_portal', 'Employee Portal', 'Portal de autoservicio para empleados')
ON CONFLICT (feature_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = now();

-- Free Trial
INSERT INTO public.plan_features (plan_key, feature_key)
VALUES
  ('free_trial', 'employees'),
  ('free_trial', 'departments'),
  ('free_trial', 'attendance'),
  ('free_trial', 'payroll'),
  ('free_trial', 'deducciones')
ON CONFLICT DO NOTHING;

-- Basic
INSERT INTO public.plan_features (plan_key, feature_key)
VALUES
  ('basic', 'employees'),
  ('basic', 'departments'),
  ('basic', 'attendance'),
  ('basic', 'payroll'),
  ('basic', 'deducciones')
ON CONFLICT DO NOTHING;

-- Pro = Basic + extras
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

-- Enterprise = Pro + portal
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
-- 3) RLS (lock down catalogs; allow company overrides to be managed by company admins)
-- =====================================================

ALTER TABLE public.plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_feature_overrides ENABLE ROW LEVEL SECURITY;

-- Read-only access to plan/feature catalogs for authenticated users (so UI can render feature list)
DROP POLICY IF EXISTS plan_catalog_select_authenticated ON public.plan_catalog;
CREATE POLICY plan_catalog_select_authenticated
  ON public.plan_catalog
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS feature_catalog_select_authenticated ON public.feature_catalog;
CREATE POLICY feature_catalog_select_authenticated
  ON public.feature_catalog
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS plan_features_select_authenticated ON public.plan_features;
CREATE POLICY plan_features_select_authenticated
  ON public.plan_features
  FOR SELECT
  TO authenticated
  USING (true);

-- Catalog writes: super_admin only
DROP POLICY IF EXISTS plan_catalog_super_admin_all ON public.plan_catalog;
CREATE POLICY plan_catalog_super_admin_all
  ON public.plan_catalog
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin'));

DROP POLICY IF EXISTS feature_catalog_super_admin_all ON public.feature_catalog;
CREATE POLICY feature_catalog_super_admin_all
  ON public.feature_catalog
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin'));

DROP POLICY IF EXISTS plan_features_super_admin_all ON public.plan_features;
CREATE POLICY plan_features_super_admin_all
  ON public.plan_features
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin'));

-- company_feature_overrides:
-- - SELECT: users can see overrides for their company; super_admin sees all
DROP POLICY IF EXISTS company_feature_overrides_select ON public.company_feature_overrides;
CREATE POLICY company_feature_overrides_select
  ON public.company_feature_overrides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
    OR company_id IN (
      SELECT up.company_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.company_id IS NOT NULL
    )
  );

-- - INSERT/UPDATE/DELETE: company_admin/hr_manager for their company; super_admin all
DROP POLICY IF EXISTS company_feature_overrides_admin_write ON public.company_feature_overrides;
CREATE POLICY company_feature_overrides_admin_write
  ON public.company_feature_overrides
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
    OR company_id IN (
      SELECT up.company_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.company_id IS NOT NULL
        AND up.role IN ('company_admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
    OR company_id IN (
      SELECT up.company_id
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.company_id IS NOT NULL
        AND up.role IN ('company_admin', 'hr_manager')
    )
  );

-- =====================================================
-- 4) Helper function: has_feature(company_id, feature_key)
-- =====================================================

-- Keep security-definer functions out of public by using a private schema.
CREATE SCHEMA IF NOT EXISTS app_private;

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

  -- 1) Company override wins (on/off)
  SELECT cfo.is_enabled
  INTO v_override
  FROM public.company_feature_overrides cfo
  WHERE cfo.company_id = p_company_id
    AND cfo.feature_key = p_feature_key
  LIMIT 1;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  -- 2) Map companies.plan_type to internal plan_key
  SELECT lower(coalesce(c.plan_type, 'basic'))
  INTO v_company_plan_type
  FROM public.companies c
  WHERE c.id = p_company_id;

  v_plan_key := CASE v_company_plan_type
    WHEN 'enterprise' THEN 'enterprise'
    WHEN 'premium' THEN 'pro'
    WHEN 'basic' THEN 'basic'
    WHEN 'trial' THEN 'free_trial'
    ELSE 'basic'
  END;

  -- 3) Check plan_features
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
  'Returns whether a company has a feature enabled (override > plan mapping). Use for API/RPC enforcement and optional RLS policies.';

