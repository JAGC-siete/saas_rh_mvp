# Registro de landings de marketing

Inventario para auditoría, medición y limpieza. Fuente de verdad en código: `lib/marketing/marketing-landings-registry.ts`.

**Última actualización:** 2026-07-07

---

## Campañas experimentales / candidatas a retiro

| Ruta | Estado | Propósito | CTA principal | Notas |
|------|--------|-----------|---------------|-------|
| `/viernes` | **experimental** | Recuperar el viernes → pack/secuencia `info` | `/activar` | Opener “recuperar el viernes”; misma serie claves. Source `viernes`. |
| `/secreto` (`/info`) | underperforming | Lead magnet + secuencia `info` | Form → email | Misma secuencia que `/viernes`. Redirect si pierde. |
| `/paz` | awareness-only | Parodia Railway Peace | `/activar` (final) | Sin lead capture; video placeholder. Solo paid social o retiro. |

**Alias:** `/domingo` → redirect 302 a `/viernes`

---

## Core comercial (mantener)

| Ruta | Estado | Propósito |
|------|--------|-----------|
| `/` | active | Home SEO + conversión |
| `/activar` | active | Trial |
| `/ventas` | active | Cotización |
| `/suscripcion` | active | Alertas de sueldo (cold / post-calcu) |
| `/calculadora` + `calcusisu*` | active | TOFU herramienta |

---

## SEO estratégico (mantener)

| Ruta | Estado |
|------|--------|
| `/alternativa-odoo-honduras` | active |
| `/sistema-biometrico-nomina` | active |
| `/implementacion-48-horas` | active |
| `/deducciones-honduras-ihss-rap-isr` | active |
| `/afiliados` | active |

---

## Checklist de limpieza (cuando terminen experimentos)

- [ ] Revisar métricas `/viernes` vs `/secreto` vs `/paz` (leads, activaciones, bounce)
- [ ] Si `/viernes` gana: 301 `/secreto` → `/viernes`
- [ ] Decidir `/paz`: mantener solo para ads o archivar
- [ ] Actualizar UTMs en memes/calculadora si cambia landing principal TOFU
- [ ] Quitar entradas `deprecated` de sitemap y middleware

---

## Archivos por landing

| Ruta | Page | Componente | Copy | Estilos |
|------|------|------------|------|---------|
| `/viernes` | `pages/viernes.tsx` | `components/landing/ViernesLanding.tsx` | `lib/marketing/viernes-copy.ts` | `styles/viernes-landing.css` |
| `/secreto` | `pages/info.tsx` | `components/info-game/SealedEnvelopeLead.tsx` | `lib/info-game/sealed-envelope-copy.ts` | shell principal |
| `/paz` | `pages/paz.tsx` | `components/landing/PazLanding.tsx` | inline en componente | `styles/paz-landing.css` |

API leads: `/api/viernes` (source `viernes`), `/api/info` (source `info`; `from=viernes` → `viernes`). Ambos normalizan a kind `info` (secuencia Paper Bridge). Pack T+0: variant `viernes` vs `default`.
