#!/usr/bin/env bash
# Provision Railway Pro infra to use included ~$20 usage credit:
# 1) staging + serverless  2) Redis (private)  3) cron services  4) replica guidance
#
# Safe defaults: does not print or set secrets from .env files.
# Run from repo root with Railway CLI logged in and project linked.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WEB_SERVICE_HINT="${RAILWAY_WEB_SERVICE:-zesty-abundance}"
PROD_TARGET_URL="${PROD_TARGET_URL:-https://humanosisu.net}"

info() { echo -e "${BLUE}ℹ️  $*${NC}"; }
ok() { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
err() { echo -e "${RED}❌ $*${NC}"; }

require_cli() {
  if ! command -v railway >/dev/null 2>&1; then
    err "Railway CLI missing. Install: npm i -g @railway/cli"
    exit 1
  fi
  ok "Railway CLI $(railway --version 2>/dev/null | head -1)"
  if ! railway whoami >/dev/null 2>&1; then
    err "Not logged in. Run: railway login"
    exit 1
  fi
  ok "Logged in as $(railway whoami 2>/dev/null | head -1)"
}

print_budget() {
  cat <<EOF

${BLUE}=== Presupuesto orientativo (Pro \$20 included) ===${NC}
  Web production (1 réplica, ~512MB–1GB idle):     ~\$5–12/mes
  Redis (small, always-on, private network):       ~\$1–3/mes
  Crons (3 jobs, seconds/day):                     <\$0.50/mes
  Staging web + Serverless (wake on demand):       ~\$1–4/mes
  2ª réplica production (HA):                      +~\$5–12/mes  ← solo si hay downtime real
  Total típico sin 2ª réplica:                     ~\$8–18/mes  (cabe en el crédito Pro)

EOF
}

step_staging() {
  info "Paso 1/4 — Environment staging + Serverless"
  echo "  Config-as-code: railway.toml → environments.staging.deploy.sleepApplication = true"
  echo
  echo "  CLI (crear env si no existe):"
  echo "    railway environment new staging"
  echo "    # o desde dashboard: Project → + New Environment → staging"
  echo
  echo "  Luego:"
  echo "    1. Duplica el servicio web en staging (o deploy desde develop)"
  echo "    2. npm run staging:setup   # variables (secrets DIFERENTES a prod)"
  echo "    3. Confirma Serverless ON en Settings → Deploy (staging) / sleepApplication"
  echo "    4. ./scripts/deploy-railway.sh --staging"
  echo
  read -r -p "Marcar staging como listo para continuar? (y/N) " ans
  if [[ "${ans:-}" =~ ^[Yy]$ ]]; then
    ok "Staging checklist anotado"
  else
    warn "Staging pendiente — continúa el resto igual"
  fi
}

step_redis() {
  info "Paso 2/4 — Redis en el mismo proyecto (private network)"
  echo "  La app ya lee REDIS_PRIVATE_URL || REDIS_URL (BullMQ employee sync)."
  echo
  echo "  En environment production:"
  echo "    railway environment production"
  echo "    railway add --database redis"
  echo
  echo "  Wire variable en el servicio web (${WEB_SERVICE_HINT}):"
  echo "    Dashboard → ${WEB_SERVICE_HINT} → Variables → New Variable"
  echo "    REDIS_URL = \${{Redis.REDIS_PRIVATE_URL}}"
  echo "    (o el nombre exacto del servicio Redis en el canvas)"
  echo
  echo "  NO uses REDIS_PUBLIC_URL entre servicios Railway (egress \$0.05/GB)."
  echo "  Opcional staging: otro Redis en env staging, o compartir solo si aceptas datos mezclados."
  echo
  read -r -p "¿Ejecutar ahora 'railway add --database redis' en production? (y/N) " ans
  if [[ "${ans:-}" =~ ^[Yy]$ ]]; then
    railway environment production
    railway add --database redis
    ok "Redis template solicitado. Completa el reference \${{Redis.REDIS_PRIVATE_URL}} en el web service."
  else
    warn "Redis no provisionado por este script — hazlo cuando quieras con el comando de arriba"
  fi
}

step_crons() {
  info "Paso 3/4 — Servicios Cron nativos"
  cat <<EOF
  Carpetas listas (Root Directory en cada servicio Railway):

    railway/cron-daily/                     cron 0 12 * * *  → /api/cron/daily
    railway/cron-communications-dispatch/   cron 0 13 * * *  → /api/cron/communications-dispatch
    railway/cron-late-attendance/           cron 0 13 * * *  → /api/cron/late-attendance-report

  Por cada cron (Dashboard → New Service → Empty, o CLI):

    railway add --service cron-daily
    # Settings → Root Directory: railway/cron-daily
    # Settings → Config file: railway/cron-daily/railway.toml  (o deja auto-detect)
    # Variables:
    #   CRON_SECRET = (mismo que el web / distinto staging)
    #   TARGET_URL  = ${PROD_TARGET_URL}
    #   # o ENDPOINT_URL = ${PROD_TARGET_URL}/api/cron/daily

  Deploy desde repo GitHub (mismo repo, root directory distinto) o:
    cd railway/cron-daily && railway up

  Importante: el proceso debe EXIT al terminar (ya lo hacen los index.ts).
  Si queda Active, el siguiente tick se salta.

EOF
  ok "Configs de cron en repo listas"
}

step_replicas() {
  info "Paso 4/4 — Réplica HA (opcional, consume crédito de verdad)"
  cat <<EOF
  Con usage bajo, NO actives 2 réplicas todavía.

  Cuándo sí:
    - Downtime visible o deploys con corte inaceptable
    - Métricas CPU/RAM sostenidas cerca del límite
    - Redis ya wired (rate-limit en memoria NO comparte estado entre réplicas)

  Cómo (solo production):
    Dashboard → ${WEB_SERVICE_HINT} → Settings → Scale → Replicas = 2
    o en railway.toml: numReplicas = 2  (sube bill ~2x del web)

  Monitor: Workspace Usage → mantén total ≤ \$20 si quieres solo la suscripción.

EOF
}

main() {
  echo -e "${BLUE}🚂 Railway Pro credit playbook — setup asistido${NC}"
  echo "================================================="
  require_cli
  print_budget
  step_staging
  step_redis
  step_crons
  step_replicas
  echo
  ok "Listo. Detalle completo: docs/RAILWAY_PRO_CREDIT_PLAYBOOK.md"
  info "Usage: https://railway.com/workspace/usage"
}

main "$@"
