-- Drop remaining advisor-identical duplicate indexes + leftover backup tables.
-- Access-preserving for live app data.

-- Keep idx_employees_company_id; drop temp duplicate
DROP INDEX IF EXISTS public.idx_employees_company_temp;

-- Keep constraint-backed payroll_snapshots_run_line_id_version_key; drop plain duplicate
DROP INDEX IF EXISTS public.ux_snapshots_run_line_version;

-- Keep idx_user_profiles_company_id; drop duplicate
DROP INDEX IF EXISTS public.idx_user_profiles_company;

-- Backup / staging leftovers (empty, marked to_delete)
DROP TABLE IF EXISTS public.stg_employees_departments_to_delete_20260411;
DROP TABLE IF EXISTS public.user_profiles_permissions_backup_to_delete_20260411;
