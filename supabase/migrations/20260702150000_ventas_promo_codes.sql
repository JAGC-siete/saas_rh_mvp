-- Múltiples cupones promocionales por config_ventas (superadmin /ventas-config).

BEGIN;

CREATE TABLE IF NOT EXISTS public.config_ventas_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.config_ventas(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_pct numeric(6, 4) NOT NULL,
  label text NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT config_ventas_promo_codes_discount_range CHECK (discount_pct >= 0 AND discount_pct <= 1),
  CONSTRAINT config_ventas_promo_codes_code_nonempty CHECK (char_length(trim(code)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS config_ventas_promo_codes_config_code_idx
  ON public.config_ventas_promo_codes (config_id, lower(trim(code)));

CREATE INDEX IF NOT EXISTS config_ventas_promo_codes_config_active_idx
  ON public.config_ventas_promo_codes (config_id, is_active, sort_order);

DROP TRIGGER IF EXISTS trg_config_ventas_promo_codes_updated_at ON public.config_ventas_promo_codes;
CREATE TRIGGER trg_config_ventas_promo_codes_updated_at
BEFORE UPDATE ON public.config_ventas_promo_codes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.config_ventas_promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_ventas_promo_codes_super_admin_select" ON public.config_ventas_promo_codes;
CREATE POLICY "config_ventas_promo_codes_super_admin_select" ON public.config_ventas_promo_codes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

DROP POLICY IF EXISTS "config_ventas_promo_codes_super_admin_write" ON public.config_ventas_promo_codes;
CREATE POLICY "config_ventas_promo_codes_super_admin_write" ON public.config_ventas_promo_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin' AND up.is_active = true
    )
  );

-- Migrar cupón único legacy → tabla de cupones (si aún no existe fila).
INSERT INTO public.config_ventas_promo_codes (config_id, code, discount_pct, label, is_active, sort_order)
SELECT
  cv.id,
  trim(cv.coupon_code),
  cv.coupon_discount_pct,
  'Cupón principal',
  true,
  10
FROM public.config_ventas cv
WHERE cv.is_active = true
  AND cv.coupon_code IS NOT NULL
  AND trim(cv.coupon_code) <> ''
  AND cv.coupon_discount_pct IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.config_ventas_promo_codes pc WHERE pc.config_id = cv.id
  );

COMMIT;
