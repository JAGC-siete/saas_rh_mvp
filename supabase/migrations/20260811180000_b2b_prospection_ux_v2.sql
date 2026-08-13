-- Prospection UX v2: research candidates + WhatsApp fields + researching status.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'b2b_prospect_run_status' AND e.enumlabel = 'researching'
  ) THEN
    ALTER TYPE public.b2b_prospect_run_status ADD VALUE 'researching';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'b2b_prospect_run_status' AND e.enumlabel = 'reviewed'
  ) THEN
    ALTER TYPE public.b2b_prospect_run_status ADD VALUE 'reviewed';
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.b2b_prospect_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.b2b_prospect_runs(id) ON DELETE CASCADE,
  comercio text NOT NULL,
  rubro text,
  telefono text,
  email text,
  email_normalized text,
  direccion text,
  confianza public.b2b_prospect_confidence NOT NULL DEFAULT 'media',
  fuentes text,
  notas text,
  selected boolean NOT NULL DEFAULT false,
  loaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT b2b_prospect_candidates_comercio_nonempty CHECK (length(trim(comercio)) > 0)
);

COMMENT ON TABLE public.b2b_prospect_candidates IS
  'Preliminary research findings for a run (step 2). Writes via SuperAdmin API only.';

CREATE UNIQUE INDEX IF NOT EXISTS b2b_prospect_candidates_run_email_uidx
  ON public.b2b_prospect_candidates (run_id, email_normalized)
  WHERE email_normalized IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS b2b_prospect_candidates_run_comercio_noemail_uidx
  ON public.b2b_prospect_candidates (run_id, lower(trim(comercio)))
  WHERE email_normalized IS NULL;

CREATE INDEX IF NOT EXISTS idx_b2b_prospect_candidates_run_id
  ON public.b2b_prospect_candidates (run_id);

ALTER TABLE public.b2b_prospect_contacts
  ADD COLUMN IF NOT EXISTS whatsapp_link text,
  ADD COLUMN IF NOT EXISTS whatsapp_message text,
  ADD COLUMN IF NOT EXISTS whatsapp_generated_at timestamptz;

ALTER TABLE public.b2b_prospect_runs
  ADD COLUMN IF NOT EXISTS research_status text,
  ADD COLUMN IF NOT EXISTS research_error text,
  ADD COLUMN IF NOT EXISTS research_completed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'b2b_prospect_candidates_set_updated_at') THEN
    CREATE TRIGGER b2b_prospect_candidates_set_updated_at
      BEFORE UPDATE ON public.b2b_prospect_candidates
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

ALTER TABLE public.b2b_prospect_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_select_b2b_prospect_candidates"
  ON public.b2b_prospect_candidates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );
