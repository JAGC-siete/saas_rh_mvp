-- Field-level security catalog and role matrix
-- Date: 2026-05-19

CREATE TABLE IF NOT EXISTS public.field_catalog (
  field_key TEXT PRIMARY KEY CHECK (field_key ~ '^[a-z0-9_.]+$' AND length(field_key) <= 64),
  module_key TEXT NOT NULL DEFAULT 'employees',
  name TEXT NOT NULL,
  description TEXT,
  default_display_mode TEXT NOT NULL DEFAULT 'masked'
    CHECK (default_display_mode IN ('hidden', 'masked', 'locked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_field_permissions (
  role TEXT NOT NULL,
  field_key TEXT NOT NULL REFERENCES public.field_catalog(field_key) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'none'
    CHECK (access_level IN ('none', 'read', 'write')),
  display_mode TEXT NOT NULL DEFAULT 'masked'
    CHECK (display_mode IN ('hidden', 'masked', 'locked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role, field_key)
);

CREATE INDEX IF NOT EXISTS idx_role_field_permissions_role ON public.role_field_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_field_permissions_field ON public.role_field_permissions(field_key);

DROP TRIGGER IF EXISTS field_catalog_updated_at ON public.field_catalog;
CREATE TRIGGER field_catalog_updated_at
  BEFORE UPDATE ON public.field_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS role_field_permissions_updated_at ON public.role_field_permissions;
CREATE TRIGGER role_field_permissions_updated_at
  BEFORE UPDATE ON public.role_field_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sensitive field
INSERT INTO public.field_catalog (field_key, module_key, name, description, default_display_mode)
VALUES (
  'employee.base_salary',
  'employees',
  'Salario base',
  'Salario base mensual del empleado (HNL)',
  'masked'
)
ON CONFLICT (field_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_display_mode = EXCLUDED.default_display_mode,
    updated_at = now();

-- Role defaults aligned with canonical-permissions.ts
INSERT INTO public.role_field_permissions (role, field_key, access_level, display_mode)
VALUES
  ('super_admin', 'employee.base_salary', 'write', 'masked'),
  ('admin', 'employee.base_salary', 'write', 'masked'),
  ('company_admin', 'employee.base_salary', 'write', 'masked'),
  ('hr_manager', 'employee.base_salary', 'write', 'masked'),
  ('manager', 'employee.base_salary', 'none', 'masked'),
  ('employee', 'employee.base_salary', 'none', 'masked')
ON CONFLICT (role, field_key) DO UPDATE
SET access_level = EXCLUDED.access_level,
    display_mode = EXCLUDED.display_mode,
    updated_at = now();

-- RLS: super_admin manages catalog; authenticated can read matrix (for API resolution)
ALTER TABLE public.field_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_field_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "field_catalog_read_authenticated" ON public.field_catalog;
CREATE POLICY "field_catalog_read_authenticated" ON public.field_catalog
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "field_catalog_super_admin_all" ON public.field_catalog;
CREATE POLICY "field_catalog_super_admin_all" ON public.field_catalog
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "role_field_permissions_read_authenticated" ON public.role_field_permissions;
CREATE POLICY "role_field_permissions_read_authenticated" ON public.role_field_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "role_field_permissions_super_admin_all" ON public.role_field_permissions;
CREATE POLICY "role_field_permissions_super_admin_all" ON public.role_field_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'super_admin'
    )
  );

COMMENT ON TABLE public.field_catalog IS 'Catálogo de campos sensibles para field-level security';
COMMENT ON TABLE public.role_field_permissions IS 'Matriz rol x campo: access_level none|read|write y display_mode cuando access=none';
