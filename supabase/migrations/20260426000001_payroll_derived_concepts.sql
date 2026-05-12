BEGIN;

CREATE TABLE IF NOT EXISTS public.payroll_derived_concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  has_employer_contrib BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payroll_derived_concepts_code_check CHECK (code ~ '^[A-Z0-9_]+$' AND length(code) <= 64),
  CONSTRAINT payroll_derived_concepts_label_check CHECK (length(label) BETWEEN 1 AND 120),
  UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS public.payroll_derived_concept_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES public.payroll_derived_concepts(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL,
  employee_source TEXT,
  employer_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payroll_derived_concept_sources_kind_check CHECK (source_kind IN ('run_line_column', 'run_line_metadata_key', 'run_total_formula')),
  CONSTRAINT payroll_derived_concept_sources_employee_source_check CHECK (employee_source IS NULL OR length(employee_source) <= 128),
  CONSTRAINT payroll_derived_concept_sources_employer_source_check CHECK (employer_source IS NULL OR length(employer_source) <= 128)
);

CREATE INDEX IF NOT EXISTS idx_payroll_derived_concepts_company ON public.payroll_derived_concepts(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_derived_concept_sources_concept ON public.payroll_derived_concept_sources(concept_id);
CREATE INDEX IF NOT EXISTS idx_payroll_derived_concept_sources_company ON public.payroll_derived_concept_sources(company_id);

ALTER TABLE public.payroll_derived_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_derived_concept_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_derived_concepts' AND policyname = 'payroll_derived_concepts_select'
  ) THEN
    CREATE POLICY payroll_derived_concepts_select ON public.payroll_derived_concepts
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
        OR company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_derived_concepts' AND policyname = 'payroll_derived_concepts_write'
  ) THEN
    CREATE POLICY payroll_derived_concepts_write ON public.payroll_derived_concepts
      FOR ALL
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
        OR company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
        OR company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_derived_concept_sources' AND policyname = 'payroll_derived_concept_sources_select'
  ) THEN
    CREATE POLICY payroll_derived_concept_sources_select ON public.payroll_derived_concept_sources
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
        OR company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payroll_derived_concept_sources' AND policyname = 'payroll_derived_concept_sources_write'
  ) THEN
    CREATE POLICY payroll_derived_concept_sources_write ON public.payroll_derived_concept_sources
      FOR ALL
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
        OR company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'super_admin')
        OR company_id IN (SELECT company_id FROM public.user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
      );
  END IF;
END $$;

COMMENT ON TABLE public.payroll_derived_concepts IS 'Company-scoped catalog of payroll derived reports (IHSS/RAP/INFOP/custom).';
COMMENT ON TABLE public.payroll_derived_concept_sources IS 'Maps each derived concept to a payroll_run_lines source (column, metadata key, or run-total formula).';

COMMIT;