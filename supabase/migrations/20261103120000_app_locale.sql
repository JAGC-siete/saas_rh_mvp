-- UI language for the admin app (/app). Legal payroll documents stay in Spanish regardless.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'es'
  CHECK (locale IN ('es', 'en'));

-- Not attached to any plan: super admin enables it per company through company_feature_overrides
-- while the English translation is incomplete.
INSERT INTO public.feature_catalog (feature_key, name, description)
VALUES ('app_english', 'App English', 'Interfaz de administración en inglés (beta)')
ON CONFLICT (feature_key) DO NOTHING;
