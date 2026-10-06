# Estrategia SEO — estado vivo

> Archivo de memoria del agente SEO. Lo actualiza el agente en cada corrida (vía PR).
> Plan completo: doc "Plan SEO Humano SISU — adaptación e implementación" (aprobado 2026-10-06).

## Fase actual

**Fase 0 · Base** (octubre 2026). Compuerta para pasar a fase 1: mapa de keywords aprobado.

| Fase | Ventana | Entregables | Compuerta |
| --- | --- | --- | --- |
| 0 · Base | Oct 2026 | Mapa de keywords (planilla/nómina por país), medición Core Web Vitals, Lighthouse CI, arreglos sueltos | Keywords aprobadas |
| 1 · Intención | Nov–Dic 2026 | 9 calculadoras, 3 landings biométrico, comparativas, inicio de enlaces | ≥ 80% de páginas nuevas indexadas |
| 2 · Región | Ene–Feb 2027 | Pilares SV y GT, hreflang `/sv/` `/gt/` (reservar `/mx/` `/co/`), tablas ISR 2027, videos | Sin caída de clics 4 semanas tras 301 |
| 3 · Autoridad | Mar–Abr 2027 | Casos de éxito, reseñas reales, informe anual, socios contadores | — |

## Decisiones vigentes

- Competidores reales: **Odoo** y **sistemas propios (in-house)**. Comparativas: "Humano SISU vs. sistema propio", "planilla hondureña para Odoo". Odoo se trata como aliado (hay `odoo-addons`).
- México y Colombia entran en 2027: incluir "nómina" en el mapa de keywords desde ya; no publicar páginas MX/CO hasta que el producto calcule esas leyes.
- Raíz del sitio = Honduras (es-HN). `/sv/` y `/gt/` solo para páginas con versión real por país.
- Validador de fórmulas SV/GT: **por definir** → bloquea publicar calculadoras de SV/GT.
- Casos de éxito: Enlace, Grupo Cora, Ferretería Eben Ezer (pendiente permiso escrito + métricas antes/después).
- Nada de `aggregateRating` sin conteo real verificable.

## Línea base (GSC, 2026-07-05 → 2026-10-03, 90 días)

| Métrica | Valor |
| --- | --- |
| Clics | 60 |
| Impresiones | 3,653 |
| CTR | 1.64% |
| Posición media | 6.6 |
| Clics Honduras / impr. | 50 / 2,718 |
| Clics Guatemala / impr. | 2 / 116 |
| Clics El Salvador / impr. | 3 / 35 |
| Página #1 por impresiones | `/deducciones-honduras-ihss-rap-isr` (1,631 impr, CTR 0.92%) |

Observaciones de la línea base:
- El tráfico es casi todo informativo de Honduras (RAP, IHSS, ISR). Las páginas comerciales (biométrico, Odoo, implementación) tienen impresiones pero 0 clics.
- 452 impresiones desde EE. UU. con CTR 0.2%: probablemente la versión `/en` o diáspora; no es mercado objetivo.
- `/calcusisuhn` aún aparece en GSC (alias viejo con 301): vigilar que las impresiones migren a `/calculadora-deducciones`.

## Línea base Core Web Vitals (Lighthouse móvil, build local, 2026-10-06)

Mediana de 3 corridas; `lighthouserc.json` lo repite en cada PR (solo warning).

| Página | Performance | LCP | CLS | TBT |
| --- | --- | --- | --- | --- |
| `/` | 68 | 3.7 s | 0.254 | 337 ms |
| `/deducciones-honduras-ihss-rap-isr` | 86 | 3.3 s | 0 | 254 ms |
| `/calculadora-deducciones` | 92 | 3.0 s | 0 | 186 ms |
| `/sistema-biometrico-nomina` | 89 | 3.2 s | 0 | 175 ms |

LCP > 2.5 s en las cuatro y CLS de la home > 0.1: candidatos para un PR de rendimiento.

## KPIs y metas (abril 2027)

| KPI | Fuente | Meta |
| --- | --- | --- |
| Clics no-marca (28 días) | `summary.json → analysis.nonBrand` | Fijar tras 4 semanas de datos semanales |
| Impresiones SV + GT (28 días) | `analysis.countries` | Fijar tras 4 semanas |
| Leads desde calculadoras y comparativas | GA4 / `lib/leads` | Fijar tras 4 semanas |
| Páginas prioritarias indexadas | `inspection.json` | 100% |
| Dominios locales enlazando (.hn/.sv/.gt) | GSC → Enlaces (manual) | ≥ 15 |

## Hipótesis abiertas

Ver `bitacora.md`. El agente no lanza un experimento nuevo sobre una página que tenga uno sin medir.
