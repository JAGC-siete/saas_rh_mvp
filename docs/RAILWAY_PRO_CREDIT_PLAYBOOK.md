# Railway Pro — usar el crédito incluido (~$20)

Guía operativa para el workspace Pro cuando el usage real está muy por debajo del crédito. El crédito **no se acumula**; conviene activar infra útil sin pasarse de $20.

Proyecto enlazado típico: `sincere-cat` · web: `zesty-abundance`.

## Presupuesto objetivo

| Pieza | Estimación mensual | Notas |
|-------|-------------------|--------|
| Web production (1 réplica) | $5–12 | Always-on; `sleepApplication = false` |
| Redis (template Railway) | $1–3 | Private network; BullMQ |
| Cron ×3 (daily / communications / late-attendance) | <$0.50 | Solo corre segundos/día |
| Staging web + Serverless | $1–4 | Duerme tras ~10 min sin outbound |
| **Subtotal típico** | **~$8–18** | Cabe en el crédito Pro |
| +2ª réplica (HA) | +$5–12 | Solo si hay necesidad real |

Revisa: [Workspace Usage](https://railway.com/workspace/usage) · [Understanding your bill](https://docs.railway.com/pricing/understanding-your-bill)

## Setup asistido

```bash
chmod +x scripts/setup-railway-pro-infra.sh
./scripts/setup-railway-pro-infra.sh
```

---

## 1. Staging + Serverless

### Ya en repo

`railway.toml` define:

```toml
[environments.staging.deploy]
sleepApplication = true
numReplicas = 1
```

Production permanece always-on (`sleepApplication = false`).

### Pasos dashboard / CLI

1. Crear environment `staging` (dashboard o `railway environment new staging`).
2. Servicio web en staging (duplicar o deploy desde `develop`).
3. Variables: `npm run staging:setup` — **secrets distintos** a production.
4. Confirmar Serverless ON en Settings → Deploy del servicio staging.
5. Deploy: `./scripts/deploy-railway.sh --staging`
6. Health: `curl https://<staging-domain>/api/health`

### Caveat Serverless

Next.js telemetry / pools de DB pueden impedir el sleep. Si staging no duerme, revisa métricas de red outbound ([Serverless docs](https://docs.railway.com/reference/app-sleeping)). Staging sigue siendo útil aunque consuma un poco más.

Docs previas: `STAGING_QUICK_START.md`, `docs/RAILWAY_STAGING_SETUP.md`.

---

## 2. Redis (private network)

### Ya en app

- Dependencias: `ioredis`, `bullmq`
- Cola: `lib/queues/employeeSyncQueue.ts` (graceful si no hay Redis)
- URL: `lib/redis/url.ts` → `REDIS_PRIVATE_URL` **o** `REDIS_URL`

### Provisionar

```bash
railway environment use production
railway add --database redis
```

En el servicio web (`zesty-abundance`) → Variables:

```text
REDIS_URL=${{Redis.REDIS_PRIVATE_URL}}
```

(Ajusta `Redis` al nombre exacto del servicio en el canvas.)

**No** uses la URL pública entre servicios del mismo proyecto ([optimize usage](https://docs.railway.com/guides/optimize-usage)).

Tras redeploy, en logs deberías ver: `[Queue] Employee sync queue enabled (Redis available)`.

### Staging

Preferible: Redis propio en environment staging. Evita mezclar jobs/datos con production.

---

## 3. Crons nativos Railway

Servicios efímeros (arranque → HTTP POST → exit). Schedules en **UTC**.

| Servicio (root dir) | Cron UTC | Hora America/Tegucigalpa | Endpoint |
|---------------------|----------|--------------------------|----------|
| `railway/cron-daily` | `0 12 * * *` | 06:00 | `/api/cron/daily` |
| `railway/cron-communications-dispatch` | `0 13 * * *` | 07:00 | `/api/cron/communications-dispatch` |
| `railway/cron-late-attendance` | `0 13 * * *` | 07:00 | `/api/cron/late-attendance-report` |

Cada carpeta incluye `Dockerfile` + `railway.toml` (`cronSchedule`, `restartPolicyType = NEVER`).

### Variables por servicio cron

| Variable | Valor |
|----------|--------|
| `CRON_SECRET` | Mismo Bearer que valida `pages/api/cron/*` |
| `TARGET_URL` | `https://humanosisu.net` (prod) o URL staging |
| `ENDPOINT_URL` | (opcional) URL completa del endpoint |

### Crear servicio

1. New Empty Service → nombre `cron-daily` (etc.).
2. Connect GitHub repo → **Root Directory** = `railway/cron-daily`.
3. Config as code: `railway/cron-daily/railway.toml`.
4. Set variables → Deploy.
5. En el primer run: el deployment debe pasar a **Success** y salir. Si queda **Active**, el siguiente tick se salta ([Cron Jobs](https://docs.railway.com/reference/cron-jobs)).

Prueba manual: Railway → servicio cron → Deploy / Restart, o `curl -X POST -H "Authorization: Bearer $CRON_SECRET" "$TARGET_URL/api/cron/daily"`.

---

## 4. Segunda réplica (HA) — diferir

Con usage bajo, **no** subir a 2 réplicas todavía: duplica el costo del web y puede dejar poco margen del crédito.

Activa solo si:

- Hay downtime o deploys con corte inaceptable
- CPU/RAM sostenidos cerca del límite
- Redis ya está wired (rate-limit en memoria no se comparte entre réplicas; ver `lib/security/rate-limiting.ts`)

Cómo: Settings → Scale → Replicas = 2 (solo production). Nota Railway: **no hay sticky sessions** (`lib/config/railway.ts`).

---

## Checklist post-setup

- [ ] Environment `staging` existe y Serverless ON
- [ ] Redis en production + `REDIS_URL=${{….REDIS_PRIVATE_URL}}` en web
- [ ] Log web: queue enabled
- [ ] Tres crons con schedule y exit limpio
- [ ] Usage Limits: soft alert en ~$15, hard opcional ≥$25 ([optimize usage](https://docs.railway.com/guides/optimize-usage))
- [ ] Workspace Usage < $20 a mitad de ciclo (ajustar staging/replicas)

## Referencias

- [Plans](https://docs.railway.com/pricing/plans)
- [Private networking](https://docs.railway.com/guides/private-networking)
- [Config as code](https://docs.railway.com/guides/config-as-code) (`sleepApplication`, `cronSchedule`)
- `DEPLOYMENT.md`
