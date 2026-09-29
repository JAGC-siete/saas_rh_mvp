-- El saldo solo cambia dentro de inventory_apply_movement.
-- Un UPDATE directo de stock_actual deja el libro de movimientos atrás.

CREATE OR REPLACE FUNCTION public.inventory_guard_stock_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.stock_actual <> 0
     AND current_setting('inventory.allow_stock_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'stock_direct_write' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.stock_actual IS DISTINCT FROM OLD.stock_actual
     AND current_setting('inventory.allow_stock_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'stock_direct_write' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_products_guard_stock ON public.inventory_products;
CREATE TRIGGER inventory_products_guard_stock
  BEFORE INSERT OR UPDATE ON public.inventory_products
  FOR EACH ROW
  EXECUTE FUNCTION public.inventory_guard_stock_write();

REVOKE ALL ON FUNCTION public.inventory_guard_stock_write() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.inventory_guard_stock_write() FROM anon;
GRANT EXECUTE ON FUNCTION public.inventory_guard_stock_write() TO authenticated, service_role;

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

  PERFORM set_config('inventory.allow_stock_write', 'on', true);

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
