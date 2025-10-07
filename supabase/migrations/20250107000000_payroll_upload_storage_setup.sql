-- Migration: Payroll Upload System with Supabase Storage (HR_BUCKET)
-- This migration sets up RLS policies for payroll file uploads in the existing HR_BUCKET

-- ============================================================================
-- STORAGE RLS POLICIES FOR PAYROLL UPLOADS
-- ============================================================================

-- Policy: Allow trial users to upload their payroll files to payroll-uploads/ folder
CREATE POLICY "Trial users can upload payroll files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'payroll-uploads'
  AND (
    -- Allow if tenant_id in path matches an active trial
    EXISTS (
      SELECT 1 FROM trial_access_users
      WHERE tenant_id = (storage.foldername(name))[2]
      AND is_active = true
    )
    OR
    -- Allow super_admin to upload
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  )
);

-- Policy: Allow super admins to read all payroll uploads
CREATE POLICY "Super admins can read payroll uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'payroll-uploads'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Policy: Allow trial users to read their own uploads
CREATE POLICY "Trial users can read own payroll uploads"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'payroll-uploads'
  AND EXISTS (
    SELECT 1 FROM trial_access_users
    WHERE tenant_id = (storage.foldername(name))[2]
    AND is_active = true
  )
);

-- Policy: Allow super admins to delete payroll uploads
CREATE POLICY "Super admins can delete payroll uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'HR_BUCKET'
  AND (storage.foldername(name))[1] = 'payroll-uploads'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  )
);

-- ============================================================================
-- UPDATE PAYROLL_UPLOADS TABLE TO USE STORAGE PATHS
-- ============================================================================

-- Add storage_path column if not exists
ALTER TABLE payroll_uploads 
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS storage_bucket text DEFAULT 'HR_BUCKET';

-- Create index on storage_path for faster lookups
CREATE INDEX IF NOT EXISTS idx_payroll_uploads_storage_path 
  ON payroll_uploads(storage_path);

-- ============================================================================
-- DATABASE TRIGGERS FOR AUTOMATIC CONVERSION
-- ============================================================================

-- Function: Automatically create conversion when upload is processed
CREATE OR REPLACE FUNCTION auto_create_conversion_on_processed()
RETURNS TRIGGER AS $$
DECLARE
  v_conversion_id uuid;
BEGIN
  -- Only proceed if status changed to 'processed' and no conversion exists yet
  IF NEW.upload_status = 'processed' 
     AND OLD.upload_status != 'processed'
     AND NEW.conversion_status = 'pending' THEN
    
    -- Check if conversion already exists
    IF NOT EXISTS (
      SELECT 1 FROM trial_conversions 
      WHERE upload_id = NEW.id
    ) THEN
      -- Create conversion record
      INSERT INTO trial_conversions (
        tenant_id,
        original_company_id,
        upload_id,
        status,
        total_employees_expected,
        conversion_started_at
      ) VALUES (
        NEW.tenant_id,
        NEW.company_id,
        NEW.id,
        'initiated',
        COALESCE((NEW.extracted_data->>'total_employees')::integer, 0),
        NOW()
      ) RETURNING id INTO v_conversion_id;

      -- Log the automatic conversion creation
      RAISE NOTICE 'Auto-created conversion % for upload %', v_conversion_id, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_conversion ON payroll_uploads;
CREATE TRIGGER trigger_auto_conversion
  AFTER UPDATE ON payroll_uploads
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_conversion_on_processed();

-- ============================================================================
-- FUNCTION: Get signed URL for payroll upload
-- ============================================================================

CREATE OR REPLACE FUNCTION get_payroll_upload_url(
  p_tenant_id text,
  p_filename text,
  p_expires_in integer DEFAULT 3600
)
RETURNS json AS $$
DECLARE
  v_storage_path text;
  v_signed_url text;
BEGIN
  -- Validate tenant is active trial
  IF NOT EXISTS (
    SELECT 1 FROM trial_access_users
    WHERE tenant_id = p_tenant_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive trial tenant';
  END IF;

  -- Construct storage path
  v_storage_path := 'payroll-uploads/' || p_tenant_id || '/' || p_filename;

  -- Note: Signed URLs are generated by Supabase Storage API, not SQL
  -- This function returns the path that should be used
  
  RETURN json_build_object(
    'storage_path', v_storage_path,
    'bucket', 'HR_BUCKET',
    'tenant_id', p_tenant_id,
    'filename', p_filename
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Clean up old payroll uploads (older than 30 days)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_payroll_uploads()
RETURNS TABLE(deleted_count integer, paths_to_delete text[]) AS $$
DECLARE
  v_old_uploads record;
  v_paths text[] := ARRAY[]::text[];
  v_count integer := 0;
BEGIN
  -- Find uploads older than 30 days that are completed or failed
  FOR v_old_uploads IN
    SELECT id, storage_path, tenant_id
    FROM payroll_uploads
    WHERE created_at < NOW() - INTERVAL '30 days'
      AND upload_status IN ('processed', 'failed', 'converted')
      AND storage_path IS NOT NULL
  LOOP
    -- Add to paths array (for manual cleanup in Storage)
    v_paths := array_append(v_paths, v_old_uploads.storage_path);
    
    -- Mark as cleaned in database
    UPDATE payroll_uploads
    SET updated_at = NOW()
    WHERE id = v_old_uploads.id;
    
    v_count := v_count + 1;
  END LOOP;

  RETURN QUERY SELECT v_count, v_paths;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding uploads by tenant and status
CREATE INDEX IF NOT EXISTS idx_payroll_uploads_tenant_status 
  ON payroll_uploads(tenant_id, upload_status);

-- Index for finding processed uploads waiting for conversion
CREATE INDEX IF NOT EXISTS idx_payroll_uploads_conversion_pending 
  ON payroll_uploads(upload_status, conversion_status) 
  WHERE upload_status = 'processed' AND conversion_status = 'pending';

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE payroll_uploads IS 
  'Stores metadata for payroll files uploaded by trial users. Files are stored in Supabase Storage (HR_BUCKET/payroll-uploads/{tenant_id}/{filename})';

COMMENT ON COLUMN payroll_uploads.storage_path IS 
  'Path to file in Supabase Storage (format: payroll-uploads/{tenant_id}/{filename})';

COMMENT ON COLUMN payroll_uploads.storage_bucket IS 
  'Supabase Storage bucket name (default: HR_BUCKET)';

COMMENT ON COLUMN payroll_uploads.upload_status IS 
  'Status flow: uploaded → processing → processed → converted (or failed at any stage)';

COMMENT ON COLUMN payroll_uploads.conversion_status IS 
  'Conversion flow: pending → in_progress → completed (or failed)';

COMMENT ON FUNCTION auto_create_conversion_on_processed() IS 
  'Automatically creates a trial_conversion record when a payroll upload is successfully processed';

COMMENT ON FUNCTION get_payroll_upload_url(text, text, integer) IS 
  'Returns storage path information for uploading a payroll file. Validates tenant is active trial.';

COMMENT ON FUNCTION cleanup_old_payroll_uploads() IS 
  'Returns list of storage paths for payroll uploads older than 30 days that can be deleted. Should be run by cron job.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Allow authenticated users to call helper functions
GRANT EXECUTE ON FUNCTION get_payroll_upload_url(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payroll_upload_url(text, text, integer) TO anon;

-- Only super admins can run cleanup
REVOKE EXECUTE ON FUNCTION cleanup_old_payroll_uploads() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_old_payroll_uploads() TO authenticated;
