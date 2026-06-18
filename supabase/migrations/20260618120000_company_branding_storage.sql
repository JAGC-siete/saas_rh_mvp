-- Company branding assets (logo) in HR_BUCKET/companies/{company_id}/branding/

ALTER TABLE public.company_metadata
  ADD COLUMN IF NOT EXISTS reports_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.company_metadata.reports_metadata IS
  'Report branding metadata. branding.logo_storage_path points to HR_BUCKET object.';

-- SELECT: super_admin, or same company (authenticated users in tenant)
DROP POLICY IF EXISTS "Access company branding files" ON storage.objects;
CREATE POLICY "Access company branding files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[3] = 'branding'
  AND (
    (SELECT role FROM public.get_my_profile()) = 'super_admin'
    OR (storage.foldername(name))[2]::uuid = (SELECT company_id FROM public.get_my_profile())
  )
);

-- INSERT: super_admin or company_admin/hr_manager for own company
DROP POLICY IF EXISTS "Upload company branding files" ON storage.objects;
CREATE POLICY "Upload company branding files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[3] = 'branding'
  AND (
    (SELECT role FROM public.get_my_profile()) = 'super_admin'
    OR (
      (SELECT role FROM public.get_my_profile()) IN ('company_admin', 'hr_manager')
      AND (storage.foldername(name))[2]::uuid = (SELECT company_id FROM public.get_my_profile())
    )
  )
);

-- UPDATE (upsert overwrite)
DROP POLICY IF EXISTS "Update company branding files" ON storage.objects;
CREATE POLICY "Update company branding files" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[3] = 'branding'
  AND (
    (SELECT role FROM public.get_my_profile()) = 'super_admin'
    OR (
      (SELECT role FROM public.get_my_profile()) IN ('company_admin', 'hr_manager')
      AND (storage.foldername(name))[2]::uuid = (SELECT company_id FROM public.get_my_profile())
    )
  )
)
WITH CHECK (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[3] = 'branding'
);

-- DELETE
DROP POLICY IF EXISTS "Delete company branding files" ON storage.objects;
CREATE POLICY "Delete company branding files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[3] = 'branding'
  AND (
    (SELECT role FROM public.get_my_profile()) = 'super_admin'
    OR (
      (SELECT role FROM public.get_my_profile()) IN ('company_admin', 'hr_manager')
      AND (storage.foldername(name))[2]::uuid = (SELECT company_id FROM public.get_my_profile())
    )
  )
);
