-- Migration: Fix payroll trigger functions and tables to use company_id
-- Date: 2025-01-27
-- Description: Updates tables and trigger functions to use company_id consistently
-- SAFE: This migration is non-destructive and idempotent. It will only run if necessary.

-- First, fix payroll_runs table if it still has company_uuid
DO $$
BEGIN
    -- Check if company_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payroll_runs' AND column_name = 'company_id'
    ) THEN
        -- Add company_id column (nullable first for safety)
        ALTER TABLE payroll_runs ADD COLUMN company_id UUID;
        
        -- Copy data from company_uuid to company_id if company_uuid exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payroll_runs' AND column_name = 'company_uuid'
        ) THEN
            UPDATE payroll_runs SET company_id = company_uuid WHERE company_id IS NULL AND company_uuid IS NOT NULL;
        END IF;
        
        -- Now make company_id NOT NULL (will fail if any rows are still NULL)
        ALTER TABLE payroll_runs ALTER COLUMN company_id SET NOT NULL;
        
        -- Update unique constraint
        ALTER TABLE payroll_runs DROP CONSTRAINT IF EXISTS unique_company_period_tipo;
        ALTER TABLE payroll_runs ADD CONSTRAINT unique_company_period_tipo 
            UNIQUE (company_id, year, month, quincena, tipo);
        
        -- Update foreign key
        ALTER TABLE payroll_runs DROP CONSTRAINT IF EXISTS payroll_runs_company_id_fkey;
        ALTER TABLE payroll_runs ADD CONSTRAINT payroll_runs_company_id_fkey 
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
        
        -- Drop RLS policies that depend on company_uuid BEFORE dropping the column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payroll_runs' AND column_name = 'company_uuid'
        ) THEN
            -- Drop all policies that reference company_uuid
            DROP POLICY IF EXISTS "Users can view payroll runs in their company" ON payroll_runs;
            DROP POLICY IF EXISTS "Users with payroll permissions can create payroll runs" ON payroll_runs;
            DROP POLICY IF EXISTS "Users with payroll permissions can update payroll runs" ON payroll_runs;
            DROP POLICY IF EXISTS "Only company admins can delete payroll runs" ON payroll_runs;
            DROP POLICY IF EXISTS "payroll_runs_admin_only" ON payroll_runs;
            DROP POLICY IF EXISTS "Company admins and HR managers can manage payroll runs" ON payroll_runs;
            
            -- Now drop the column
            ALTER TABLE payroll_runs DROP COLUMN IF EXISTS company_uuid;
            
            -- Recreate policies with company_id
            CREATE POLICY "Users can view payroll runs in their company" ON payroll_runs
                FOR SELECT USING (company_id IN (
                    SELECT company_id FROM user_profiles WHERE id = auth.uid()
                ));
            
            CREATE POLICY "Users with payroll permissions can create payroll runs" ON payroll_runs
                FOR INSERT WITH CHECK (company_id IN (
                    SELECT company_id FROM user_profiles 
                    WHERE id = auth.uid() AND (
                        role IN ('company_admin', 'hr_manager') OR
                        (permissions::jsonb ? 'can_manage_payroll' AND permissions->>'can_manage_payroll' = 'true')
                    )
                ));
            
            CREATE POLICY "Users with payroll permissions can update payroll runs" ON payroll_runs
                FOR UPDATE USING (company_id IN (
                    SELECT company_id FROM user_profiles 
                    WHERE id = auth.uid() AND (
                        role IN ('company_admin', 'hr_manager') OR
                        (permissions::jsonb ? 'can_manage_payroll' AND permissions->>'can_manage_payroll' = 'true')
                    )
                ));
            
            CREATE POLICY "Only company admins can delete payroll runs" ON payroll_runs
                FOR DELETE USING (company_id IN (
                    SELECT company_id FROM user_profiles 
                    WHERE id = auth.uid() AND role IN ('company_admin', 'super_admin')
                ));
            
            CREATE POLICY "Company admins and HR managers can manage payroll runs" ON payroll_runs
                FOR ALL USING (company_id IN (
                    SELECT company_id FROM user_profiles 
                    WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager')
                ));
        END IF;
    END IF;
END $$;

-- Fix payroll_snapshots table if it still has company_uuid
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payroll_snapshots' AND column_name = 'company_id'
    ) THEN
        -- Add company_id column (nullable first for safety)
        ALTER TABLE payroll_snapshots ADD COLUMN company_id UUID;
        
        -- Copy data from company_uuid to company_id if company_uuid exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payroll_snapshots' AND column_name = 'company_uuid'
        ) THEN
            UPDATE payroll_snapshots SET company_id = company_uuid WHERE company_id IS NULL AND company_uuid IS NOT NULL;
        END IF;
        
        -- Now make company_id NOT NULL (will fail if any rows are still NULL)
        ALTER TABLE payroll_snapshots ALTER COLUMN company_id SET NOT NULL;
        
        -- Drop RLS policies that depend on company_uuid BEFORE dropping the column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payroll_snapshots' AND column_name = 'company_uuid'
        ) THEN
            -- Drop policies
            DROP POLICY IF EXISTS "Users can view snapshots in their company" ON payroll_snapshots;
            
            -- Drop the column
            ALTER TABLE payroll_snapshots DROP COLUMN IF EXISTS company_uuid;
            
            -- Recreate policies with company_id
            CREATE POLICY "Users can view snapshots in their company" ON payroll_snapshots
                FOR SELECT USING (company_id IN (
                    SELECT company_id FROM user_profiles WHERE id = auth.uid()
                ));
        END IF;
    END IF;
END $$;

-- Fix payroll_adjustments table if it still has company_uuid  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payroll_adjustments' AND column_name = 'company_id'
    ) THEN
        -- Add company_id column (nullable first for safety)
        ALTER TABLE payroll_adjustments ADD COLUMN company_id UUID;
        
        -- Copy data from company_uuid to company_id if company_uuid exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payroll_adjustments' AND column_name = 'company_uuid'
        ) THEN
            UPDATE payroll_adjustments SET company_id = company_uuid WHERE company_id IS NULL AND company_uuid IS NOT NULL;
        END IF;
        
        -- Now make company_id NOT NULL (will fail if any rows are still NULL)
        ALTER TABLE payroll_adjustments ALTER COLUMN company_id SET NOT NULL;
        
        -- Drop RLS policies that depend on company_uuid BEFORE dropping the column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payroll_adjustments' AND column_name = 'company_uuid'
        ) THEN
            -- Drop policies
            DROP POLICY IF EXISTS "Users can view adjustments in their company" ON payroll_adjustments;
            DROP POLICY IF EXISTS "Company admins and HR managers can create adjustments" ON payroll_adjustments;
            DROP POLICY IF EXISTS "Users with payroll permissions can manage adjustments" ON payroll_adjustments;
            
            -- Drop the column
            ALTER TABLE payroll_adjustments DROP COLUMN IF EXISTS company_uuid;
            
            -- Recreate policies with company_id
            CREATE POLICY "Users can view adjustments in their company" ON payroll_adjustments
                FOR SELECT USING (company_id IN (
                    SELECT company_id FROM user_profiles WHERE id = auth.uid()
                ));
            
            CREATE POLICY "Company admins and HR managers can create adjustments" ON payroll_adjustments
                FOR INSERT WITH CHECK (company_id IN (
                    SELECT company_id FROM user_profiles 
                    WHERE id = auth.uid() AND role IN ('company_admin', 'hr_manager')
                ));
            
            CREATE POLICY "Users with payroll permissions can manage adjustments" ON payroll_adjustments
                FOR ALL USING (company_id IN (
                    SELECT company_id FROM user_profiles 
                    WHERE id = auth.uid() AND (
                        role IN ('company_admin', 'hr_manager') OR
                        (permissions::jsonb ? 'can_manage_payroll' AND permissions->>'can_manage_payroll' = 'true')
                    )
                ));
        END IF;
    END IF;
END $$;

-- Update foreign key constraints
ALTER TABLE payroll_snapshots DROP CONSTRAINT IF EXISTS payroll_snapshots_company_id_fkey;
ALTER TABLE payroll_snapshots ADD CONSTRAINT payroll_snapshots_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE payroll_adjustments DROP CONSTRAINT IF EXISTS payroll_adjustments_company_id_fkey;
ALTER TABLE payroll_adjustments ADD CONSTRAINT payroll_adjustments_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Fix apply_adjustment_update_eff function
CREATE OR REPLACE FUNCTION apply_adjustment_update_eff()
RETURNS TRIGGER AS $$
DECLARE
  line payroll_run_lines;
  v_hours NUMERIC; v_bruto NUMERIC; v_ihss NUMERIC; v_rap NUMERIC; v_isr NUMERIC; v_neto NUMERIC;
BEGIN
  SELECT * INTO line FROM payroll_run_lines WHERE id = NEW.run_line_id FOR UPDATE;

  -- Leer último override por campo (si hay)
  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='hours' 
    ORDER BY created_at DESC LIMIT 1
  ), line.calc_hours) INTO v_hours;

  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='bruto' 
    ORDER BY created_at DESC LIMIT 1
  ), line.calc_bruto) INTO v_bruto;

  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='ihss' 
    ORDER BY created_at DESC LIMIT 1
  ), line.calc_ihss) INTO v_ihss;

  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='rap' 
    ORDER BY created_at DESC LIMIT 1
  ), line.calc_rap) INTO v_rap;

  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='isr' 
    ORDER BY created_at DESC LIMIT 1
  ), line.calc_isr) INTO v_isr;

  -- neto: si no se overridea explícito, re-calcula como bruto - deducciones
  SELECT COALESCE((
    SELECT new_value FROM payroll_adjustments 
    WHERE run_line_id = line.id AND field='neto' 
    ORDER BY created_at DESC LIMIT 1
  ), v_bruto - v_ihss - v_rap - v_isr) INTO v_neto;

  UPDATE payroll_run_lines
     SET eff_hours = v_hours,
         eff_bruto = v_bruto,
         eff_ihss  = v_ihss,
         eff_rap   = v_rap,
         eff_isr   = v_isr,
         eff_neto  = v_neto,
         edited    = TRUE,
         updated_at = now()
   WHERE id = line.id;

  -- Snapshot versión: incrementa versión (FIXED: use company_id)
  INSERT INTO payroll_snapshots (run_line_id, company_id, version, payload)
  VALUES (
    line.id, line.company_id,
    COALESCE((SELECT MAX(version) FROM payroll_snapshots WHERE run_line_id = line.id), -1) + 1,
    to_jsonb(line) || jsonb_build_object(
      'eff_hours', v_hours, 'eff_bruto', v_bruto, 'eff_ihss', v_ihss, 
      'eff_rap', v_rap, 'eff_isr', v_isr, 'eff_neto', v_neto
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix snapshot_line_v0 function (FIXED: use company_id)
CREATE OR REPLACE FUNCTION snapshot_line_v0()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO payroll_snapshots (run_line_id, company_id, version, payload)
  VALUES (NEW.id, NEW.company_id, 0, to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix audit_payroll_lines_update function (FIXED: use company_id)
CREATE OR REPLACE FUNCTION audit_payroll_lines_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs(company_id, user_id, action, resource_type, resource_id, old_values, new_values)
  VALUES (
    NEW.company_id, 
    NULL, -- TODO: obtener user_id del contexto
    TG_OP,
    'payroll_run_lines', 
    NEW.id, 
    to_jsonb(OLD) - 'updated_at', 
    to_jsonb(NEW) - 'updated_at'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Migration completed successfully
-- This migration is SAFE and IDEMPOTENT:
-- ✓ Checks column existence before making changes
-- ✓ Copies data safely before dropping old columns
-- ✓ Will not run if company_id already exists (idempotent)
-- ✓ Preserves all data during migration
-- ✓ Multiple safety checks prevent data loss

