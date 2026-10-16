-- Local-only fixture: mirrors the production (Planilla) catalog for the tables
-- involved in employee/leave RLS as of 2026-10-16. Built from catalog reads
-- (pg_policy, information_schema, pg_get_functiondef); no row data.
-- Load into a throwaway Postgres as a superuser. Never run against Supabase.

\set ON_ERROR_STOP on

-- Supabase roles and auth helpers (service_role bypasses RLS like in Supabase)
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;
grant execute on all functions in schema auth to anon, authenticated, service_role;

create schema if not exists app_private;
grant usage on schema public to anon, authenticated, service_role;

-- Tables (columns as in prod; FKs kept only where policies/joins need them)
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  name text not null,
  description text,
  manager_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  cost_center_type text
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  department_id uuid references public.departments(id),
  work_schedule_id uuid,
  employee_code text,
  dni text not null,
  name text not null,
  email text,
  phone text,
  role text,
  team text,
  base_salary numeric(10,2) not null,
  hire_date date,
  termination_date date,
  status text default 'active',
  bank_name text,
  bank_account text,
  emergency_contact_name text,
  emergency_contact_phone text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  employee_pin_hash text,
  is_b2c boolean not null default false,
  pay_type text,
  sync_status text not null default 'not_synced',
  payment_frequency text,
  payment_day integer,
  quincena_config jsonb,
  hourly_rate_reference numeric(10,2),
  termination_reason_code text,
  termination_reason_detail text,
  position text,
  attendance_required boolean not null default true,
  pay_overtime boolean not null default true,
  address text
);

create table public.user_profiles (
  id uuid primary key,
  company_id uuid,
  employee_id uuid,
  role text not null default 'employee',
  permissions jsonb default '{}'::jsonb,
  last_login timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  is_b2c boolean not null default false
);

create table public.leave_types (id uuid primary key default gen_random_uuid(), name text);

create table public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid, employee_id uuid, module text, type text, title text, message text, metadata jsonb
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id),
  leave_type_id uuid not null references public.leave_types(id),
  start_date date not null,
  end_date date not null,
  days_requested numeric(5,2) not null,
  reason text,
  status text default 'pending',
  approved_by uuid references public.employees(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  employee_dni varchar(20),
  attachment_url text,
  attachment_type varchar(10),
  attachment_name varchar(255),
  duration_type text,
  duration_hours numeric(5,2),
  is_half_day boolean default false
);

grant all on public.departments, public.employees, public.user_profiles, public.leave_requests,
  public.leave_types, public.app_notifications to anon, authenticated, service_role;

-- Functions (verbatim from prod)
CREATE OR REPLACE FUNCTION public.get_user_company()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT up.company_id
  FROM public.user_profiles up
  WHERE up.id = auth.uid()
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION app_private.guard_user_profile_privileges()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'app_private'
AS $function$
DECLARE
  v_actor UUID := auth.uid();
  v_allowed_self_roles TEXT[] := ARRAY['hr_manager', 'company_admin', 'manager', 'employee'];
BEGIN
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.id = v_actor THEN
      IF NEW.role IS NULL OR NOT (NEW.role = ANY (v_allowed_self_roles)) THEN
        NEW.role := 'hr_manager';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id = v_actor THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Cannot change own role' USING ERRCODE = '42501';
      END IF;
      IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
        RAISE EXCEPTION 'Cannot change own permissions' USING ERRCODE = '42501';
      END IF;
      IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
        RAISE EXCEPTION 'Cannot change own company_id' USING ERRCODE = '42501';
      END IF;
      IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'Cannot change own active status' USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tg_notify_leave_request_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  emp_company_id uuid;
  emp_name text;
BEGIN
  SELECT e.company_id, e.name INTO emp_company_id, emp_name
  FROM public.employees e WHERE e.id = new.employee_id;
  IF emp_company_id IS NULL THEN RETURN new; END IF;
  INSERT INTO public.app_notifications (company_id, employee_id, module, type, title, message, metadata)
  VALUES (emp_company_id, new.employee_id, 'leave', 'info', 'Permiso solicitado', 'x', '{}'::jsonb);
  RETURN new;
END;
$function$;

-- Triggers (as in prod)
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notify_leave_request_created AFTER INSERT ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION tg_notify_leave_request_created();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_guard_user_profile_privileges BEFORE INSERT OR UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION app_private.guard_user_profile_privileges();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.user_profiles enable row level security;
alter table public.leave_requests enable row level security;

-- Policies: verbatim DDL generated from prod pg_policy
CREATE POLICY "Super admins can manage all departments" ON public.departments AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::text)))));
CREATE POLICY "Super admins can manage departments" ON public.departments AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.id = ( SELECT auth.uid() AS uid)) AND (up.role = 'super_admin'::text)))));
CREATE POLICY "Super admins can view all departments" ON public.departments AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = 'super_admin'::text)))));
CREATE POLICY departments_admin_manage ON public.departments AS PERMISSIVE FOR ALL TO authenticated USING ((company_id IN ( SELECT user_profiles.company_id
   FROM user_profiles
  WHERE ((user_profiles.id = ( SELECT auth.uid() AS uid)) AND (user_profiles.role = ANY (ARRAY['super_admin'::text, 'company_admin'::text, 'hr_manager'::text]))))));
CREATE POLICY departments_company_view ON public.departments AS PERMISSIVE FOR SELECT TO authenticated USING ((company_id IN ( SELECT user_profiles.company_id
   FROM user_profiles
  WHERE (user_profiles.id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Users can insert their own profile" ON public.user_profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((id = ( SELECT auth.uid() AS uid)) AND (role IS DISTINCT FROM 'super_admin'::text) AND (role IS DISTINCT FROM 'admin'::text) AND (role IS DISTINCT FROM 'system_admin'::text)));
CREATE POLICY "Users can update their own profile" ON public.user_profiles AS PERMISSIVE FOR UPDATE TO public USING ((( SELECT auth.uid() AS uid) = id)) WITH CHECK ((( SELECT auth.uid() AS uid) = id));
CREATE POLICY "Users can view their own profile" ON public.user_profiles AS PERMISSIVE FOR SELECT TO public USING ((( SELECT auth.uid() AS uid) = id));
CREATE POLICY b2x_user_profiles_select ON public.user_profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((((( SELECT auth.uid() AS uid) = id) AND (is_b2c = true)) OR (company_id = get_user_company())));
CREATE POLICY b2x_user_profiles_update ON public.user_profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((((( SELECT auth.uid() AS uid) = id) AND (is_b2c = true)) OR (company_id = get_user_company()))) WITH CHECK ((((( SELECT auth.uid() AS uid) = id) AND (is_b2c = true)) OR (company_id = get_user_company())));

\ir ../../rollbacks/20261016140000_employee_rls_leave_approval.rollback.sql
