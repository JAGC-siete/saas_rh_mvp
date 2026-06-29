-- Permiso granular: reportes de asistencia para managers Kevin y Lorena (Gastrocueva).
-- No otorga nómina ni can_export_reports genérico.

UPDATE user_profiles
SET permissions = COALESCE(permissions, '{}'::jsonb) || jsonb_build_object(
  'can_export_attendance_reports', true,
  'can_view_attendance_reports', true
),
updated_at = now()
WHERE company_id = '48ab60e4-83ff-4a76-9310-cf32e076d1a3'
  AND id IN (
    '2bb42e5a-c6b0-4271-963e-b52d1ee4bae5', -- kevincuevaholding@gmail.com
    '262f7de7-b834-45ec-8e74-b247565e2286'  -- lorenacuevaholding@gmail.com
  );
