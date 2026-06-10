-- /info TOFU: track when informational pack was sent (sequence welcome follows after delay)
ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS info_pack_sent_at timestamptz;

COMMENT ON COLUMN public.marketing_leads.info_pack_sent_at IS
  'When the /info informational email was sent; sequence welcome starts after INFO_SEQUENCE_WELCOME_DELAY_HOURS.';

CREATE INDEX IF NOT EXISTS idx_marketing_leads_info_pack_pending
  ON public.marketing_leads (info_pack_sent_at, current_step)
  WHERE info_pack_sent_at IS NOT NULL AND status = 'active';
