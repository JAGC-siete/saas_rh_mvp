-- Solicitud de registro de local en página web.
-- Extiende vendor_applications: WhatsApp, plan de presencia y autorización.
-- No es ficha publicada. VIP no implica cobro registrado ni alta en vendors.

ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS presence_plan text,
  ADD COLUMN IF NOT EXISTS authorized_at timestamptz,
  ADD COLUMN IF NOT EXISTS authorization_text text;

-- Solicitudes anteriores al formulario papel: básico, sin WhatsApp real.
UPDATE public.vendor_applications
SET
  whatsapp = COALESCE(NULLIF(trim(whatsapp), ''), '00000000'),
  presence_plan = COALESCE(NULLIF(trim(presence_plan), ''), 'basic'),
  authorized_at = COALESCE(authorized_at, created_at)
WHERE whatsapp IS NULL
   OR presence_plan IS NULL
   OR authorized_at IS NULL;

ALTER TABLE public.vendor_applications
  ALTER COLUMN whatsapp SET NOT NULL,
  ALTER COLUMN presence_plan SET NOT NULL,
  ALTER COLUMN authorized_at SET NOT NULL,
  ALTER COLUMN presence_plan SET DEFAULT 'basic';

COMMENT ON TABLE public.vendor_applications IS
  'Solicitudes de registro de local en la página web. No es ficha publicada. VIP no implica cobro registrado. Insert solo con service role.';
COMMENT ON COLUMN public.vendor_applications.whatsapp IS
  'Teléfono/WhatsApp de la solicitud. No se expone en el directorio hasta el alta manual de la ficha.';
COMMENT ON COLUMN public.vendor_applications.presence_plan IS
  'Intención de presencia: basic (gratuito) o featured_vip (aportación anual). No implica cobro registrado ni ficha publicada.';
COMMENT ON COLUMN public.vendor_applications.authorized_at IS
  'Momento en que el locatario autorizó publicar los datos del comercio. No se guarda un boolean suelto.';
COMMENT ON COLUMN public.vendor_applications.authorization_text IS
  'Texto legal exacto mostrado al autorizar, para auditoría.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_applications_whatsapp_len'
  ) THEN
    ALTER TABLE public.vendor_applications
      ADD CONSTRAINT vendor_applications_whatsapp_len
      CHECK (length(trim(whatsapp)) BETWEEN 8 AND 30);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_applications_whatsapp_digits'
  ) THEN
    ALTER TABLE public.vendor_applications
      ADD CONSTRAINT vendor_applications_whatsapp_digits
      CHECK (length(regexp_replace(whatsapp, '\D', '', 'g')) >= 7);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_applications_presence_plan_allowed'
  ) THEN
    ALTER TABLE public.vendor_applications
      ADD CONSTRAINT vendor_applications_presence_plan_allowed
      CHECK (presence_plan IN ('basic', 'featured_vip'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vendor_applications_authorization_text_len'
  ) THEN
    ALTER TABLE public.vendor_applications
      ADD CONSTRAINT vendor_applications_authorization_text_len
      CHECK (
        authorization_text IS NULL
        OR length(trim(authorization_text)) BETWEEN 20 AND 500
      );
  END IF;
END$$;

ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.vendor_applications FROM anon;
REVOKE INSERT, DELETE, TRUNCATE ON public.vendor_applications FROM authenticated;
GRANT SELECT, UPDATE ON public.vendor_applications TO authenticated;
