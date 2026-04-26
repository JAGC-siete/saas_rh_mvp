-- Migration: Add mac_address column to devices table
-- Date: 2025-12-02
-- Description: Add MAC address as stable identifier for devices (per Hikvision manual recommendation)
-- MAC address is more stable than IP (which can change with DHCP)

-- Add mac_address column (nullable, can be populated from heartbeat events)
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS mac_address TEXT;

-- Create index for faster MAC lookups
CREATE INDEX IF NOT EXISTS idx_devices_mac_address 
ON public.devices(mac_address) 
WHERE mac_address IS NOT NULL;

-- Create unique index on company_id + mac_address (MAC is stable identifier per device)
-- This allows same MAC in different companies but unique within a company
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_company_mac 
ON public.devices(company_id, mac_address) 
WHERE mac_address IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.devices.mac_address IS 'MAC address of the device (stable identifier, recommended by Hikvision manual over IP which can change with DHCP)';

