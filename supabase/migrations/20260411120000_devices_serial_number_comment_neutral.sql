-- Neutralize column comment after ZKTeco Push SDK removal (column retained for optional vendor identifiers).
COMMENT ON COLUMN public.devices.serial_number IS 'Optional device serial number when distinct from MAC (vendor-specific identifier, if used).';
