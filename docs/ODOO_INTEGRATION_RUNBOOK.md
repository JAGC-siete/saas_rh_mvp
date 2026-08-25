# Runbook: SISU ↔ Odoo MVP

SISU calcula nómina. Odoo recibe fichas `hr.employee` y `account.move` en **draft**. No `auto_post`, no `hr.payroll`, no asistencia.

**Asientos en SISU:** `journal-generator` deja `journal_entries` en `draft` y no hay API de `posted`. El contrato v1 es **draft SISU + botón Enviar a Odoo** (planilla `authorized`/`distributed`). Odoo revisa y publica el `account.move`.

## Transporte

| Odoo | API | Auth |
|------|-----|------|
| 19.0 | JSON-2 `POST /json/2/{model}/{method}` | `Authorization: bearer` + API key |
| 18.0 | XML-RPC `/xmlrpc/2/common` + `/xmlrpc/2/object` | login + API key as password |

Instalar `odoo-addons/{18.0|19.0}/humano_sisu_bridge`. Odoo Online: API solo en plan **Custom**.

El grupo **Humano SISU Bridge** (18) / **Humano SISU / Bridge bot** (19) implica Employees Officer + Show Full Accounting Features. Asignar ese grupo al usuario bot basta. En 19 la key del grupo dura máx. 90 días.

Instalación partner: `odoo-addons/INSTALL.md`.

## Rotación de API key (máx. 3 meses)

1. En Odoo: Preferences → Account Security → New API Key (bot del grupo Humano SISU Bridge).
2. En SISU: Contabilidad → Odoo → pegar key, fecha de vencimiento (cap 90 días), Guardar, Probar conexión.
3. `ODOO_SECRETS_KEY` cifra la key en `odoo_connections.api_key_ciphertext`. Si falta o está mal, el outbox marca `dead` sin loguear el secreto.

Key vencida (`key_expires_at`) → jobs `dead` visibles en DLQ.

## Cuenta faltante / desbalance

- Mapa explícito SISU `chart_of_accounts` → `odoo_account_code`. Códigos distintos (NIIF vs `l10n_hn`) son el caso normal.
- Push journals falla 400 si falta mapa.
- El addon rechaza asiento desbalanceado o `account.account` inexistente (4xx → DLQ).
- Re-push es idempotente (`sisu_journal_entry_id` unique). El move sigue en draft.

## Operación

- Empleados: `create.ts`, `update.ts` y legacy `PUT /api/employees/[id]` encolan `name|dni|email|status` si la conexión está `enabled`. No salario. Bajas: el addon busca con `active_test=False`.
- Planilla autorizada: generar asientos (draft SISU) → **Enviar a Odoo**.
- Drain: inline al encolar + `POST /api/cron/odoo-sync` (`Bearer CRON_SECRET`). No hay worker BullMQ; no se encola en Redis.
- Outbox: claim `pending` → `processing` antes de llamar a Odoo. `processing` viejo (>10 min) vuelve a `pending`.
- Replay DLQ: resetea `attempts`.

HTTP a Odoo: timeout 25s. Pull de cuentas pagina de 200.

CSV `/api/accounting/export` sigue como fallback manual, no es el contrato.
