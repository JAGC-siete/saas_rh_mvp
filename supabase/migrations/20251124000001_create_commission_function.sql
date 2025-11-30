CREATE OR REPLACE FUNCTION public.create_commission_for_new_deal(company_id_in uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affiliate_record RECORD;
  yearly_stats RECORD;
  employee_count INT;
  license_cost NUMERIC;
  new_commission_rate NUMERIC;
  bonus_rate NUMERIC := 0.0;
  final_commission_amount NUMERIC;
  deals_before_deadline INT;
  current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- 1. Find the affiliate who referred this company
  SELECT id, referred_by_affiliate_id INTO affiliate_record
  FROM public.companies
  WHERE id = company_id_in;

  -- Exit if the company was not referred by anyone
  IF affiliate_record.referred_by_affiliate_id IS NULL THEN
    RAISE NOTICE 'Company % was not referred by an affiliate.', company_id_in;
    RETURN;
  END IF;

  -- 2. Determine the license cost based on employee count
  SELECT COUNT(*) INTO employee_count
  FROM public.employees
  WHERE company_id = company_id_in;

  CASE
    WHEN employee_count BETWEEN 0 AND 30 THEN license_cost := 1440;
    WHEN employee_count BETWEEN 31 AND 100 THEN license_cost := 1860;
    WHEN employee_count BETWEEN 101 AND 200 THEN license_cost := 2340;
    WHEN employee_count BETWEEN 201 AND 300 THEN license_cost := 3240;
    ELSE license_cost := 3240; -- Default to max tier for > 300
  END CASE;

  -- 3. Get or create the affiliate's stats for the current year
  INSERT INTO public.affiliate_yearly_stats (affiliate_id, year)
  VALUES (affiliate_record.referred_by_affiliate_id, current_year)
  ON CONFLICT (affiliate_id, year) DO NOTHING;

  SELECT * INTO yearly_stats
  FROM public.affiliate_yearly_stats
  WHERE affiliate_id = affiliate_record.referred_by_affiliate_id AND year = current_year;

  -- 4. Increment deal count and update commission rate (idempotent)
  -- Check if a commission for this company already exists to prevent double counting
  IF NOT EXISTS (SELECT 1 FROM public.commissions WHERE referred_company_id = company_id_in) THEN
    yearly_stats.deals_closed := yearly_stats.deals_closed + 1;
  END IF;

  -- Rate = 10% base + 1% for each deal *after the first*, capped at 20%
  new_commission_rate := LEAST(0.20, 0.10 + (GREATEST(0, yearly_stats.deals_closed - 1) * 0.01));

  -- 5. Check for the early performance bonus for 2026
  IF current_year = 2026 THEN
    SELECT COUNT(DISTINCT referred_company_id) INTO deals_before_deadline
    FROM public.commissions
    WHERE affiliate_id = affiliate_record.referred_by_affiliate_id
      AND created_at < '2026-02-01'::timestamptz;

    IF deals_before_deadline >= 10 THEN
      yearly_stats.has_early_bonus := true;
    END IF;
  END IF;

  IF yearly_stats.has_early_bonus THEN
    bonus_rate := 0.05;
  END IF;

  -- Update the stats record
  UPDATE public.affiliate_yearly_stats
  SET
    deals_closed = yearly_stats.deals_closed,
    commission_rate = new_commission_rate,
    has_early_bonus = yearly_stats.has_early_bonus,
    updated_at = now()
  WHERE id = yearly_stats.id;

  -- 6. Calculate final commission amount
  final_commission_amount := license_cost * (new_commission_rate + bonus_rate);

  -- 7. Insert the new commission record (idempotent)
  INSERT INTO public.commissions (affiliate_id, referred_company_id, amount, status)
  VALUES (affiliate_record.referred_by_affiliate_id, company_id_in, final_commission_amount, 'pending')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Commission created for company % and affiliate %', company_id_in, affiliate_record.referred_by_affiliate_id;

END;
$$;

