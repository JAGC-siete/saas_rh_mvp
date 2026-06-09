# Fase 0 — Baseline billing / cotizaciones

**Fecha:** 2026-06-09  
**Proyecto:** fwyxmovfrzauebiqxchz (producción)

## Cotizaciones por status y modalidad

| status | billing_modality | count |
|--------|------------------|-------|
| sent   | annual           | 14    |
| sent   | monthly          | 5     |
| sent   | null             | 1     |

**Total cotizaciones enviadas:** 20

## Trials ventas

| Métrica | Count |
|---------|-------|
| Companies `trial` con `settings.ventas_quote.quote_id` | 18 |
| Trials ventas sin fila en `company_subscriptions` | 18 |
| Cotizaciones `sent` sin company enlazada (vía settings) | 2 |

## Pagos manuales

| Métrica | Count |
|---------|-------|
| Total `manual_payments` | 0 |
| Pagos huérfanos (reference sin cotiz/quote) | 0 |

## Companies por plan y subscription_status

| plan_type  | subscription_status | count |
|------------|---------------------|-------|
| basic      | active              | 1     |
| basic      | inactive            | 3     |
| enterprise | active              | 2     |
| enterprise | inactive            | 1     |
| premium    | inactive            | 4     |
| premium    | pending             | 1     |
| trial      | inactive            | 97    |

## Implicaciones para implementación

1. **Backfill obligatorio pero pequeño:** 18 trials ventas necesitan `trial_activated_at` + `company_subscriptions`; 2 cotizaciones `sent` sin `company_id` (match vía `ventas_quote` cubrirá ~18/20).
2. **Sin pagos históricos:** `manual_payments` vacío — Fase 5 de pagos huérfanos es trivial hoy.
3. **97 trials inactive:** mayoría no son ventas; no mezclar con backfill ventas.
4. **Comisiones:** ningún pago registrado vía admin UI hasta ahora; unificar `activate-from-quote` antes del primer pago real.

## Post-migración (2026-06-09)

Migración `20260609120000_unify_quote_billing` aplicada en producción:

| Métrica | Resultado |
|---------|-----------|
| Cotizaciones con `company_id` | 18 de 20 (2 `unknown_legacy`) |
| Trials ventas con `company_subscriptions` | 18 / 18 |
| RPC `activate_from_quote` | Desplegado |
