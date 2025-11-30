-- 1) Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_paid_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if a company subscription is newly marked as 'active'
  -- and was not active before (to prevent re-triggering).
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status != 'active') THEN
    -- Check if the company was referred by an affiliate
    IF EXISTS (SELECT 1 FROM public.companies WHERE id = NEW.company_id AND referred_by_affiliate_id IS NOT NULL) THEN
      -- Call the commission calculation function
      PERFORM public.create_commission_for_new_deal(NEW.company_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Create the trigger on the company_subscriptions table
-- Drop the trigger first if it exists to make the script idempotent
DROP TRIGGER IF EXISTS on_subscription_activated ON public.company_subscriptions;

CREATE TRIGGER on_subscription_activated
  AFTER INSERT OR UPDATE OF status ON public.company_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_paid_subscription();

COMMENT ON TRIGGER on_subscription_activated ON public.company_subscriptions
  IS 'When a company subscription becomes active, trigger the commission creation process.';

