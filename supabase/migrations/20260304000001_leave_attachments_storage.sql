-- Migration: Storage RLS for leave request attachments (HR_BUCKET/leave-attachments/...)
-- Path structure: leave-attachments/{company_id}/{employee_id}/{timestamp}-{random}.{ext}
-- Employees upload their own; admins view company attachments.

-- ============================================================================
-- STORAGE RLS POLICIES (HR_BUCKET/leave-attachments/...)
-- ============================================================================

-- SELECT: super_admin sees all; company_admin/hr_manager see their company; employee sees own files
CREATE POLICY "Access leave attachments" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'leave-attachments'
  AND (
    (SELECT role FROM get_my_profile()) = 'super_admin'
    OR (
      (SELECT role FROM get_my_profile()) IN ('company_admin', 'hr_manager')
      AND (storage.foldername(name))[2]::uuid = (SELECT company_id FROM get_my_profile())
    )
    OR (
      (SELECT role FROM get_my_profile()) = 'employee'
      AND (storage.foldername(name))[3]::uuid = (SELECT employee_id FROM get_my_profile())
    )
  )
);

-- INSERT: super_admin anywhere; company_admin/hr_manager to their company; employee to own folder
CREATE POLICY "Upload leave attachments" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'leave-attachments'
  AND (
    (SELECT role FROM get_my_profile()) = 'super_admin'
    OR (
      (SELECT role FROM get_my_profile()) IN ('company_admin', 'hr_manager')
      AND (storage.foldername(name))[2]::uuid = (SELECT company_id FROM get_my_profile())
    )
    OR (
      (SELECT role FROM get_my_profile()) = 'employee'
      AND (storage.foldername(name))[2]::uuid = (SELECT company_id FROM get_my_profile())
      AND (storage.foldername(name))[3]::uuid = (SELECT employee_id FROM get_my_profile())
    )
  )
);
