-- Corrige la documentación del destino de avisos: public.companies no tiene columna
-- de correo, así que el respaldo real es el correo del admin que creó la página.
-- Los leads del inquilino nunca se desvían a un buzón nuestro.

COMMENT ON COLUMN public.landing_pages.lead_notify_email IS
  'Destino del aviso Resend cuando la landing captura un lead. '
  'NULL = /api/landings/lead usa el correo del usuario en created_by; si tampoco existe, '
  'el lead se guarda igual y queda solo en el panel (se registra un warning).';
