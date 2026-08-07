# Google Ads — Humano SISU (taxonomía 1B + 2A)

## Principios ([Google Tag Platform](https://developers.google.com/tag-platform/devguides/conversions))

1. **Google tag** (`gtag config AW-17840996991`) en rutas de marketing vía `MarketingAnalytics`.
2. **Event snippet** solo en el momento de conversión (nunca en el head global).
3. **Primary** = page-load en thank-you URL **limpia** (sin PII en query).
4. **Secondary** = click (WhatsApp) o lead in-page con `transaction_id`.
5. **CTAs** a `/activar` / `/ventas` = solo engagement GA4 (`TrackedInternalCta` / `trackCTAClick`).

## Taxonomía

| Acción | Rol Ads | `send_to` env | Momento | URL |
|--------|---------|---------------|---------|-----|
| Trial signup | **Primary** | `NEXT_PUBLIC_GADS_SEND_TO_ACTIVATION` (fallback Contact label) | page-load | `/activar/gracias` |
| Cotización | **Primary** | `NEXT_PUBLIC_GADS_SEND_TO_QUOTE` (fallback Contact label) | page-load | `/ventas/gracias` |
| Lead (info/viernes/PDF/newsletter) | Secondary | `NEXT_PUBLIC_GADS_SEND_TO_LEAD` | submit | in-page |
| WhatsApp | Secondary | `NEXT_PUBLIC_GADS_SEND_TO_WHATSAPP` | click | n/a |
| Comparación SEO | Secondary | `NEXT_PUBLIC_GADS_SEND_TO_COMPARISON` | page view | n/a |
| CTA interno | — | (vacío) | click | engagement only |

## Thank-you sin PII

- Contexto UI en `sessionStorage` (`lib/analytics/thank-you-context.ts`).
- Redirect: `router.push('/activar/gracias')` / `'/ventas/gracias'` — **cero** email/nombre en query.
- Email en copy: solo mascara (`j***@dominio.com`) desde sessionStorage.

## Código clave

- `lib/analytics/googleAds.ts` — helpers + `THANK_YOU_PATHS`
- `components/marketing/MarketingAnalytics.tsx` — gtag diferido; **inmediato** en thank-you
- `components/TrackedInternalCta.tsx` — CTAs internos
- `components/TrackedWhatsAppLink.tsx` — WhatsApp Secondary
- `pages/activar/gracias.tsx`, `pages/ventas/gracias.tsx`

## Checklist Google Ads UI

1. Crear/ajustar 2 conversiones Primary: Trial TY, Quote TY (page load, count once, `transaction_id`).
2. Marcar Lead / WhatsApp / Comparison como **Secondary** (no Optimize).
3. URL rules: `…/activar/gracias` y `…/ventas/gracias`.
4. Tag Assistant: completar form → TY → ver `conversion` + `send_to`.
5. No poner event snippet en todas las páginas.

## Verificación rápida

```bash
npm run build
# Rutas esperadas: /activar/gracias, /ventas/gracias
```
