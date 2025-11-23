-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'affiliate_status') THEN
    CREATE TYPE public.affiliate_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_status') THEN
    CREATE TYPE public.commission_status AS ENUM ('pending', 'paid', 'cancelled');
  END IF;
END$$;

-- 2) Tabla affiliates
CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  referral_code text NOT NULL UNIQUE,
  status public.affiliate_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.affiliates IS 'Stores information about affiliate partners.';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'affiliates_set_updated_at'
  ) THEN
    CREATE TRIGGER affiliates_set_updated_at
      BEFORE UPDATE ON public.affiliates
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_referral_code ON public.affiliates(referral_code);

-- 3) Columna de referencia en companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'referred_by_affiliate_id'
  ) THEN
    ALTER TABLE public.companies
      ADD COLUMN referred_by_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;
  END IF;
END$$;
COMMENT ON COLUMN public.companies.referred_by_affiliate_id IS 'Tracks which affiliate referred this company.';

CREATE INDEX IF NOT EXISTS idx_companies_referred_by_affiliate_id
  ON public.companies(referred_by_affiliate_id);

-- 4) Tabla commissions
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id),
  referred_company_id uuid NOT NULL REFERENCES public.companies(id),
  source_payment_id text,
  amount numeric(12,2) NOT NULL,
  status public.commission_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamp with time zone
);
COMMENT ON TABLE public.commissions IS 'Tracks commissions earned by affiliates for successful referrals.';

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- 6. Grant basic permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.affiliates TO authenticated;
GRANT SELECT ON public.commissions TO authenticated;

-- 7. Create RLS policies
-- Drop existing policies if they exist, to make the script re-runnable
DROP POLICY IF EXISTS "own_affiliate_row" ON public.affiliates;
DROP POLICY IF EXISTS "own_affiliate_update" ON public.affiliates;
DROP POLICY IF EXISTS "see_own_commissions" ON public.commissions;

-- Policy: Authenticated users can see their own affiliate row
CREATE POLICY "own_affiliate_row"
  ON public.affiliates
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Policy: Authenticated users can update their own affiliate row
CREATE POLICY "own_affiliate_update"
  ON public.affiliates
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Policy: Authenticated users can see commissions related to their affiliate ID
CREATE POLICY "see_own_commissions"
  ON public.commissions
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = (SELECT auth.uid())));

-- 8. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_id ON public.commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_referred_company_id ON public.commissions(referred_company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON public.commissions(status);