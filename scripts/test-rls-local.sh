#!/usr/bin/env bash
# Runs the employee/leave RLS tests against a throwaway LOCAL Postgres.
# Never touches Supabase. Needs initdb/pg_ctl/psql on PATH.
#
#   scripts/test-rls-local.sh            # baseline (prod snapshot) + migration + rollback
#
# Baseline is expected to FAIL the security tests (proves the holes exist);
# after the migration every test must PASS; after the rollback the baseline
# results must come back (proves the rollback restores today's state).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RLS="$ROOT/supabase/tests/rls"
MIGRATION="$ROOT/supabase/migrations/20261016140000_employee_rls_leave_approval.sql"
ROLLBACK="$ROOT/supabase/rollbacks/20261016140000_employee_rls_leave_approval.rollback.sql"

WORK="$(mktemp -d)"
PORT="${RLS_TEST_PORT:-54998}"
cleanup() { pg_ctl -D "$WORK/pg" stop -m fast >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

initdb -D "$WORK/pg" -U postgres -A trust >/dev/null
pg_ctl -D "$WORK/pg" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$WORK/pg.log" -w start >/dev/null

PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -X -q)
"${PSQL[@]}" -c "create database rls_test" >/dev/null
DB=("${PSQL[@]}" -d rls_test)
QUIET=(env PGOPTIONS='-c client_min_messages=warning' "${DB[@]}")

"${QUIET[@]}" -f "$RLS/00_prod_snapshot_20261016.sql" >/dev/null
"${QUIET[@]}" -f "$RLS/01_seed.sql" >/dev/null

run_tests() {
  "${DB[@]}" -f "$RLS/10_role_tests.sql" 2>&1 | sed -nE 's/^.*NOTICE:  (PASS|FAIL) /\1 /p'
}

catalog() {
  "${DB[@]}" -At -c "select polrelid::regclass || '|' || polname || '|' || polpermissive || '|' || polcmd || '|' || polroles::text || '|' || coalesce(pg_get_expr(polqual, polrelid), '') || '|' || coalesce(pg_get_expr(polwithcheck, polrelid), '') from pg_policy where polrelid in ('public.employees'::regclass, 'public.leave_requests'::regclass) order by 1;
    select tgname from pg_trigger where tgrelid = 'public.leave_requests'::regclass and not tgisinternal order by 1;
    select proname from pg_proc where pronamespace = 'public'::regnamespace and proname in ('rls_actor_role', 'rls_actor_employee_id', 'rls_managed_department_ids', 'enforce_leave_request_transition') order by 1;"
}
CAT_BASE="$(catalog)"

echo "== Baseline (prod policies today)"
BASE="$(run_tests)"; echo "$BASE"

echo; echo "== After migration"
"${QUIET[@]}" -v ON_ERROR_STOP=1 -1 -f "$MIGRATION" >/dev/null
AFTER="$(run_tests)"; echo "$AFTER"

echo; echo "== After rollback"
"${QUIET[@]}" -v ON_ERROR_STOP=1 -1 -f "$ROLLBACK" >/dev/null
BACK="$(run_tests)"
CAT_BACK="$(catalog)"

status=0
if grep -q '^FAIL' <<<"$AFTER"; then echo "ERROR: tests fail after the migration"; status=1; fi
if ! grep -q '^FAIL' <<<"$BASE"; then echo "ERROR: baseline shows no holes; tests are not proving anything"; status=1; fi
if [ "$BASE" != "$BACK" ]; then echo "ERROR: rollback does not reproduce the baseline"; diff <(echo "$BASE") <(echo "$BACK") || true; status=1; else echo "rollback reproduces the baseline exactly"; fi
if [ "$CAT_BASE" != "$CAT_BACK" ]; then echo "ERROR: rollback leaves policies/triggers/functions different from baseline"; diff <(echo "$CAT_BASE") <(echo "$CAT_BACK") || true; status=1; else echo "rollback restores the policy/trigger/function catalog exactly"; fi
echo; echo "baseline FAIL: $(grep -c '^FAIL' <<<"$BASE" || true) | after PASS: $(grep -c '^PASS' <<<"$AFTER" || true) FAIL: $(grep -c '^FAIL' <<<"$AFTER" || true)"
exit $status
