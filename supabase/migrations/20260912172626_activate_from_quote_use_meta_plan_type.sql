-- Activation plan_type follows cotizaciones.meta commercial flags, not employee count.

CREATE OR REPLACE FUNCTION public.activate_from_quote(
  p_company_id uuid,
  p_amount_hnl numeric,
  p_reference text,
  p_created_by uuid DEFAULT NULL,
  p_quote_id uuid DEFAULT NULL,
  p_paid_at timestamptz DEFAULT now(),
  p_payment_kind text DEFAULT 'deposit',
  p_plan_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_id uuid;
  v_quote public.cotizaciones%ROWTYPE;
  v_payment_id uuid;
  v_plan text;
  v_billing_modality text;
  v_sub_end timestamptz;
  v_new_payment_status text;
  v_settings jsonb;
  v_activated boolean := false;
  v_deposit_threshold numeric;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'COMPANY_ID_REQUIRED';
  END IF;

  IF p_amount_hnl IS NULL OR p_amount_hnl <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'COMPANY_NOT_FOUND';
  END IF;

  IF p_quote_id IS NOT NULL THEN
    v_quote_id := p_quote_id;
  ELSE
    SELECT id INTO v_quote_id
    FROM public.cotizaciones
    WHERE company_id = p_company_id
      AND status = 'sent'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_quote_id IS NULL THEN
    RAISE EXCEPTION 'QUOTE_NOT_FOUND';
  END IF;

  SELECT * INTO v_quote FROM public.cotizaciones WHERE id = v_quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QUOTE_NOT_FOUND';
  END IF;

  IF v_quote.company_id IS NOT NULL AND v_quote.company_id != p_company_id THEN
    RAISE EXCEPTION 'QUOTE_COMPANY_MISMATCH';
  END IF;

  IF v_quote.company_id IS NULL THEN
    UPDATE public.cotizaciones
    SET company_id = p_company_id
    WHERE id = v_quote_id;
  END IF;

  INSERT INTO public.manual_payments (
    company_id,
    amount_hnl,
    reference,
    paid_at,
    created_by,
    quote_id,
    payment_kind
  )
  VALUES (
    p_company_id,
    p_amount_hnl,
    p_reference,
    p_paid_at,
    p_created_by,
    v_quote_id,
    COALESCE(p_payment_kind, 'deposit')
  )
  RETURNING id INTO v_payment_id;

  v_new_payment_status := v_quote.payment_status;
  v_deposit_threshold := v_quote.expected_deposit_hnl;

  IF v_deposit_threshold IS NOT NULL AND p_amount_hnl >= v_deposit_threshold THEN
    v_new_payment_status := 'deposit_received';
    v_activated := true;
  ELSIF v_deposit_threshold IS NULL
    AND COALESCE(p_payment_kind, 'deposit') = 'deposit'
    AND p_amount_hnl > 0
    AND v_quote.payment_status IN ('pending', 'unknown_legacy')
  THEN
    v_new_payment_status := 'deposit_received';
    v_activated := true;
  ELSIF COALESCE(p_payment_kind, 'deposit') = 'subscription' THEN
    v_new_payment_status := 'paid';
    v_activated := true;
  END IF;

  IF v_new_payment_status IS DISTINCT FROM v_quote.payment_status THEN
    UPDATE public.cotizaciones
    SET payment_status = v_new_payment_status
    WHERE id = v_quote_id;
  END IF;

  IF v_activated THEN
    v_plan := COALESCE(
      NULLIF(trim(p_plan_type), ''),
      public.ventas_quote_to_plan_type(v_quote.meta, v_quote.employees_count)
    );
    v_billing_modality := COALESCE(v_quote.meta->>'billing_modality', 'annual');

    IF v_billing_modality = 'monthly' THEN
      v_sub_end := now() + interval '1 month';
    ELSE
      v_sub_end := now() + interval '1 year';
    END IF;

    SELECT settings INTO v_settings FROM public.companies WHERE id = p_company_id;
    v_settings := COALESCE(v_settings, '{}'::jsonb);
    v_settings := v_settings || jsonb_build_object(
      'billing_modality', v_billing_modality,
      'quoted_monthly_total', NULLIF(v_quote.meta->>'monthly_total', '')::numeric,
      'quoted_annual_total', v_quote.total,
      'hardware_monthly', NULLIF(v_quote.meta->>'monthly_hardware_fee', '')::numeric,
      'terminals_count', v_quote.terminals_count
    );

    UPDATE public.companies
    SET
      plan_type = v_plan,
      subscription_status = 'active',
      subscription_start_date = now(),
      subscription_end_date = v_sub_end,
      settings = v_settings,
      updated_at = now()
    WHERE id = p_company_id;

    INSERT INTO public.company_subscriptions (
      company_id,
      status,
      plan,
      trial_start,
      trial_end,
      updated_at
    )
    VALUES (
      p_company_id,
      'active',
      v_plan,
      now(),
      now(),
      now()
    )
    ON CONFLICT (company_id) DO UPDATE SET
      status = 'active',
      plan = EXCLUDED.plan,
      trial_end = now(),
      updated_at = now();
  ELSE
    v_plan := NULL;
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'quote_id', v_quote_id,
    'payment_status', v_new_payment_status,
    'activated', v_activated,
    'plan_type', v_plan
  );
END;
$$;

COMMENT ON FUNCTION public.activate_from_quote IS
  'Records a manual payment linked to a cotización and activates company + subscription when deposit threshold is met. plan_type comes from quote meta flags, not employee count.';
