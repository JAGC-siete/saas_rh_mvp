-- Tabla para almacenar la configuración de dispositivos biométricos
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'hikvision',
    ip_address TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 80,
    username TEXT NOT NULL,
    -- La contraseña debe ser encriptada y almacenada en Supabase Vault.
    -- Esta columna es un placeholder para la referencia al secret.
    vault_secret_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'error', 'unknown')),
    last_seen_at TIMESTAMPTZ,
    webhook_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_company_ip_port UNIQUE(company_id, ip_address, port)
);

-- Habilitar RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
-- Solo los super administradores pueden ver todos los dispositivos.
CREATE POLICY "Super admins can view all devices"
ON public.devices FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'super_admin'
);

-- Los administradores de la compañía pueden ver los dispositivos de su compañía.
CREATE POLICY "Company admins can view their own devices"
ON public.devices FOR SELECT
TO authenticated
USING (
  company_id = (SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid())
);

-- Políticas para INSERT, UPDATE, DELETE (restringidas a super administradores por ahora)
CREATE POLICY "Super admins can manage devices"
ON public.devices FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'super_admin'
)
WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE user_id = auth.uid()) = 'super_admin'
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_devices_company_id ON public.devices(company_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON public.devices(status);

-- Crea el trigger para actualizar automáticamente el campo updated_at,
-- usando una función que ya existe en el esquema.
CREATE TRIGGER handle_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

