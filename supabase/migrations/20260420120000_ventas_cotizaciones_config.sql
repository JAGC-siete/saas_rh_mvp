-- Ventas: Configuración de precios + cotizaciones públicas con cálculo privado en backend
-- Objetivo: permitir insert público (landing) y administración solo super_admin.

BEGIN;

-- =========================
-- 1) CONFIG: config_ventas
-- =========================

CREATE TABLE IF NOT EXISTS public.config_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  currency text NOT NULL DEFAULT 'HNL',
  coupon_code text NULL,
  -- 0.45 = 45%
  coupon_discount_pct numeric(6, 4) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

CREATE INDEX IF NOT EXISTS config_ventas_active_idx ON public.config_ventas (is_active) WHERE is_active IS TRUE;

-- =========================
-- 2) CONFIG: tiers
-- =========================

CREATE TABLE IF NOT EXISTS public.config_ventas_pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.config_ventas(id) ON DELETE CASCADE,
  min_employees int NOT NULL,
  max_employees int NOT NULL,
  price numeric(12, 2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS config_ventas_pricing_tiers_config_idx
  ON public.config_ventas_pricing_tiers (config_id, is_active, sort_order);

-- Guard rails (sin traslape a nivel de dato lo controlará UI/validación; aquí mínimo coherencia de rango)
ALTER TABLE public.config_ventas_pricing_tiers
  DROP CONSTRAINT IF EXISTS config_ventas_pricing_tiers_min_le_max;
ALTER TABLE public.config_ventas_pricing_tiers
  ADD CONSTRAINT config_ventas_pricing_tiers_min_le_max CHECK (min_employees >= 1 AND max_employees >= min_employees);

-- =========================
-- 3) LEADS: cotizaciones
-- =========================

CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  contact_email text NOT NULL,
  contact_name text NULL,
  company_name text NULL,
  phone text NULL,
  employees_count int NOT NULL,
  terminals_count int NULL,
  coupon_code_submitted text NULL,
  coupon_applied boolean NOT NULL DEFAULT false,
  discount_pct_applied numeric(6, 4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'HNL',
  subtotal numeric(12, 2) NOT NULL,
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL,
  pricing_tier_id uuid NULL REFERENCES public.config_ventas_pricing_tiers(id) ON DELETE SET NULL,
  pricing_tier_snapshot jsonb NULL,
  status text NOT NULL DEFAULT 'created',
  email_message_id text NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS cotizaciones_created_at_idx ON public.cotizaciones (created_at DESC);
CREATE INDEX IF NOT EXISTS cotizaciones_contact_email_idx ON public.cotizaciones (contact_email);

-- =========================
-- 4) updated_at trigger
-- =========================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_config_ventas_updated_at ON public.config_ventas;
CREATE TRIGGER trg_config_ventas_updated_at
BEFORE UPDATE ON public.config_ventas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_config_ventas_pricing_tiers_updated_at ON public.config_ventas_pricing_tiers;
CREATE TRIGGER trg_config_ventas_pricing_tiers_updated_at
BEFORE UPDATE ON public.config_ventas_pricing_tiers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- 5) RLS
-- =========================

ALTER TABLE public.config_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_ventas_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

-- Helper predicate (inline): super_admin = EXISTS user_profiles(role='super_admin')

-- config_ventas: super_admin only
DROP POLICY IF EXISTS "config_ventas_super_admin_select" ON public.config_ventas;
CREATE POLICY "config_ventas_super_admin_select" ON public.config_ventas
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_active IS TRUE
  )
);

DROP POLICY IF EXISTS "config_ventas_super_admin_write" ON public.config_ventas;
CREATE POLICY "config_ventas_super_admin_write" ON public.config_ventas
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_active IS TRUE
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_active IS TRUE
  )
);

-- config_ventas_pricing_tiers: super_admin only
DROP POLICY IF EXISTS "config_ventas_pricing_tiers_super_admin_select" ON public.config_ventas_pricing_tiers;
CREATE POLICY "config_ventas_pricing_tiers_super_admin_select" ON public.config_ventas_pricing_tiers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_active IS TRUE
  )
);

DROP POLICY IF EXISTS "config_ventas_pricing_tiers_super_admin_write" ON public.config_ventas_pricing_tiers;
CREATE POLICY "config_ventas_pricing_tiers_super_admin_write" ON public.config_ventas_pricing_tiers
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_active IS TRUE
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_active IS TRUE
  )
);

-- cotizaciones: insert público; select/update/delete solo super_admin
DROP POLICY IF EXISTS "cotizaciones_public_insert" ON public.cotizaciones;
CREATE POLICY "cotizaciones_public_insert" ON public.cotizaciones
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "cotizaciones_super_admin_select" ON public.cotizaciones;
CREATE POLICY "cotizaciones_super_admin_select" ON public.cotizaciones
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_active IS TRUE
  )
);

DROP POLICY IF EXISTS "cotizaciones_super_admin_write" ON public.cotizaciones;
CREATE POLICY "cotizaciones_super_admin_write" ON public.cotizaciones
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_active IS TRUE
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_active IS TRUE
  )
);

DROP POLICY IF EXISTS "cotizaciones_super_admin_delete" ON public.cotizaciones;
CREATE POLICY "cotizaciones_super_admin_delete" ON public.cotizaciones
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role = 'super_admin'
      AND up.is_active IS TRUE
  )
);

-- =========================
-- 6) Seed inicial (fallback permitido)
-- =========================

DO $$
DECLARE
  v_cfg_id uuid;
BEGIN
  -- Si no existe config activa, crear una por defecto
  SELECT id INTO v_cfg_id
  FROM public.config_ventas
  WHERE is_active IS TRUE
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_cfg_id IS NULL THEN
    INSERT INTO public.config_ventas (is_active, currency, coupon_code, coupon_discount_pct)
    VALUES (true, 'HNL', 'gastro2026', 0.45)
    RETURNING id INTO v_cfg_id;

    INSERT INTO public.config_ventas_pricing_tiers (config_id, min_employees, max_employees, price, is_active, sort_order)
    VALUES
      (v_cfg_id, 1, 30, 65000.00, true, 10),
      (v_cfg_id, 31, 50, 74000.00, true, 20),
      (v_cfg_id, 51, 100, 85000.00, true, 30),
      (v_cfg_id, 101, 200, 97450.00, true, 40);
  END IF;
END $$;

COMMIT;

