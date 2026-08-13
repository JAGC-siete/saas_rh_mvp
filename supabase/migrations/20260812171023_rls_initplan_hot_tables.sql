-- RLS initplan hardening for hot tables only.
-- Semantic no-op: bare auth.uid()/auth.role()/auth.jwt() -> (select auth.*()).
-- Does not merge, rename, or drop policies. Skips policies already initplanned.

DO $$
DECLARE
  r RECORD;
  q text;
  w text;
  q_work text;
  w_work text;
  changed boolean;
  role_list text;
  sql text;
BEGIN
  FOR r IN
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'employees',
        'departments',
        'attendance_records',
        'attendance_events',
        'payroll_runs',
        'leave_requests'
      )
    ORDER BY tablename, policyname
  LOOP
    q := r.qual;
    w := r.with_check;
    changed := false;

    IF q IS NOT NULL THEN
      q_work := q;
      q_work := regexp_replace(q_work, '\(\s*SELECT\s+auth\.uid\(\)(\s+AS\s+\w+)?\s*\)', '<<<UID>>>', 'gi');
      q_work := regexp_replace(q_work, '\(\s*SELECT\s+auth\.role\(\)(\s+AS\s+\w+)?\s*\)', '<<<ROLE>>>', 'gi');
      q_work := regexp_replace(q_work, '\(\s*SELECT\s+auth\.jwt\(\)(\s+AS\s+\w+)?\s*\)', '<<<JWT>>>', 'gi');
      IF position('auth.uid()' in q_work) > 0
         OR position('auth.role()' in q_work) > 0
         OR position('auth.jwt()' in q_work) > 0 THEN
        changed := true;
        q_work := replace(q_work, 'auth.uid()', '(select auth.uid())');
        q_work := replace(q_work, 'auth.role()', '(select auth.role())');
        q_work := replace(q_work, 'auth.jwt()', '(select auth.jwt())');
      END IF;
      q_work := replace(q_work, '<<<UID>>>', '(select auth.uid())');
      q_work := replace(q_work, '<<<ROLE>>>', '(select auth.role())');
      q_work := replace(q_work, '<<<JWT>>>', '(select auth.jwt())');
      q := q_work;
    END IF;

    IF w IS NOT NULL THEN
      w_work := w;
      w_work := regexp_replace(w_work, '\(\s*SELECT\s+auth\.uid\(\)(\s+AS\s+\w+)?\s*\)', '<<<UID>>>', 'gi');
      w_work := regexp_replace(w_work, '\(\s*SELECT\s+auth\.role\(\)(\s+AS\s+\w+)?\s*\)', '<<<ROLE>>>', 'gi');
      w_work := regexp_replace(w_work, '\(\s*SELECT\s+auth\.jwt\(\)(\s+AS\s+\w+)?\s*\)', '<<<JWT>>>', 'gi');
      IF position('auth.uid()' in w_work) > 0
         OR position('auth.role()' in w_work) > 0
         OR position('auth.jwt()' in w_work) > 0 THEN
        changed := true;
        w_work := replace(w_work, 'auth.uid()', '(select auth.uid())');
        w_work := replace(w_work, 'auth.role()', '(select auth.role())');
        w_work := replace(w_work, 'auth.jwt()', '(select auth.jwt())');
      END IF;
      w_work := replace(w_work, '<<<UID>>>', '(select auth.uid())');
      w_work := replace(w_work, '<<<ROLE>>>', '(select auth.role())');
      w_work := replace(w_work, '<<<JWT>>>', '(select auth.jwt())');
      w := w_work;
    END IF;

    IF NOT changed THEN
      CONTINUE;
    END IF;

    SELECT string_agg(quote_ident(role_name), ', ')
      INTO role_list
    FROM unnest(r.roles) AS role_name;

    IF role_list IS NULL OR role_list = '' THEN
      role_list := 'public';
    END IF;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );

    sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      r.policyname,
      r.schemaname,
      r.tablename,
      r.permissive,
      r.cmd,
      role_list
    );

    IF r.cmd = 'INSERT' THEN
      IF w IS NULL THEN
        RAISE EXCEPTION 'Policy %.% INSERT missing WITH CHECK', r.tablename, r.policyname;
      END IF;
      sql := sql || ' WITH CHECK (' || w || ')';
    ELSIF r.cmd IN ('SELECT', 'DELETE') THEN
      IF q IS NULL THEN
        RAISE EXCEPTION 'Policy %.% % missing USING', r.tablename, r.policyname, r.cmd;
      END IF;
      sql := sql || ' USING (' || q || ')';
    ELSE
      -- ALL / UPDATE
      IF q IS NULL THEN
        RAISE EXCEPTION 'Policy %.% % missing USING', r.tablename, r.policyname, r.cmd;
      END IF;
      sql := sql || ' USING (' || q || ')';
      IF w IS NOT NULL THEN
        sql := sql || ' WITH CHECK (' || w || ')';
      END IF;
    END IF;

    EXECUTE sql;
  END LOOP;
END $$;
