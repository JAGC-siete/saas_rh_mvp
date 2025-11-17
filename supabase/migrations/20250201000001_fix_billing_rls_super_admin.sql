-- Add super_admin policies for billing tables
-- This migration adds policies to allow super admins to access all billing data across companies

-- =========================================
-- COMPANY_METERS: Super admin full access
-- =========================================

-- Super admin can view all company meters (across all companies)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'company_meters' 
    AND policyname = 'Super admins can view all meters'
  ) THEN
    CREATE POLICY "Super admins can view all meters" ON company_meters
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- =========================================
-- MANUAL_PAYMENTS: Super admin full access
-- =========================================

-- Super admin can view all payments (across all companies)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'manual_payments' 
    AND policyname = 'Super admins can view all payments'
  ) THEN
    CREATE POLICY "Super admins can view all payments" ON manual_payments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Super admin can insert payments for any company
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'manual_payments' 
    AND policyname = 'Super admins can create payments'
  ) THEN
    CREATE POLICY "Super admins can create payments" ON manual_payments
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Super admin can update payments for any company
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'manual_payments' 
    AND policyname = 'Super admins can update payments'
  ) THEN
    CREATE POLICY "Super admins can update payments" ON manual_payments
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Super admin can delete payments from any company
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'manual_payments' 
    AND policyname = 'Super admins can delete payments'
  ) THEN
    CREATE POLICY "Super admins can delete payments" ON manual_payments
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE user_profiles.id = auth.uid() 
          AND user_profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Add helpful comments
COMMENT ON POLICY "Super admins can view all meters" ON company_meters IS 
  'Allows super admins to view usage meters for all companies';
COMMENT ON POLICY "Super admins can view all payments" ON manual_payments IS 
  'Allows super admins to view manual payments for all companies';
COMMENT ON POLICY "Super admins can create payments" ON manual_payments IS 
  'Allows super admins to create manual payments for any company';
COMMENT ON POLICY "Super admins can update payments" ON manual_payments IS 
  'Allows super admins to update manual payments for any company';
COMMENT ON POLICY "Super admins can delete payments" ON manual_payments IS 
  'Allows super admins to delete manual payments from any company';

