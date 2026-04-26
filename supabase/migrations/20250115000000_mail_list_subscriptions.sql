-- Migration: Mail List Subscriptions
-- Date: 2025-01-15
-- Description: Create mail list subscription system for lead generation, reusing affiliate program structure

-- 1) Enum para status (similar a affiliate_status)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mail_list_status') THEN
    CREATE TYPE public.mail_list_status AS ENUM ('pending', 'confirmed', 'unsubscribed');
  END IF;
END$$;

-- 2) Tabla mail_list_subscriptions (similar estructura a affiliates)
CREATE TABLE IF NOT EXISTS public.mail_list_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  confirmation_token text NOT NULL UNIQUE,
  status public.mail_list_status NOT NULL DEFAULT 'pending',
  source text, -- 'landing', 'footer', etc.
  metadata jsonb DEFAULT '{}',
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.mail_list_subscriptions IS 'Stores email subscriptions for lead generation with double opt-in confirmation.';

-- 3) Trigger para updated_at (reutilizando función existente)
-- La función set_updated_at() ya existe de affiliates, solo creamos el trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'mail_list_set_updated_at'
  ) THEN
    CREATE TRIGGER mail_list_set_updated_at
      BEFORE UPDATE ON public.mail_list_subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 4) Índices útiles (similar a affiliates)
CREATE INDEX IF NOT EXISTS idx_mail_list_email ON public.mail_list_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_mail_list_token ON public.mail_list_subscriptions(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_mail_list_status ON public.mail_list_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_mail_list_created_at ON public.mail_list_subscriptions(created_at);

-- 5) Enable Row Level Security (RLS)
ALTER TABLE public.mail_list_subscriptions ENABLE ROW LEVEL SECURITY;

-- 6) Grant permissions (público para insertar, limitado para leer)
GRANT INSERT ON public.mail_list_subscriptions TO anon, authenticated;
GRANT SELECT ON public.mail_list_subscriptions TO anon, authenticated;
GRANT UPDATE ON public.mail_list_subscriptions TO anon, authenticated;

-- 7) Create RLS policies (adaptadas para acceso público)
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "public_insert" ON public.mail_list_subscriptions;
DROP POLICY IF EXISTS "public_select_by_token" ON public.mail_list_subscriptions;
DROP POLICY IF EXISTS "public_update_by_token" ON public.mail_list_subscriptions;
DROP POLICY IF EXISTS "admin_select_all" ON public.mail_list_subscriptions;

-- Policy: Cualquiera puede insertar (público)
CREATE POLICY "public_insert"
  ON public.mail_list_subscriptions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Policy: Cualquiera puede leer (necesario para confirmación/unsubscribe por token)
CREATE POLICY "public_select_by_token"
  ON public.mail_list_subscriptions
  FOR SELECT TO anon, authenticated
  USING (true);

-- Policy: Cualquiera puede actualizar con token válido (para confirmar/unsubscribe)
CREATE POLICY "public_update_by_token"
  ON public.mail_list_subscriptions
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Admins pueden ver todas las suscripciones
CREATE POLICY "admin_select_all"
  ON public.mail_list_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'company_admin')
    )
  );

