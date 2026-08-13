# Supabase staging branch (persistente)

## Estado

| Item | Valor |
|------|--------|
| Parent (prod) | `fwyxmovfrzauebiqxchz` |
| Branch name | `staging` (persistent) |
| Branch project ref | `huxwtrlxsjrwplaldnld` |
| Branch ID | `8d34e69f-5dff-4e45-a31f-e99d9fe984f0` |
| Costo compute | ~$0.01344/hora (Micro) |
| Datos de prod | **No** se copian |

Dashboard branch: https://supabase.com/dashboard/project/huxwtrlxsjrwplaldnld

## Railway `web-staging`

Ya cableado (sin exponer valores aquí):

- `NEXT_PUBLIC_SUPABASE_URL` → `https://huxwtrlxsjrwplaldnld.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `DATABASE_URL` (pooler del branch)

## Auth del branch (manual en dashboard)

En el proyecto **branch** (no production):

1. [Authentication → URL Configuration](https://supabase.com/dashboard/project/huxwtrlxsjrwplaldnld/auth/url-configuration)
2. **Site URL:** `https://web-staging-staging-c0a2.up.railway.app`
3. **Redirect URLs** (añadir):
   - `https://web-staging-staging-c0a2.up.railway.app/**`
   - `https://web-staging-staging-c0a2.up.railway.app/auth/callback`
   - `https://web-staging-staging-c0a2.up.railway.app/auth/confirm`

## Schema / migraciones

| | Production | Staging branch |
|--|------------|----------------|
| Migraciones en historial | 29 | ~5 (tras reset) |
| Tablas `public` | **99** | **16** |

El historial en production **no coincide** con los ~200 archivos locales del repo (muchas se aplicaron por dashboard con otros timestamps). Por eso `db push` del repo falla en el branch, y el schema del branch queda **incompleto** tras el workflow de branching.

### Siguiente paso — sync schema desde production (sin datos)

```bash
# 1) Dump solo schema público desde prod (pide password DB prod)
supabase db dump --linked -s public -f /tmp/prod-public-schema.sql

# 2) URL session-mode del branch (port 5432 en pooler):
#    supabase branches get staging --project-ref fwyxmovfrzauebiqxchz -o env
#    Usa POSTGRES_URL cambiando :6543 → :5432

psql "$STAGING_SESSION_URL" -v ON_ERROR_STOP=1 -f /tmp/prod-public-schema.sql
```

Luego alinear `supabase_migrations.schema_migrations` con las versiones de production.

Guía ampliada abajo; pedir al agente: “sincroniza schema staging desde prod”.

## Redeploy Railway

```bash
railway environment staging
railway service web-staging
railway redeploy -y
# o: railway deployment redeploy
```

## Verificación

```bash
curl -s https://web-staging-staging-c0a2.up.railway.app/api/health
# Con diagnostics on:
curl -s https://web-staging-staging-c0a2.up.railway.app/api/railway-env-check
# Debe mostrar supabase URL del branch (huxwtrlxsjrwplaldnld), no prod
```

## No hacer

- Copiar `DATABASE_URL` / keys de **production** a Railway staging
- Usar `--with-data` en el branch (expondría datos reales)
- Borrar el branch sin querer: es **persistent**, pero `supabase branches delete staging` lo destruye
