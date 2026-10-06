# Prompts para Claude Code — Plan SEO Humano SISU

Cómo usar: abre una terminal en `~/saas-proyecto`, corre `claude`, y pega **un prompt a la vez**.
Cada prompt termina en un PR; revísalo y haz merge antes de pasar al siguiente.
Para los prompts grandes (3 en adelante) empieza con `Shift+Tab` en modo plan para revisar el plan antes de que edite.

Reglas que aplican a todos (ya van dentro de cada prompt, no hace falta repetirlas):
- Una rama y un PR por prompt. Nunca push directo a `main` (dispara CI/CD).
- Los PR van contra `main`: usar siempre `gh pr create --base main` (la rama por defecto del repo en GitHub es `develop`).
- **No usar `git add -A` ni `git add .`**: hay muchos archivos sin trackear con datos de leads y correos (`scripts/data/*`, `.agents/skills/*`) que no deben subirse. Agregar solo los archivos tocados.
- El texto visible del sitio va en español (Honduras). Código y commits pueden ir en inglés.

---

## Prompt 1 — Infraestructura del agente SEO

```
Lee docs/seo/README.md, docs/seo/estrategia.md y scripts/seo/gsc-export.mjs. Son la infraestructura de un agente SEO semanal.

Tareas:
1. Crea la rama seo/agent-setup desde main (git pull primero).
2. Mueve docs/seo/seo-data-weekly.yml a .github/workflows/seo-data-weekly.yml. Revisa que el YAML sea válido y que no choque con .github/workflows/ci-cd.yml (el workflow nuevo escribe en la rama huérfana seo-data, nunca en main).
3. Corre `node scripts/seo/gsc-export.mjs --dry-run`, confirma que genera seo-data/<fecha>/summary.md, y luego borra la carpeta seo-data/ (está en .gitignore).
4. Haz git add SOLO de: .gitignore, scripts/seo/, docs/seo/, .github/workflows/seo-data-weekly.yml. No uses git add -A: hay archivos sin trackear con datos personales que no deben subirse. Muéstrame `git status --short` antes de commitear.
5. Commit "chore(seo): weekly GSC export + SEO agent memory", push y abre PR con gh.
6. Al final dame la lista exacta de pasos manuales para crear la cuenta de servicio de Google Cloud, darle acceso en Search Console a sc-domain:humanosisu.net y guardar el secreto GSC_SERVICE_ACCOUNT_JSON en GitHub (puedes usar `gh secret set GSC_SERVICE_ACCOUNT_JSON < ruta-al-json` si te paso la ruta). No me pidas pegar el JSON en el chat.
```

## Prompt 2 — Fase 0: arreglos y base técnica

```
Contexto: docs/seo/estrategia.md (fase 0). Rama nueva seo/phase-0 desde main.

1. Promesa inconsistente: lib/seo/internal-links.ts etiqueta /implementacion-48-horas como "Implementación biométrica en 72 h". Busca qué dice la página y sus diccionarios (lib/i18n/landings) y unifica. Si hay contradicción real entre 48 y 72 horas, pregúntame antes de elegir.
2. Rutas huérfanas: RELATED_GUIDES y GUIDE_LINKS apuntan a /domingos-sin-planilla, /plan-basico y /cerrar-planilla-en-paz. Verifica si existen (páginas, rewrites o redirects en next.config.js). Si existen y son públicas, agrégalas al sitemap; si no, quítalas de los enlaces.
3. Sitemap: pages/sitemap.xml.ts pone lastmod = hoy en cada petición. Quítalo de las páginas estáticas (o usa un mapa de fechas mantenido a mano en lib/seo/lastmod.ts); los recursos ya usan dateModified/datePublished y se quedan así.
4. inLanguage por país: LOCALE_SCHEMA_LANG marca todo el español como es-HN. Haz que las calculadoras de El Salvador y Guatemala (PublicDeductionCalculator con PUBLIC_CALCULATOR_CONFIGS.SLV/GTM) emitan es-SV / es-GT en su WebPage schema. No cambies URLs ni hreflang todavía.
5. Enlaces de calculadoras SV/GT: en RELATED_GUIDES, '/calculadora-deducciones-el-salvador' y '-guatemala' apuntan al pilar de Honduras. Agrega enlaces cruzados entre las tres calculadoras de deducciones y deja el pilar de Honduras solo en la de Honduras.
6. Mapa de keywords: crea lib/seo/keywords.ts tipado por país (HND, SLV, GTM y reservados MEX, COL) y por ruta, con término principal ("planilla" para HN/SV/GT, "nómina" para MX/CO) y consultas objetivo. Siémbralo con las consultas reales de scripts/data/gsc-export-2026-10-03/queries.csv y page-query.csv (ignora consultas de marca y las que tienen operadores -site:). Todavía no lo conectes a title.ts; solo el archivo y un test simple que valide la forma.
7. Lighthouse CI: agrega .github/workflows/lighthouse.yml que corra en PRs contra un build de producción local (next build && next start) para /, /deducciones-honduras-ihss-rap-isr, /calculadora-deducciones y /sistema-biometrico-nomina, perfil móvil. Umbrales como warning (no bloquear): LCP < 2500 ms, CLS < 0.1, performance >= 0.8. Usa SKIP_ENV_VALIDATION=true igual que ci-cd.yml.
8. Agrega una fila a docs/seo/bitacora.md por cada cambio que pueda mover métricas.

Corre npx tsc --noEmit, npm run lint y npm run build. git add solo los archivos tocados. Un commit por punto, push y PR con `gh pr create --base main`.
```

## Prompt 3 — Fase 1a: calculadoras (SEO programático)

```
Contexto: docs/seo/estrategia.md (fase 1) y lib/public-calculator/config.ts. Rama seo/phase-1-calculators.

Objetivo: pasar de calculadoras sueltas a una matriz país × tipo, sin romper las URLs actuales.

1. Diseña el modelo: un registro por (país, tipo) con slug, título, descripción, base legal (artículo y ley), fecha "vigente a", ejemplo resuelto, FAQ propia y un flag legalValidated. Reutiliza PUBLIC_CALCULATOR_CONFIGS y prestaciones-config.ts; no dupliques la lógica de cálculo existente.
2. Las URLs actuales (/calculadora-deducciones, /calculadora-deducciones-el-salvador, /calculadora-deducciones-guatemala, /calculadora-prestaciones, /calculadora-aguinaldo-honduras, /calculadora-catorceavo-honduras) se quedan igual.
3. Nuevas calculadoras de Honduras: vacaciones, horas extra y salario mínimo 2026. Implementa la lógica con tests unitarios con casos numéricos que yo pueda verificar, y cita el artículo del Código del Trabajo de Honduras en cada una. Si no estás seguro de una regla legal, déjala como TODO y pregúntame; no inventes.
4. Nuevas de El Salvador (aguinaldo, indemnización, vacaciones) y Guatemala (Bono 14, aguinaldo, indemnización): crea la estructura y las páginas con legalValidated=false. Mientras sea false: <meta name="robots" content="noindex">, fuera del sitemap y un aviso visible "en validación". Nadie ha validado aún las fórmulas de SV/GT.
5. Cada página: respuesta directa arriba, ejemplo resuelto, base legal, FAQ, CTA a /activar, schema WebPage + FAQPage + BreadcrumbList con generadores de lib/seo/schema.ts, PublicPageHead, y registro en PUBLIC_SSR_EXACT (lib/seo/public-ssr-routes.ts).
6. Actualiza /calculadora (el hub) para enlazar todas las calculadoras indexables.
7. Bitácora: una fila por página nueva.

tsc, lint, tests y build en verde. git add solo lo tocado. PR con `gh pr create --base main`.
```

## Prompt 4 — Fase 1b: biométrico y comparativas

```
Contexto: docs/seo/estrategia.md. Rama seo/phase-1-landings.

Los competidores reales son Odoo (que tratamos como aliado: hay odoo-addons en el repo) y los sistemas propios in-house. No hagas comparativas contra marcas SaaS extranjeras.

1. Extrae de pages/alternativa-odoo-honduras.tsx un componente reutilizable components/landing/ComparisonPage (tabla comparativa, beneficios, migración, FAQ, CTA, schema) alimentado por diccionarios en lib/i18n/landings. La página de Odoo debe verse igual después del refactor.
2. Nueva landing /sistema-propio-vs-humano-sisu: "¿Desarrollar un sistema de planilla propio o usar Humano SISU?". Ejes: costo total (desarrollo + mantenimiento + actualización de tablas ISR/IHSS/RAP cada año), tiempo de implementación, riesgo legal, soporte, biometría integrada. Tono factual, sin cifras inventadas: si un número no está en el repo o en docs/, déjalo como rango explicado o pregúntame.
3. Reposiciona el copy de /alternativa-odoo-honduras como "planilla hondureña para Odoo" (complemento), sin cambiar la URL.
4. Tres landings del clúster biométrico, sobre la estructura de pages/sistema-biometrico-nomina.tsx: /reloj-biometrico-en-la-nube, /control-de-asistencia-sin-usb, /marcaje-facial-planilla. Contenido distinto en cada una (no plantillas con palabras cambiadas). Enlázalas entre sí, al artículo content/recursos/muerte-usb-biometria-tiempo-real.md y a /implementacion-48-horas. Si lib/hikvision indica qué modelos soportamos, menciónalos.
5. Agrega todas las rutas a PUBLIC_SSR_EXACT, sitemap, GUIDE_LINKS/RELATED_GUIDES y bitácora.
6. Agrega generateVideoObjectSchema a lib/seo/schema.ts (name, description, thumbnailUrl, uploadDate, contentUrl/embedUrl, hasPart para capítulos) y un componente LiteYouTube que cargue el iframe solo al hacer clic. No los uses todavía en páginas (aún no hay videos).

tsc, lint, build. git add solo lo tocado. PR con `gh pr create --base main`.
```

## Prompt 5 — Fase 2: arquitectura regional (no correr antes de enero 2027)

```
Contexto: docs/seo/estrategia.md (fase 2). Rama seo/phase-2-regions. Empieza en modo plan y espera mi aprobación antes de editar.

1. Extiende lib/i18n/locale.ts para soportar región: raíz = es-HN, /sv/ = es-SV, /gt/ = es-GT, /en = en; reserva tipos para /mx/ y /co/ sin rutas activas. Mantén el esquema actual de rewrites de /en en next.config.js (sin i18n nativo de Next) y aplícalo igual a /sv y /gt.
2. Emite hreflang de país SOLO entre páginas equivalentes (calculadoras de deducciones HN↔SV↔GT y pilares por país). Actualiza LandingHreflang, bilingual-paths.ts y xhtmlAlternates en pages/sitemap.xml.ts. x-default = raíz.
3. Mueve /calculadora-deducciones-el-salvador → /sv/calculadora-deducciones y la de Guatemala → /gt/calculadora-deducciones con 301 permanentes en next.config.js. Conserva los alias /calcusisu* encadenados a la URL final en un solo salto.
4. Crea los pilares /sv/deducciones-isss-afp-isr y /gt/deducciones-igss-isr-bono-14 con la estructura de pages/deducciones-honduras-ihss-rap-isr.tsx. Pregúntame por los datos legales vigentes antes de escribir montos.
5. Agrega a content/recursos los campos de frontmatter `pais` y `pilar`, y genera RELATED_GUIDES desde ahí en vez de mantenerlo a mano.
6. Bitácora: fila "migración /sv /gt" con medición a 28 días.

tsc, lint, build y un test que valide que cada URL del sitemap responde 200 y cada 301 llega en un salto. PR con `gh pr create --base main`.
```

## Prompt 6 — Fase 3: casos de éxito (cuando tengas permiso y métricas)

```
Rama seo/phase-3-cases. Crea la ruta /casos/[slug] con contenido en content/casos/*.md (frontmatter: empresa, industria, país, ciudad, fecha, métricas antes/después, cita, autor de la cita, cargo, permiso_publicacion: true|false).

Siembra tres borradores: enlace, grupo-cora, ferreteria-eben-ezer, con permiso_publicacion: false y TODO donde falten datos. No inventes métricas, citas ni nombres.

Mientras permiso_publicacion sea false: noindex y fuera del sitemap. Cuando sea true: Article + Review con generateReviewSchema (autor real). Nunca aggregateRating. Agrega un hub /casos y un enlace desde la home. PR con `gh pr create --base main`.
```
