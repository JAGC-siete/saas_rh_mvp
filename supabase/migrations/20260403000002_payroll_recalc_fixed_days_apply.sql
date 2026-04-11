-- Atomic apply for fixed-line days recalc: remove standard field overrides, update line (calc + eff).
-- Avoids stale payroll_adjustments re-applying old bruto/neto on next trigger.

CREATE OR REPLACE FUNCTION public.payroll_recalc_fixed_days_apply(
  p_run_line_id uuid,
  p_company_id uuid,
  p_calc_hours numeric,
  p_calc_bruto numeric,
  p_calc_ihss numeric,
  p_calc_rap numeric,
  p_calc_isr numeric,
  p_calc_neto numeric,
  p_metadata jsonb,
  p_tax_year integer DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM 1
  FROM public.payroll_run_lines
  WHERE id = p_run_line_id AND company_id = p_company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Line not found or access denied');
  END IF;

  DELETE FROM public.payroll_adjustments
  WHERE run_line_id = p_run_line_id
    AND field IN ('hours', 'bruto', 'ihss', 'rap', 'isr', 'neto');

  UPDATE public.payroll_run_lines
  SET
    calc_hours = p_calc_hours,
    calc_bruto = p_calc_bruto,
    calc_ihss = p_calc_ihss,
    calc_rap = p_calc_rap,
    calc_isr = p_calc_isr,
    calc_neto = p_calc_neto,
    eff_hours = p_calc_hours,
    eff_bruto = p_calc_bruto,
    eff_ihss = p_calc_ihss,
    eff_rap = p_calc_rap,
    eff_isr = p_calc_isr,
    eff_neto = p_calc_neto,
    metadata = p_metadata,
    tax_year = COALESCE(p_tax_year, tax_year),
    edited = true,
    updated_at = now()
  WHERE id = p_run_line_id
    AND company_id = p_company_id;

  RETURN jsonb_build_object(
    'success', true,
    'run_line_id', p_run_line_id,
    'user_id', p_user_id
  );
END;
$$;

COMMENT ON FUNCTION public.payroll_recalc_fixed_days_apply IS
  'Deletes standard payroll_adjustments for a line and sets calc_/eff_/metadata in one transaction (fixed days recalc).';

REVOKE ALL ON FUNCTION public.payroll_recalc_fixed_days_apply(uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric, jsonb, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.payroll_recalc_fixed_days_apply(uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric, jsonb, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payroll_recalc_fixed_days_apply(uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric, jsonb, integer, uuid) TO service_role;

-- Si PostgREST sigue respondiendo "Could not find the function ... schema cache", en SQL Editor:
--   NOTIFY pgrst, 'reload schema';
-- (o reiniciar el proyecto / esperar al refresco automático del caché).
