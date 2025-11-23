-- 1. Create enums for status types
CREATE TYPE public.affiliate_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.commission_status AS ENUM ('pending', 'paid', 'cancelled');

-- 2. Create the affiliates table
CREATE TABLE public.affiliates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
    referral_code text NOT NULL UNIQUE,
    status public.affiliate_status DEFAULT 'pending'::public.affiliate_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
COMMENT ON TABLE public.affiliates IS 'Stores information about affiliate partners.';

-- 3. Add referral tracking to the companies table
ALTER TABLE public.companies
ADD COLUMN referred_by_affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.companies.referred_by_affiliate_id IS 'Tracks which affiliate referred this company.';

-- 4. Create the commissions table
CREATE TABLE public.commissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    affiliate_id uuid NOT NULL REFERENCES public.affiliates(id),
    referred_company_id uuid NOT NULL REFERENCES public.companies(id),
    source_payment_id text, -- Can be linked to a payment table later, e.g., paypal_transactions.paypal_payment_id
    amount numeric NOT NULL,
    status public.commission_status DEFAULT 'pending'::public.commission_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone
);
COMMENT ON TABLE public.commissions IS 'Tracks commissions earned by affiliates for successful referrals.';
