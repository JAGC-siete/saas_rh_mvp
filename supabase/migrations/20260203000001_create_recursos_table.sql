-- Migration: Recursos (articles) table for /recursos content from Supabase
-- Date: 2026-02-03
-- Description: Create public.recursos table for article content; RLS allows public read, write via service_role/admin.

CREATE TABLE IF NOT EXISTS public.recursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  date_published timestamptz NOT NULL DEFAULT now(),
  date_modified timestamptz,
  image text,
  author text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.recursos IS 'Stores /recursos articles (title, description, content as markdown). Read by public; write via admin API.';

-- Trigger for updated_at (reuse existing set_updated_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'recursos_set_updated_at'
  ) THEN
    CREATE TRIGGER recursos_set_updated_at
      BEFORE UPDATE ON public.recursos
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_recursos_slug ON public.recursos(slug);
CREATE INDEX IF NOT EXISTS idx_recursos_date_published ON public.recursos(date_published DESC);

-- Enable RLS
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;

-- Grants: public read; write via service_role (admin API uses service role)
GRANT SELECT ON public.recursos TO anon, authenticated;
GRANT INSERT ON public.recursos TO service_role;
GRANT UPDATE ON public.recursos TO service_role;
GRANT DELETE ON public.recursos TO service_role;

-- RLS policies: anyone can read; only service_role can write (API uses createAdminClient)
DROP POLICY IF EXISTS "recursos_public_select" ON public.recursos;
CREATE POLICY "recursos_public_select"
  ON public.recursos
  FOR SELECT TO anon, authenticated
  USING (true);

-- Write policies: service_role bypasses RLS by default; add policy for authenticated super_admin if you want dashboard writes later
-- For now, INSERT/UPDATE/DELETE are only via service_role (no policy needed; grant is enough when using service role key).
