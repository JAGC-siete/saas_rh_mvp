-- =========================
-- Etapa 1 - B2C Quick Wins
-- =========================

-- 1) Esquema: columnas y restricciones

-- user_profiles: agregar is_b2c y permitir company_id nullable con constraint condicional
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_b2c boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_profiles
  ALTER COLUMN company_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_company_id_null_only_if_b2c'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_company_id_null_only_if_b2c
      CHECK (
        company_id IS NOT NULL OR is_b2c = TRUE
      );
  END IF;
END $$;

-- employees: agregar is_b2c y permitir company_id nullable con constraint condicional
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_b2c boolean NOT NULL DEFAULT false;

ALTER TABLE public.employees
  ALTER COLUMN company_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_company_id_null_only_if_b2c'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_company_id_null_only_if_b2c
      CHECK (
        company_id IS NOT NULL OR is_b2c = TRUE
      );
  END IF;
END $$;

-- 2) Índices para performance (RLS y filtros)
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON public.user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id_is_b2c ON public.user_profiles(id, is_b2c);
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_id ON public.user_profiles(employee_id);

CREATE INDEX IF NOT EXISTS idx_employees_company_id ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_b2c ON public.employees(is_b2c);

-- 3) Helper multi-tenant (opcional)
-- Ejecuta esto por separado si el bloque DO causa problemas en el editor de Supabase
CREATE OR REPLACE FUNCTION public.get_user_company()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
  SELECT company_id
  FROM public.user_profiles
  WHERE id = auth.uid();
$function$;

REVOKE EXECUTE ON FUNCTION public.get_user_company() FROM anon, authenticated;

-- 4) Políticas RLS: compatibilidad B2B + soporte B2C
-- No se eliminan las políticas existentes. Agregamos complementos seguros.
-- Patrones clave:
--   - B2B: company_id = get_user_company()
--   - B2C: ownership estricto (auth.uid() owner) AND is_b2c = TRUE

-- user_profiles: permitir SELECT propio si B2C o por tenant si B2B
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_profiles' AND policyname='b2x_user_profiles_select'
  ) THEN
    CREATE POLICY b2x_user_profiles_select
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
      -- B2C: dueño de su perfil
      (auth.uid() = id AND is_b2c = TRUE)
      OR
      -- B2B: pertenencia tenant
      (company_id = public.get_user_company())
    );
  END IF;
END $$;

-- UPDATE propio si B2C, o por tenant si B2B
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_profiles' AND policyname='b2x_user_profiles_update'
  ) THEN
    CREATE POLICY b2x_user_profiles_update
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (
      (auth.uid() = id AND is_b2c = TRUE)
      OR
      (company_id = public.get_user_company())
    )
    WITH CHECK (
      -- B2C: debe mantenerse B2C y sin company_id por el CHECK
      (
        auth.uid() = id
        AND is_b2c = TRUE
      )
      OR
      -- B2B: debe pertenecer al tenant
      (company_id = public.get_user_company())
    );
  END IF;
END $$;

-- Opcional INSERT (si deseas permitir que el propio usuario cree su perfil B2C sin service role):
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies
--     WHERE schemaname='public' AND tablename='user_profiles' AND policyname='b2c_user_profiles_insert_self'
--   ) THEN
--     CREATE POLICY b2c_user_profiles_insert_self
--     ON public.user_profiles
--     FOR INSERT
--     TO authenticated
--     WITH CHECK (
--       auth.uid() = id
--       AND is_b2c = TRUE
--       AND company_id IS NULL
--     );
--   END IF;
-- END $$;

-- employees: permitir SELECT/UPDATE del empleado propio si B2C o por tenant si B2B
-- SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='employees' AND policyname='b2x_employees_select'
  ) THEN
    CREATE POLICY b2x_employees_select
    ON public.employees
    FOR SELECT
    TO authenticated
    USING (
      -- B2C: dueño a través de user_profiles.employee_id
      (is_b2c = TRUE AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND up.employee_id = employees.id
          AND up.is_b2c = TRUE
      ))
      OR
      -- B2B: pertenencia tenant
      (company_id = public.get_user_company())
    );
  END IF;
END $$;

-- UPDATE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='employees' AND policyname='b2x_employees_update'
  ) THEN
    CREATE POLICY b2x_employees_update
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (
      (is_b2c = TRUE AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND up.employee_id = employees.id
          AND up.is_b2c = TRUE
      ))
      OR
      (company_id = public.get_user_company())
    )
    WITH CHECK (
      -- B2C: mantener B2C y sin company_id (enforced por CHECK)
      (is_b2c = TRUE)
      OR
      -- B2B: misma compañía del usuario
      (company_id = public.get_user_company())
    );
  END IF;
END $$;

-- 5) Validación mínima post-migración (no destructivo)
-- Estos SELECT pueden ejecutarse manualmente en el dashboard para sanity checks:
-- SELECT count(*) FROM public.user_profiles WHERE is_b2c = TRUE AND company_id IS NOT NULL;  -- debe ser 0
-- SELECT count(*) FROM public.employees WHERE is_b2c = TRUE AND company_id IS NOT NULL;      -- debe ser 0