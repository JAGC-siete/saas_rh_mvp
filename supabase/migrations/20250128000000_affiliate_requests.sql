-- Migration: Affiliate Requests System (Similar to Mail List)
-- Date: 2025-01-28
-- Description: Create affiliate_requests table for email-first affiliate registration flow

-- 1) Enum para status de affiliate requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'affiliate_request_status') THEN
    CREATE TYPE public.affiliate_request_status AS ENUM (
      'pending_email_confirmation',
      'pending_approval',
      'approved',
      'rejected'
    );
  END IF;
END$$;

-- 2) Tabla affiliate_requests
CREATE TABLE IF NOT EXISTS public.affiliate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  confirmation_token text NOT NULL UNIQUE,
  status public.affiliate_request_status NOT NULL DEFAULT 'pending_email_confirmation',
  questionnaire_data jsonb DEFAULT '{}',
  terms_accepted boolean NOT NULL DEFAULT false,
  terms_accepted_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE SET NULL,
  source text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.affiliate_requests IS 'Stores affiliate registration requests before user account creation.';

-- 3) Trigger para updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'affiliate_requests_set_updated_at'
  ) THEN
    CREATE TRIGGER affiliate_requests_set_updated_at
      BEFORE UPDATE ON public.affiliate_requests
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END$$;

-- 4) Índices útiles
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_email ON public.affiliate_requests(email);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_token ON public.affiliate_requests(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_status ON public.affiliate_requests(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_user_id ON public.affiliate_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_affiliate_id ON public.affiliate_requests(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_requests_created_at ON public.affiliate_requests(created_at);

-- 5) Modificar tabla affiliates para hacer user_id nullable y agregar affiliate_request_id
DO $$
BEGIN
  -- Hacer user_id nullable
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'affiliates' 
    AND column_name = 'user_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.affiliates
      ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  -- Agregar affiliate_request_id si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'affiliates' 
    AND column_name = 'affiliate_request_id'
  ) THEN
    ALTER TABLE public.affiliates
      ADD COLUMN affiliate_request_id uuid REFERENCES public.affiliate_requests(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_affiliates_affiliate_request_id 
      ON public.affiliates(affiliate_request_id);
  END IF;
END$$;

-- 6) Enable Row Level Security (RLS)
ALTER TABLE public.affiliate_requests ENABLE ROW LEVEL SECURITY;

-- 7) Grant permissions
GRANT INSERT ON public.affiliate_requests TO anon, authenticated;
GRANT SELECT ON public.affiliate_requests TO anon, authenticated;
GRANT UPDATE ON public.affiliate_requests TO anon, authenticated;

-- 8) Create RLS policies
DROP POLICY IF EXISTS "public_insert" ON public.affiliate_requests;
DROP POLICY IF EXISTS "public_select_by_token" ON public.affiliate_requests;
DROP POLICY IF EXISTS "public_update_by_token" ON public.affiliate_requests;
DROP POLICY IF EXISTS "admin_select_all" ON public.affiliate_requests;

-- Policy: Cualquiera puede insertar (público)
CREATE POLICY "public_insert"
  ON public.affiliate_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Policy: Cualquiera puede leer por token (necesario para cuestionario)
CREATE POLICY "public_select_by_token"
  ON public.affiliate_requests
  FOR SELECT TO anon, authenticated
  USING (true);

-- Policy: Cualquiera puede actualizar con token válido (para enviar cuestionario)
CREATE POLICY "public_update_by_token"
  ON public.affiliate_requests
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Admins pueden ver todas las solicitudes
CREATE POLICY "admin_select_all"
  ON public.affiliate_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'company_admin')
    )
  );

-- Policy: Admins pueden actualizar todas las solicitudes
CREATE POLICY "admin_update_all"
  ON public.affiliate_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'company_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('super_admin', 'company_admin')
    )
  );








