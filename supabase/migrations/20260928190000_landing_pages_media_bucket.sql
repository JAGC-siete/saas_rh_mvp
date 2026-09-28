-- Fotos públicas de las landings /p/*. Escritura solo con service role (URL firmada).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'landing-pages',
  'landing-pages',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS landing_pages_media_public_read ON storage.objects;
CREATE POLICY landing_pages_media_public_read
  ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'landing-pages');
