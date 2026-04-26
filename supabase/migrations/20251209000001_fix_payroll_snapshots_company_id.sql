-- Migration: Fix payroll_snapshots triggers to use company_id instead of company_uuid
-- Date: 2025-12-09
-- Description: Ensures all trigger functions use company_id consistently
-- This fixes the error: column "company_uuid" of relation "payroll_snapshots" does not exist

-- 1) Ensure column, FK, and index are correct
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payroll_snapshots' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.payroll_snapshots ADD COLUMN company_id uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payroll_snapshots' AND column_name = 'company_uuid'
  ) THEN
    UPDATE public.payroll_snapshots
      SET company_id = company_uuid
      WHERE company_id IS NULL AND company_uuid IS NOT NULL;
    ALTER TABLE public.payroll_snapshots DROP COLUMN IF EXISTS company_uuid;
  END IF;

  -- Not null + FK
  ALTER TABLE public.payroll_snapshots
    ALTER COLUMN company_id SET NOT NULL;

  ALTER TABLE public.payroll_snapshots
    DROP CONSTRAINT IF EXISTS payroll_snapshots_company_id_fkey;

  ALTER TABLE public.payroll_snapshots
    ADD CONSTRAINT payroll_snapshots_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
END $$;

-- 2) Indexes
DROP INDEX IF EXISTS idx_snap_company;
CREATE INDEX IF NOT EXISTS idx_snap_company ON public.payroll_snapshots(company_id);

-- Unique version per run_line
CREATE UNIQUE INDEX IF NOT EXISTS ux_snapshots_run_line_version
  ON public.payroll_snapshots(run_line_id, version);

-- 3) Functions (SECURITY DEFINER for snapshot inserts)
CREATE OR REPLACE FUNCTION public.apply_adjustment_update_eff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hours NUMERIC;
  v_bruto NUMERIC;
  v_ihss NUMERIC;
  v_rap  NUMERIC;
  v_isr  NUMERIC;
  v_neto NUMERIC;
  next_version int;
BEGIN
  -- NEW refers to payroll_adjustments row; we need fields from its line
  -- Fetch base from line (no FOR UPDATE)
  SELECT calc_hours, calc_bruto, calc_ihss, calc_rap, calc_isr
  INTO v_hours, v_bruto, v_ihss, v_rap, v_isr
  FROM public.payroll_run_lines
  WHERE id = NEW.run_line_id;

  -- Apply overrides using most recent adjustment by field
  SELECT COALESCE((
    SELECT new_value FROM public.payroll_adjustments 
    WHERE run_line_id = NEW.run_line_id AND field='hours'
    ORDER BY created_at DESC LIMIT 1
  ), v_hours) INTO v_hours;

  SELECT COALESCE((
    SELECT new_value FROM public.payroll_adjustments 
    WHERE run_line_id = NEW.run_line_id AND field='bruto'
    ORDER BY created_at DESC LIMIT 1
  ), v_bruto) INTO v_bruto;

  SELECT COALESCE((
    SELECT new_value FROM public.payroll_adjustments 
    WHERE run_line_id = NEW.run_line_id AND field='ihss'
    ORDER BY created_at DESC LIMIT 1
  ), v_ihss) INTO v_ihss;

  SELECT COALESCE((
    SELECT new_value FROM public.payroll_adjustments 
    WHERE run_line_id = NEW.run_line_id AND field='rap'
    ORDER BY created_at DESC LIMIT 1
  ), v_rap) INTO v_rap;

  SELECT COALESCE((
    SELECT new_value FROM public.payroll_adjustments 
    WHERE run_line_id = NEW.run_line_id AND field='isr'
    ORDER BY created_at DESC LIMIT 1
  ), v_isr) INTO v_isr;

  v_neto := COALESCE((
    SELECT new_value FROM public.payroll_adjustments 
    WHERE run_line_id = NEW.run_line_id AND field='neto'
    ORDER BY created_at DESC LIMIT 1
  ), v_bruto - v_ihss - v_rap - v_isr);

  -- Update line effective values
  UPDATE public.payroll_run_lines
     SET eff_hours = v_hours,
         eff_bruto = v_bruto,
         eff_ihss  = v_ihss,
         eff_rap   = v_rap,
         eff_isr   = v_isr,
         eff_neto  = v_neto,
         edited    = TRUE,
         updated_at = now()
   WHERE id = NEW.run_line_id;

  -- Compute version safely
  SELECT COALESCE(MAX(version), -1) + 1
    INTO next_version
  FROM public.payroll_snapshots
  WHERE run_line_id = NEW.run_line_id;

  -- Insert snapshot using company_id from line
  INSERT INTO public.payroll_snapshots (run_line_id, company_id, version, payload)
  SELECT l.id, l.company_id, next_version,
         to_jsonb(l) || jsonb_build_object(
           'eff_hours', v_hours, 'eff_bruto', v_bruto, 'eff_ihss', v_ihss,
           'eff_rap', v_rap, 'eff_isr', v_isr, 'eff_neto', v_neto
         )
  FROM public.payroll_run_lines l
  WHERE l.id = NEW.run_line_id
  ON CONFLICT (run_line_id, version) DO NOTHING; -- protects on rare races

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_line_v0()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Create initial snapshot version 0 once
  SELECT EXISTS(
    SELECT 1 FROM public.payroll_snapshots
    WHERE run_line_id = NEW.id AND version = 0
  ) INTO v_exists;

  IF NOT v_exists THEN
    INSERT INTO public.payroll_snapshots (run_line_id, company_id, version, payload)
    VALUES (NEW.id, NEW.company_id, 0, to_jsonb(NEW));
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Secure function execution
REVOKE ALL ON FUNCTION public.apply_adjustment_update_eff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.snapshot_line_v0() FROM PUBLIC;

-- 5) Recreate triggers explicitly (adjust names if you already have them)
DROP TRIGGER IF EXISTS trg_adjustment_update_eff ON public.payroll_adjustments;
CREATE TRIGGER trg_adjustment_update_eff
AFTER INSERT ON public.payroll_adjustments
FOR EACH ROW EXECUTE FUNCTION public.apply_adjustment_update_eff();

DROP TRIGGER IF EXISTS trg_snapshot_line_v0 ON public.payroll_run_lines;
CREATE TRIGGER trg_snapshot_line_v0
AFTER INSERT ON public.payroll_run_lines
FOR EACH ROW EXECUTE FUNCTION public.snapshot_line_v0();

-- 6) RLS policy for read (keep your existing policy semantics)
DROP POLICY IF EXISTS "Users can view snapshots in their company" ON public.payroll_snapshots;
CREATE POLICY "Users can view snapshots in their company" ON public.payroll_snapshots
FOR SELECT USING (
  company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid())
);
