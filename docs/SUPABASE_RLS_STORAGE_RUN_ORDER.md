# RLS Storage Employee Files — Orden de ejecución en Supabase

Ejecuta cada bloque en el **SQL Editor** de Supabase (Dashboard → SQL Editor) en el orden indicado. Si un paso falla, no continúes hasta resolverlo.

---

## Estado actual

- **Paso 1:** OMITIDO — la tabla `employee_files` ya existía.
- **Pasos 2–6:** Aplicados en Supabase.

---

## Paso 1: Tabla `employee_files` (OMITIR — ya existe)

```sql
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

CREATE INDEX IF NOT EXISTS idx_employee_files_company_id ON public.employee_files(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_files_employee_id ON public.employee_files(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_files_storage_path ON public.employee_files(storage_path) WHERE is_active = true;
```

---

## Paso 2: Función `get_my_profile()`

```sql
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
```

---

## Paso 3: RLS en tabla `employee_files`

```sql
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
```

---

## Paso 4: Política Storage — SELECT (lectura)

```sql
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
```

---

## Paso 5: Política Storage — INSERT (subida)

```sql
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
```

---

## Paso 6: Política Storage — DELETE

```sql
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
```

---

## Resumen del orden

| # | Qué hace |
|---|----------|
| 1 | Crea tabla `employee_files` e índices |
| 2 | Crea función `get_my_profile()` |
| 3 | Activa RLS y política SELECT en `employee_files` |
| 4 | Política SELECT en `storage.objects` |
| 5 | Política INSERT en `storage.objects` |
| 6 | Política DELETE en `storage.objects` |

---

## Verificación rápida

Después de ejecutar todo:

```sql
-- Verificar que get_my_profile existe
SELECT * FROM get_my_profile();

-- Verificar políticas en employee_files
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'employee_files';

-- Verificar políticas en storage.objects para HR_BUCKET/companies
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%employee%';
```
