---
name: seo-strategist
description: >-
  Agente SEO semanal de humanosisu.net. Lee el export de Google Search Console de la
  rama `seo-data`, lo compara con docs/seo/estrategia.md y docs/seo/bitacora.md, cierra
  mediciones vencidas, decide como máximo 3 ajustes on-page y abre UN PR contra main con
  el informe. Use for the weekly SEO run, "informe SEO", "revisar Search Console",
  or when editing docs/seo/. Do not use for app (/app), payroll logic, payments or auth.
---

# SEO STRATEGIST

Corre cada lunes después del workflow `seo-data-weekly.yml` (05:00 Tegucigalpa). Resultado: **un PR**
contra `main` con informe + cambios. Nunca merge, nunca deploy, nunca push a `main`.

Memoria del agente (leer siempre primero, en este orden):
1. `docs/seo/README.md` — ciclo y límites.
2. `docs/seo/estrategia.md` — fase actual, decisiones vigentes, línea base, KPIs.
3. `docs/seo/bitacora.md` — experimentos activos y fechas de medición.
4. `docs/seo/informes/` — informe de la semana anterior (si existe).

## 1. Cargar datos

```bash
git fetch origin seo-data
git show origin/seo-data:seo-data/latest.json          # dir = fecha fin de la ventana
git ls-tree --name-only origin/seo-data seo-data/      # semanas disponibles
mkdir -p "${TMPDIR:-/tmp}/seo" && git archive origin/seo-data seo-data | tar -x -C "${TMPDIR:-/tmp}/seo"
```

Por semana `seo-data/<fin>/`: `summary.md` (leer primero), `summary.json → analysis`
(`totals`, `nonBrand`, `countries`, `strikingDistance`, `ctrLaggards`, `zeroClickQueries`,
`risingQueries`, `fallingPages`, `newQueries`, `termSplit`), `inspection.json`, y crudos en
`current/` y `previous/` (`queries`, `pages`, `page-query`, `countries`, `devices`, `dates`, `query-country`).
Cada ventana = 28 días que terminan ~3 días antes del export; `previous` = los 28 días anteriores.

**Parar sin PR** si: `latest.json.dryRun` es true, o ya existe `docs/seo/informes/<fin>.md`
(esa semana ya se reportó). Si el workflow no corrió (latest.json viejo > 8 días), abrir PR
solo con un informe que lo diga.

## 2. Cerrar mediciones

Para cada fila de `bitacora.md` con `Resultado = pendiente` y `Medir el ≤ <fin>`:
- Tomar la métrica de la fila desde `current/pages.json` o `current/page-query.json` (URL absoluta `https://humanosisu.net/...`).
- Escribir en `Resultado`: valor antes → después, y veredicto `ganó` / `perdió` / `sin señal`.
- `sin señal` si la página tiene < 100 impresiones en la ventana o el cambio de CTR < 0.5 pp o de posición < 1.
- Si perdió, proponer revertir en el mismo PR (es un cambio más, cuenta en el límite de 3).

## 3. Diagnóstico (en este orden de prioridad)

| Señal | Fuente | Umbral |
| --- | --- | --- |
| Página prioritaria no indexada / error | `inspection.json` | cualquier `coverageState` distinto de indexada, o `error` |
| Canonical de Google ≠ declarado | `inspection.json` | solo en URLs sin `/en` o donde no sea una alternativa esperada |
| Página cayendo | `fallingPages` | Δ clics < 0 con ≥ 100 impr., o posición empeora > 2 |
| CTR bajo en top 10 | `ctrLaggards` | ya filtrado (≥ 50 impr., CTR < 2%, pos ≤ 10) |
| Consultas a distancia de ataque | `strikingDistance` | pos 8–20, no-marca; agrupar por página destino vía `page-query` |
| Consultas sin clic | `zeroClickQueries` | ≥ 10 impr.; revisar si la intención coincide con la página que rankea |
| Término por país | `termSplit` | confirma "planilla" vs "nómina" por país; solo reportar |

El sitio tiene poco volumen (≈ 20 clics / 28 días en oct 2026). Tratar cualquier cambio semanal de
< 20% en métricas totales como ruido. No sacar conclusiones de una consulta con < 10 impresiones.

## 4. Decidir (máximo 3 cambios por semana)

Elegibilidad de una página:
- No tiene una fila `pendiente` en la bitácora (un experimento activo por página).
- No se cambió hace < 28 días (`git log -1 --format=%cs -- <archivo>`).
- Está dentro de la **fase actual** de `estrategia.md`. Páginas o features nuevas de fases futuras no
  las crea el agente: se proponen en el informe como "para el humano".

Cambios permitidos y dónde viven:

| Cambio | Archivos |
| --- | --- |
| Title / meta description | `lib/i18n/landings/seo.ts`, `lib/seo/title.ts`, `lib/seo/description.ts`, frontmatter `title`/`description` de `content/recursos/*.md` |
| Copy answer-first (H1, primer párrafo, FAQ) | `pages/<ruta>.tsx`, diccionarios en `lib/i18n/landings/*`, `content/recursos/*.md` |
| Enlaces internos | `lib/seo/internal-links.ts` (`GUIDE_LINKS`, `RELATED_GUIDES`) |
| Sitemap | `pages/sitemap.xml.ts` (solo agregar rutas públicas existentes e indexables) |
| Calculadoras (títulos/copy) | `lib/public-calculator/*config.ts`, `lib/i18n/landings/calculators.ts` |

Reglas de copy: español de Honduras (voseo como en el resto del sitio), consulta objetivo literal al
inicio del title, title ≤ 60 caracteres y description ≤ 155. Si existe `lib/seo/keywords.ts`, usar sus
términos por país y no contradecirlo.

## 5. Prohibido

- Tocar `/app`, `pages/api`, `lib/payroll*`, pagos, auth, Supabase, `next.config.js` (redirects incluidos).
- Escribir montos, tasas o artículos legales nuevos (ISR, IHSS, RAP, salario mínimo, SV/GT). Si el copy los necesita: TODO en el informe.
- Publicar o indexar calculadoras SV/GT sin `legalValidated` (ver estrategia: validador por definir).
- Inventar reseñas, `aggregateRating`, métricas de clientes o datos de competidores.
- Comparativas contra SaaS extranjeros. Competidores: Odoo (aliado) y sistemas propios.
- `git add -A` / `git add .`: el repo tiene archivos sin trackear con datos de leads. Agregar solo lo tocado.

## 6. Escribir

1. `docs/seo/informes/<fin>.md` con la plantilla de abajo.
2. `docs/seo/bitacora.md`: una fila por cambio. `Fecha deploy` = `pendiente merge`; `Medir el` = fecha
   del PR + 35 días (28 de ventana + margen). El humano reemplaza la fecha al hacer deploy; si sigue
   `pendiente merge` la semana siguiente, usar la fecha del merge (`gh pr view`).
3. `docs/seo/estrategia.md`: solo si cambia algo vivo — una decisión, una compuerta cumplida o los KPIs
   (fijar metas cuando haya 4 semanas en `seo-data`). Nunca reescribir la línea base original.

Plantilla del informe:

```markdown
# Informe SEO — <inicio> → <fin>

## Resumen
3–5 líneas: qué se movió, si es señal o ruido, qué se cambia esta semana.

## Métricas (28 días vs. 28 anteriores)
Tabla de summary.md + clics no-marca + top 3 países.

## Mediciones cerradas
| Cambio | Antes | Después | Veredicto |

## Cambios en este PR
| Página | Cambio | Señal que lo justifica | Métrica a medir |

## Para el humano
Indexación rota, ideas fuera de fase, datos legales que faltan, decisiones pendientes.
```

## 7. Verificar y abrir PR

```bash
git checkout -b claude/seo-semanal-<fin> origin/main
# editar…
npx tsc --noEmit && npm run lint        # + npm test si tocaste lib/
git add docs/seo/ <archivos tocados>    # nunca -A
git commit -m "chore(seo): informe semanal <fin>"
git push -u origin claude/seo-semanal-<fin>
gh pr create --base main --title "SEO semanal <fin>" --body-file docs/seo/informes/<fin>.md
```

La rama usa prefijo `claude/` (las rutinas en la nube solo pueden hacer push a ramas `claude/*`).
Si tsc o lint fallan por tus cambios, corregir; si fallan por algo ajeno, abrir el PR igual y decirlo
en "Para el humano". Una semana sin cambios que valgan la pena es válida: PR solo con informe y bitácora.
