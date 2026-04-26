-- Migration: Add webhook configuration tracking columns to devices table
-- Date: 2025-12-01
-- Description: Add columns to track HTTP host ID and webhook configuration status

-- Add password_encrypted column if it doesn't exist (temporary until vault migration)
-- This allows the code to work with the current implementation
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'devices' 
    AND column_name = 'password_encrypted'
  ) THEN
    ALTER TABLE public.devices ADD COLUMN password_encrypted TEXT;
    -- Copy from vault_secret_id if it exists (temporary migration path)
    UPDATE public.devices 
    SET password_encrypted = vault_secret_id 
    WHERE password_encrypted IS NULL AND vault_secret_id IS NOT NULL;
  END IF;
END $$;

-- Add HTTP host ID column to track which httpHost ID is configured on the device
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS http_host_id TEXT DEFAULT '1';

-- Add webhook_configured flag to track if webhook has been successfully configured
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS webhook_configured BOOLEAN NOT NULL DEFAULT false;

-- Add last_webhook_test_at to track when the last webhook test was performed
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS last_webhook_test_at TIMESTAMPTZ;

-- Add webhook_test_result to store the last test result (JSONB for flexibility)
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS webhook_test_result JSONB;

-- Add index for webhook_configured for faster queries
CREATE INDEX IF NOT EXISTS idx_devices_webhook_configured ON public.devices(webhook_configured) WHERE webhook_configured = true;

-- Add comment to document the columns
COMMENT ON COLUMN public.devices.http_host_id IS 'HTTP host ID configured on the device (typically "1")';
COMMENT ON COLUMN public.devices.webhook_configured IS 'Whether the webhook has been successfully configured on the device via httpHosts';
COMMENT ON COLUMN public.devices.last_webhook_test_at IS 'Timestamp of the last webhook test performed';
COMMENT ON COLUMN public.devices.webhook_test_result IS 'Last webhook test result from POST /ISAPI/Event/notification/httpHosts/<ID>/test';

