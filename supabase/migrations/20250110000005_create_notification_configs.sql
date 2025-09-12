-- Create notification configuration tables
-- These tables are referenced by the email notification system

-- Default notification configurations table
CREATE TABLE IF NOT EXISTS public.default_notification_configs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email_provider jsonb,
    whatsapp_provider jsonb,
    retry_attempts integer DEFAULT 1,
    retry_delay integer DEFAULT 1000,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT default_notification_configs_pkey PRIMARY KEY (id)
);

-- Company-specific notification configurations table
CREATE TABLE IF NOT EXISTS public.company_notification_configs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    email_provider jsonb,
    whatsapp_provider jsonb,
    retry_attempts integer DEFAULT 1,
    retry_delay integer DEFAULT 1000,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT company_notification_configs_pkey PRIMARY KEY (id),
    CONSTRAINT company_notification_configs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
    CONSTRAINT company_notification_configs_company_key UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE public.default_notification_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_notification_configs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_notification_configs_company_id ON public.company_notification_configs(company_id);

-- Add triggers for updated_at
CREATE TRIGGER update_default_notification_configs_updated_at 
    BEFORE UPDATE ON public.default_notification_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_notification_configs_updated_at 
    BEFORE UPDATE ON public.company_notification_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification configurations
INSERT INTO public.default_notification_configs (
    email_provider,
    whatsapp_provider,
    retry_attempts,
    retry_delay
) VALUES (
    '{
        "type": "resend",
        "from_email": "noreply@humanosisu.net",
        "from_name": "Humano Sisu",
        "timeout": 10000
    }'::jsonb,
    '{
        "type": "meta",
        "timeout": 10000
    }'::jsonb,
    3,
    2000
) ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL ON public.default_notification_configs TO authenticated;
GRANT ALL ON public.company_notification_configs TO authenticated;
