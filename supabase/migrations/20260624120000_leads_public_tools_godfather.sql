-- Godfather offer tracking for calculadora deducciones (reply-trigger PDF)

ALTER TABLE public.leads_public_tools
  ADD COLUMN IF NOT EXISTS godfather_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS godfather_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS leads_public_tools_godfather_pending_idx
  ON public.leads_public_tools (godfather_pending)
  WHERE godfather_pending = true AND godfather_sent_at IS NULL;

COMMENT ON COLUMN public.leads_public_tools.godfather_pending IS
  'True after deduction PDF sent (HND funnel); awaiting Godfather keyword reply.';
COMMENT ON COLUMN public.leads_public_tools.godfather_sent_at IS
  'When the Godfather comparison PDF was auto-sent after inbound reply.';
