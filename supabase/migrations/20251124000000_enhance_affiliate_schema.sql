-- 1) Affiliate Yearly Stats Table
-- This table tracks an affiliate's performance metrics for a given year.
CREATE TABLE IF NOT EXISTS public.affiliate_yearly_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    affiliate_id uuid NOT NULL REFERENCES public.affiliates(id),
    year integer NOT NULL,
    deals_closed integer NOT NULL DEFAULT 0,
    commission_rate numeric(4, 2) NOT NULL DEFAULT 0.10, -- Starts at 10%
    has_early_bonus boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT affiliate_yearly_stats_affiliate_id_year_key UNIQUE (affiliate_id, year)
);
COMMENT ON TABLE public.affiliate_yearly_stats IS 'Tracks affiliate performance and commission tiers on a yearly basis.';

-- Enable RLS for the new table
ALTER TABLE public.affiliate_yearly_stats ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users (affiliates)
GRANT SELECT ON public.affiliate_yearly_stats TO authenticated;

-- Policy: Affiliates can only see their own yearly stats.
CREATE POLICY "own_yearly_stats_row"
  ON public.affiliate_yearly_stats
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = (SELECT auth.uid())));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_affiliate_yearly_stats_affiliate_id_year ON public.affiliate_yearly_stats(affiliate_id, year);

