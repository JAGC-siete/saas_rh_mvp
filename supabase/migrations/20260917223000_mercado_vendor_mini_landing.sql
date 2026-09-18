-- Mini landing de cada puesto: 5 productos, métodos de pago y galería.
-- El directorio público las lee; el admin las escribe con la ficha.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS products text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS payment_methods text[] NOT NULL DEFAULT ARRAY['efectivo', 'transferencia_bac']::text[],
  ADD COLUMN IF NOT EXISTS gallery jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_products_len,
  DROP CONSTRAINT IF EXISTS vendors_payment_methods_allowed,
  DROP CONSTRAINT IF EXISTS vendors_gallery_len;

ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_products_len CHECK (cardinality(products) <= 5),
  ADD CONSTRAINT vendors_payment_methods_allowed CHECK (
    cardinality(payment_methods) >= 1
    AND payment_methods <@ ARRAY['efectivo', 'transferencia_bac']::text[]
  ),
  ADD CONSTRAINT vendors_gallery_len CHECK (
    jsonb_typeof(gallery) = 'array'
    AND jsonb_array_length(gallery) <= 4
  );

COMMENT ON COLUMN public.vendors.products IS
  'Hasta 5 productos principales de la mini landing.';
COMMENT ON COLUMN public.vendors.payment_methods IS
  'efectivo y/o transferencia_bac. Se pintan como insignias de pago.';
COMMENT ON COLUMN public.vendors.gallery IS
  'Hasta 4 fotos {src, alt}. Producto y fachada del puesto.';

GRANT SELECT (
  id,
  name,
  slug,
  description,
  category,
  whatsapp,
  status,
  logo_url,
  stall_location,
  hours_note,
  products,
  payment_methods,
  gallery,
  featured,
  updated_at
) ON public.vendors TO anon;
