-- Secure bootstrap: stop auto super_admin creation, revoke public RPC, guard profile escalation
-- Date: 2026-05-21

CREATE SCHEMA IF NOT EXISTS app_private;

-- 1) Auth signup trigger: do not auto-create privileged profiles
DROP TRIGGER IF EXISTS on_auth_user_created_safe ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Profiles and companies are created via authenticated onboarding (service role API).
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user_safe: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Profiles and companies are created via authenticated onboarding (service role API).
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'No-op on signup; user_profiles are created through onboarding API with service role.';

-- 2) Remove bootstrap RPC that granted super_admin to any caller
DROP FUNCTION IF EXISTS public.create_user_profile(UUID);

-- 3) Guard against self-service privilege escalation on user_profiles
CREATE OR REPLACE FUNCTION app_private.guard_user_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app_private
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_allowed_self_roles TEXT[] := ARRAY['hr_manager', 'company_admin', 'manager', 'employee'];
BEGIN
  -- Server-side admin client (service role) has no JWT subject
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.id = v_actor THEN
      IF NEW.role IS NULL OR NOT (NEW.role = ANY (v_allowed_self_roles)) THEN
        NEW.role := 'hr_manager';
      END IF;
      IF NEW.role = 'super_admin' OR NEW.role = 'admin' OR NEW.role = 'system_admin' THEN
        NEW.role := 'hr_manager';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id = v_actor THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Cannot change own role'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
        RAISE EXCEPTION 'Cannot change own permissions'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
        RAISE EXCEPTION 'Cannot change own company_id'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'Cannot change own active status'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_profile_privileges ON public.user_profiles;
CREATE TRIGGER trg_guard_user_profile_privileges
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION app_private.guard_user_profile_privileges();

-- 4) Tighten self-insert policy (belt-and-suspenders with trigger above)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IS DISTINCT FROM 'super_admin'
    AND role IS DISTINCT FROM 'admin'
    AND role IS DISTINCT FROM 'system_admin'
  );

COMMENT ON FUNCTION app_private.guard_user_profile_privileges() IS
  'Blocks self-service role/permission/company escalation on user_profiles.';
