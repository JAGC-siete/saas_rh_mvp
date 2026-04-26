-- Migration: RLS for Employee Files (HR_BUCKET/companies/...)
-- Formalizes employee_files table, adds get_my_profile() helper, and Storage RLS policies.
-- Path structure: companies/{company_id}/employees/{employee_id}/profile.{ext} or documents/...

-- ============================================================================
-- 1.1 TABLE employee_files
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employee_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL CHECK (file_type IN ('profile_photo', 'document')),
    document_category TEXT CHECK (document_category IN ('contrato', 'identidad', 'certificado', 'diploma', 'otro')),
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for RLS and queries
CREATE INDEX IF NOT EXISTS idx_employee_files_company_id ON public.employee_files(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_files_employee_id ON public.employee_files(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_files_storage_path ON public.employee_files(storage_path) WHERE is_active = true;

-- ============================================================================
-- 1.2 FUNCTION get_my_profile()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (role text, company_id uuid, employee_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT up.role, up.company_id, up.employee_id
  FROM public.user_profiles up
  WHERE up.id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

COMMENT ON FUNCTION public.get_my_profile() IS 'Returns role, company_id, employee_id for the current user. Used in Storage RLS policies.';

-- ============================================================================
-- 1.3 RLS ON employee_files
-- ============================================================================

ALTER TABLE public.employee_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view relevant employee_files" ON public.employee_files;
CREATE POLICY "Users can view relevant employee_files" ON public.employee_files
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND (
            up.role = 'super_admin'
            OR (up.company_id = employee_files.company_id AND up.role IN ('company_admin', 'hr_manager', 'manager'))
            OR (up.employee_id = employee_files.employee_id AND up.role = 'employee')
        )
    )
);

-- ============================================================================
-- 1.4 STORAGE RLS POLICIES (HR_BUCKET/companies/...)
-- ============================================================================

-- SELECT: super_admin sees all; company_admin/hr_manager see their company; employee sees own files
CREATE POLICY "Access employee files" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[3] = 'employees'
  AND (
    (SELECT role FROM get_my_profile()) = 'super_admin'
    OR (storage.foldername(name))[2]::uuid = (SELECT company_id FROM get_my_profile())
    OR (storage.foldername(name))[4]::uuid = (SELECT employee_id FROM get_my_profile())
  )
);

-- INSERT: super_admin anywhere; company_admin/hr_manager to their company; employee only own profile photo
CREATE POLICY "Upload employee files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[3] = 'employees'
  AND (
    (SELECT role FROM get_my_profile()) = 'super_admin'
    OR (
      (SELECT role FROM get_my_profile()) IN ('company_admin', 'hr_manager')
      AND (storage.foldername(name))[2]::uuid = (SELECT company_id FROM get_my_profile())
    )
    OR (
      (SELECT role FROM get_my_profile()) = 'employee'
      AND (storage.foldername(name))[4]::uuid = (SELECT employee_id FROM get_my_profile())
      AND (name LIKE '%/profile.%')
    )
  )
);

-- DELETE: super_admin or company_admin/hr_manager for their company
CREATE POLICY "Delete employee files" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[3] = 'employees'
  AND (
    (SELECT role FROM get_my_profile()) = 'super_admin'
    OR (
      (SELECT role FROM get_my_profile()) IN ('company_admin', 'hr_manager')
      AND (storage.foldername(name))[2]::uuid = (SELECT company_id FROM get_my_profile())
    )
  )
);
