-- Mission choices from interactive pain-point emails (/info/m/[id])

CREATE TABLE IF NOT EXISTS public.marketing_mission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
  mission_id smallint NOT NULL CHECK (mission_id >= 1 AND mission_id <= 5),
  choice text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_mission_events_lead_mission_unique UNIQUE (lead_id, mission_id)
);

COMMENT ON TABLE public.marketing_mission_events IS
  'One recorded choice per mission per marketing lead (email micro-decision tracking).';

CREATE INDEX IF NOT EXISTS idx_marketing_mission_events_lead_id
  ON public.marketing_mission_events (lead_id);

CREATE INDEX IF NOT EXISTS idx_marketing_mission_events_mission_choice
  ON public.marketing_mission_events (mission_id, choice);

ALTER TABLE public.marketing_mission_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_marketing_mission_events"
  ON public.marketing_mission_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'company_admin')
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'marketing_mission_events_set_updated_at'
  ) THEN
    CREATE TRIGGER marketing_mission_events_set_updated_at
      BEFORE UPDATE ON public.marketing_mission_events
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;
