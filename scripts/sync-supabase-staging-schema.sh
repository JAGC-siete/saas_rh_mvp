#!/usr/bin/env bash
# Sync public schema: production Supabase → staging branch (schema only, no data).
#
#   export SUPABASE_DB_PASSWORD='…'  # Dashboard → prod → Database settings
#   ./scripts/sync-supabase-staging-schema.sh
#
set -euo pipefail

PROD_REF="${PROD_REF:-fwyxmovfrzauebiqxchz}"
STAGING_BRANCH="${STAGING_BRANCH:-staging}"
OUT="${OUT:-/tmp/prod-public-schema.sql}"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "Missing SUPABASE_DB_PASSWORD"
  echo "Get it from: https://supabase.com/dashboard/project/${PROD_REF}/settings/database"
  exit 1
fi

for bin in pg_dump psql supabase python3; do
  command -v "$bin" >/dev/null || { echo "Missing $bin"; exit 1; }
done

ENC_PWD=$(python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["SUPABASE_DB_PASSWORD"], safe=""))')
PROD_URL="postgresql://postgres.${PROD_REF}:${ENC_PWD}@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require"

echo "→ Dump public schema from production (${PROD_REF})"
pg_dump --schema-only --no-owner --no-privileges --schema=public -f "$OUT" "$PROD_URL"
BYTES=$(wc -c <"$OUT" | tr -d ' ')
echo "  bytes=${BYTES}"
[[ "$BYTES" -ge 1000 ]] || { echo "Dump too small"; exit 2; }

echo "→ Resolve staging branch DB URL"
STG_URL=$(supabase branches get "$STAGING_BRANCH" --project-ref "$PROD_REF" -o json | python3 -c '
import json,sys
c=json.load(sys.stdin)
u=c["POSTGRES_URL"].replace(":6543/",":5432/")
if "sslmode=" not in u:
    u += ("&" if "?" in u else "?") + "sslmode=require"
print(u)
')

echo "→ Apply schema to staging"
psql "$STG_URL" -v ON_ERROR_STOP=1 -f "$OUT"

echo "→ Sync migration history versions"
export STG_URL
psql "$PROD_URL" -tA -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;" \
| python3 -c '
import os, sys, subprocess
versions = [l.strip() for l in sys.stdin if l.strip()]
print(f"  versions={len(versions)}")
if not versions:
    raise SystemExit(0)
values = ",".join("('\''" + v + "'\'')" for v in versions)
sql = "INSERT INTO supabase_migrations.schema_migrations (version) VALUES " + values + " ON CONFLICT DO NOTHING;"
subprocess.check_call(["psql", os.environ["STG_URL"], "-v", "ON_ERROR_STOP=1", "-c", sql])
'

COUNT=$(psql "$STG_URL" -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
echo "→ Staging public tables: ${COUNT} (prod target ~99)"
echo "Done."
