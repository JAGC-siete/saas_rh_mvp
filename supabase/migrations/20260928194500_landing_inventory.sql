-- Inventario opcional por landing. El saldo solo cambia con un movimiento.
-- anon no lee estas tablas. El render público usa service role y solo los ids citados.

ALTER TABLE public.landing_pages
  ADD COLUMN IF NOT EXISTS inventory_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.landing_pages.inventory_enabled IS
  'true = el panel de inventario está activo y la página pública lee el saldo vivo de los ítems enlazados.';

CREATE TABLE IF NOT EXISTS public.inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  sku text NOT NULL,
  precio numeric(12, 2) NOT NULL,
  stock_actual integer NOT NULL DEFAULT 0,
  stock_minimo integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_products_landing_company_fk
    FOREIGN KEY (landing_id, company_id)
    REFERENCES public.landing_pages (id, company_id) ON DELETE CASCADE,
  CONSTRAINT inventory_products_nombre_len CHECK (length(trim(nombre)) BETWEEN 1 AND 80),
  CONSTRAINT inventory_products_sku_len CHECK (length(trim(sku)) BETWEEN 1 AND 40),
  CONSTRAINT inventory_products_precio_nonneg CHECK (precio >= 0),
  CONSTRAINT inventory_products_stock_nonneg CHECK (stock_actual >= 0),
  CONSTRAINT inventory_products_min_nonneg CHECK (stock_minimo >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_products_landing_sku_uidx
  ON public.inventory_products (landing_id, lower(sku));

CREATE INDEX IF NOT EXISTS idx_inventory_products_landing
  ON public.inventory_products (landing_id, nombre);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  landing_id uuid NOT NULL,
  company_id uuid NOT NULL,
  delta integer NOT NULL,
  stock_after integer NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_movements_landing_company_fk
    FOREIGN KEY (landing_id, company_id)
    REFERENCES public.landing_pages (id, company_id) ON DELETE CASCADE,
  CONSTRAINT inventory_movements_delta_nonzero CHECK (delta <> 0),
  CONSTRAINT inventory_movements_stock_after_nonneg CHECK (stock_after >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_created
  ON public.inventory_movements (product_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'inventory_products_set_updated_at') THEN
    CREATE TRIGGER inventory_products_set_updated_at
      BEFORE UPDATE ON public.inventory_products
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.inventory_apply_movement(
  p_product_id uuid,
  p_delta integer,
  p_actor uuid
) RETURNS public.inventory_products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product public.inventory_products;
  next_stock integer;
BEGIN
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'delta_zero' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO product
  FROM public.inventory_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found' USING ERRCODE = 'P0002';
  END IF;

  next_stock := product.stock_actual + p_delta;
  IF next_stock < 0 THEN
    RAISE EXCEPTION 'stock_negative' USING ERRCODE = '23514';
  END IF;

  UPDATE public.inventory_products
  SET stock_actual = next_stock
  WHERE id = p_product_id
  RETURNING * INTO product;

  INSERT INTO public.inventory_movements (
    product_id, landing_id, company_id, delta, stock_after, created_by
  ) VALUES (
    product.id, product.landing_id, product.company_id, p_delta, next_stock, p_actor
  );

  RETURN product;
END;
$$;

REVOKE ALL ON FUNCTION public.inventory_apply_movement(uuid, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.inventory_apply_movement(uuid, integer, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.inventory_apply_movement(uuid, integer, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_apply_movement(uuid, integer, uuid) TO service_role;

ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.inventory_products FROM anon;
REVOKE ALL ON public.inventory_movements FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_products TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated, service_role;

DROP POLICY IF EXISTS inventory_products_super_admin ON public.inventory_products;
CREATE POLICY inventory_products_super_admin
  ON public.inventory_products
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
        AND up.is_active IS NOT FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
        AND up.is_active IS NOT FALSE
    )
  );

DROP POLICY IF EXISTS inventory_movements_super_admin ON public.inventory_movements;
CREATE POLICY inventory_movements_super_admin
  ON public.inventory_movements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
        AND up.is_active IS NOT FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role = 'super_admin'
        AND up.is_active IS NOT FALSE
    )
  );
