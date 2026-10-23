-- Renewal payments (monthly plans of the new ladder are paid every month).
--
-- Until now every payment that activated a company set
-- subscription_end_date = now() + 1 month / 1 year and reset the start date, so:
--   * paying a few days early lost the days left in the current period;
--   * the annual 50/50 balance payment re-ran the activation too.
-- A new payment_kind 'renewal' is explicit (the admin picks it): it extends the
-- subscription from max(current end, now), keeps the start date and keeps the
-- company's current paid plan unless the caller passes one. Deposit and
-- subscription payments behave exactly as before.
--
-- Contains DROP CONSTRAINT, so it is run by hand in the SQL editor.

ALTER TABLE public.manual_payments DROP CONSTRAINT manual_payments_payment_kind_check;
ALTER TABLE public.manual_payments ADD CONSTRAINT manual_payments_payment_kind_check
  CHECK (payment_kind = ANY (ARRAY['deposit'::text, 'subscription'::text, 'adjustment'::text, 'renewal'::text]));

CREATE OR REPLACE FUNCTION public.activate_from_quote(
  p_company_id uuid,
  p_amount_hnl numeric,
  p_reference text,
  p_created_by uuid DEFAULT NULL::uuid,
  p_quote_id uuid DEFAULT NULL::uuid,
  p_paid_at timestamp with time zone DEFAULT now(),
  p_payment_kind text DEFAULT 'deposit'::text,
  p_plan_type text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quote_id uuid;
  v_quote public.cotizaciones%ROWTYPE;
  v_payment_id uuid;
  v_plan text;
  v_billing_modality text;
  v_period interval;
  v_sub_end timestamptz;
  v_new_payment_status text;
  v_settings jsonb;
  v_activated boolean := false;
  v_is_renewal boolean := false;
  v_deposit_threshold numeric;
  v_current_plan text;
  v_current_end timestamptz;
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

  IF COALESCE(p_payment_kind, 'deposit') = 'renewal' THEN
    v_new_payment_status := 'paid';
    v_activated := true;
    v_is_renewal := true;
  ELSIF v_deposit_threshold IS NOT NULL AND p_amount_hnl >= v_deposit_threshold THEN
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
    v_billing_modality := COALESCE(v_quote.meta->>'billing_modality', 'annual');
    v_period := CASE WHEN v_billing_modality = 'monthly' THEN interval '1 month' ELSE interval '1 year' END;

    SELECT plan_type, subscription_end_date, settings
    INTO v_current_plan, v_current_end, v_settings
    FROM public.companies
    WHERE id = p_company_id;

    IF v_is_renewal THEN
      -- Keep the plan the company has (it may have been changed by hand) unless the caller sets one.
      v_plan := COALESCE(
        NULLIF(trim(p_plan_type), ''),
        CASE WHEN v_current_plan IN ('basic', 'premium', 'enterprise') THEN v_current_plan END,
        public.ventas_quote_to_plan_type(v_quote.meta, v_quote.employees_count)
      );
      v_sub_end := GREATEST(COALESCE(v_current_end, now()), now()) + v_period;
    ELSE
      v_plan := COALESCE(
        NULLIF(trim(p_plan_type), ''),
        public.ventas_quote_to_plan_type(v_quote.meta, v_quote.employees_count)
      );
      v_sub_end := now() + v_period;
    END IF;

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
      subscription_start_date = CASE
        WHEN v_is_renewal THEN COALESCE(subscription_start_date, now())
        ELSE now()
      END,
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
      trial_end = CASE WHEN v_is_renewal THEN company_subscriptions.trial_end ELSE now() END,
      updated_at = now();
  ELSE
    v_plan := NULL;
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'quote_id', v_quote_id,
    'payment_status', v_new_payment_status,
    'activated', v_activated,
    'plan_type', v_plan,
    'subscription_end_date', CASE WHEN v_activated THEN v_sub_end END
  );
END;
$function$;

-- CREATE OR REPLACE keeps grants; repeat them so this file is safe on its own.
REVOKE EXECUTE ON FUNCTION public.activate_from_quote(uuid, numeric, text, uuid, uuid, timestamptz, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_from_quote(uuid, numeric, text, uuid, uuid, timestamptz, text, text)
  TO service_role;
