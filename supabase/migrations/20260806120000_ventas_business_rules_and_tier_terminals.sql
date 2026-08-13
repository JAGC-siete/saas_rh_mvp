-- Reglas globales de modalidades/hardware + override de terminales por rango.

BEGIN;

ALTER TABLE public.config_ventas
  ADD COLUMN IF NOT EXISTS business_rules jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.config_ventas_pricing_tiers
  ADD COLUMN IF NOT EXISTS annual_terminal_mode text NOT NULL DEFAULT 'auto';

ALTER TABLE public.config_ventas_pricing_tiers
  ADD COLUMN IF NOT EXISTS included_terminals_max int NULL;

ALTER TABLE public.config_ventas_pricing_tiers
  DROP CONSTRAINT IF EXISTS config_ventas_pricing_tiers_annual_terminal_mode_chk;

ALTER TABLE public.config_ventas_pricing_tiers
  ADD CONSTRAINT config_ventas_pricing_tiers_annual_terminal_mode_chk
  CHECK (annual_terminal_mode IN ('auto', 'included', 'sale'));

ALTER TABLE public.config_ventas_pricing_tiers
  DROP CONSTRAINT IF EXISTS config_ventas_pricing_tiers_included_terminals_max_chk;

ALTER TABLE public.config_ventas_pricing_tiers
  ADD CONSTRAINT config_ventas_pricing_tiers_included_terminals_max_chk
  CHECK (included_terminals_max IS NULL OR included_terminals_max >= 1);

COMMENT ON COLUMN public.config_ventas.business_rules IS
  'JSON: monthly_min_employees, annual_terminals_included_min_employees, max_auto_quote_terminals, hardware_sale_unit_price, hardware_continuity{base_monthly,incremental_discount,floor_monthly}';

COMMENT ON COLUMN public.config_ventas_pricing_tiers.annual_terminal_mode IS
  'auto | included | sale — override de terminales en plan anual para este rango';

COMMENT ON COLUMN public.config_ventas_pricing_tiers.included_terminals_max IS
  'Tope de terminales incluidas (NULL = usar max_auto_quote_terminals global)';

COMMIT;
