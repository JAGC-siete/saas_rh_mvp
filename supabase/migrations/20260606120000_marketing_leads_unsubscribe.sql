-- P1: Unsubscribe tokens for marketing_leads (CAN-SPAM / one-click baja)

ALTER TABLE public.marketing_leads
  ADD COLUMN IF NOT EXISTS unsubscribe_token text,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;

UPDATE public.marketing_leads
SET unsubscribe_token = encode(gen_random_bytes(24), 'hex')
WHERE unsubscribe_token IS NULL;

ALTER TABLE public.marketing_leads
  ALTER COLUMN unsubscribe_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketing_leads_unsubscribe_token
  ON public.marketing_leads(unsubscribe_token);

COMMENT ON COLUMN public.marketing_leads.unsubscribe_token IS
  'Opaque token for one-click unsubscribe links in sequence emails.';
COMMENT ON COLUMN public.marketing_leads.unsubscribed_at IS
  'Timestamp when the lead opted out of marketing emails.';
