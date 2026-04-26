-- Migration: Add serial_number column to devices table for ZKTeco support
-- Date: 2026-02-26
-- Description: ZKTeco Push SDK uses SN (serial number) as device identifier instead of MAC.
-- device_type = 'zkteco' for ZKTeco devices.

-- Add serial_number column (nullable, used by ZKTeco devices)
ALTER TABLE public.devices
ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- Create index for faster SN lookups
CREATE INDEX IF NOT EXISTS idx_devices_serial_number
ON public.devices(serial_number)
WHERE serial_number IS NOT NULL;

-- Unique index on company_id + serial_number (SN is stable identifier per ZKTeco device)
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_company_serial
ON public.devices(company_id, serial_number)
WHERE serial_number IS NOT NULL;

COMMENT ON COLUMN public.devices.serial_number IS 'Serial number of the device (ZKTeco Push SDK uses SN as identifier; Hikvision uses MAC)';
