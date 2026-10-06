#!/usr/bin/env node
/**
 * Exportador semanal de Google Search Console para el agente SEO.
 *
 * Sin dependencias: firma el JWT de la cuenta de servicio con node:crypto y usa fetch.
 * Pensado para correr en GitHub Actions (las APIs de Google no son alcanzables desde
 * el entorno de Claude), que luego commitea el resultado a la rama `seo-data`.
 *
 * Variables:
 *   GSC_SERVICE_ACCOUNT_JSON  JSON completo de la cuenta de servicio (requerido salvo --dry-run)
 *   GSC_SITE_URL              default: sc-domain:humanosisu.net
 *   GSC_OUT_DIR               default: seo-data
 *   GSC_WINDOW_DAYS           default: 28
 *   GSC_INSPECT_LIMIT         default: 25 (URLs a inspeccionar con URL Inspection API)
 *
 * Uso:
 *   node scripts/seo/gsc-export.mjs            # exporta
 *   node scripts/seo/gsc-export.mjs --dry-run  # genera datos falsos para probar el flujo
 *
 * Salida: <OUT>/<fecha-fin>/{current,previous}/*.json, inspection.json, summary.json, summary.md
 *         y <OUT>/latest.json apuntando a la carpeta más reciente.
 */

import { createSign } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SITE = process.env.GSC_SITE_URL || 'sc-domain:humanosisu.net'
const SITE_ORIGIN = 'https://humanosisu.net'
const OUT = process.env.GSC_OUT_DIR || 'seo-data'
const WINDOW = Number(process.env.GSC_WINDOW_DAYS || 28)
const INSPECT_LIMIT = Number(process.env.GSC_INSPECT_LIMIT || 25)
const DRY = process.argv.includes('--dry-run')
const SCOPE = 'https://www.googleapis.com/auth/webmasters'

/** Páginas que siempre se inspeccionan (el plan SEO depende de ellas). */
const PRIORITY_PATHS = [
  '/',
  '/deducciones-honduras-ihss-rap-isr',
  '/recursos/guia-calcular-isr-rap-honduras-2026',
  '/calculadora-deducciones',
  '/calculadora-deducciones-el-salvador',
  '/calculadora-deducciones-guatemala',
  '/sistema-biometrico-nomina',
  '/implementacion-48-horas',
  '/alternativa-odoo-honduras',
  '/calculadora',
]

const DIMENSION_SETS = {
  totals: [],
  queries: ['query'],
  pages: ['page'],
  'page-query': ['page', 'query'],
  countries: ['country'],
  devices: ['device'],
  dates: ['date'],
  'query-country': ['query', 'country'],
}

// ---------- fechas ----------
const iso = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * 864e5)

function windows() {
  // GSC consolida datos con ~3 días de retraso.
  const end = addDays(new Date(), -3)
  const start = addDays(end, -(WINDOW - 1))
  const prevEnd = addDays(start, -1)
  const prevStart = addDays(prevEnd, -(WINDOW - 1))
  return {
    current: { startDate: iso(start), endDate: iso(end) },
    previous: { startDate: iso(prevStart), endDate: iso(prevEnd) },
  }
}

// ---------- auth ----------
const b64url = (buf) => Buffer.from(buf).toString('base64url')

async function accessToken() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('Falta GSC_SERVICE_ACCOUNT_JSON')
  const sa = JSON.parse(raw)
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: sa.token_uri, iat: now, exp: now + 3600 })
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claim}`)
  const jwt = `${header}.${claim}.${b64url(signer.sign(sa.private_key))}`
  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  if (!res.ok) throw new Error(`Token: ${res.status} ${await res.text()}`)
  return (await res.json()).access_token
}

// ---------- API ----------
async function searchAnalytics(token, range, dimensions) {
  const rows = []
  const rowLimit = 25000
  for (let startRow = 0; ; startRow += rowLimit) {
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ...range, dimensions, rowLimit, startRow, dataState: 'final' }),
      }
    )
    if (!res.ok) throw new Error(`searchAnalytics ${dimensions.join(',')}: ${res.status} ${await res.text()}`)
    const batch = (await res.json()).rows || []
    rows.push(...batch.map((r) => ({ ...keysToObject(dimensions, r.keys), clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })))
    if (batch.length < rowLimit) break
  }
  return rows
}

function keysToObject(dimensions, keys = []) {
  return Object.fromEntries(dimensions.map((d, i) => [d, keys[i]]))
}

async function inspect(token, url) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE, languageCode: 'es' }),
  })
  if (!res.ok) return { url, error: `${res.status}` }
  const r = (await res.json()).inspectionResult || {}
  const idx = r.indexStatusResult || {}
  return {
    url,
    verdict: idx.verdict,
    coverageState: idx.coverageState,
    lastCrawlTime: idx.lastCrawlTime,
    googleCanonical: idx.googleCanonical,
    userCanonical: idx.userCanonical,
    mobileVerdict: r.mobileUsabilityResult?.verdict,
    richResults: r.richResultsResult?.detectedItems?.map((i) => i.richResultType) ?? [],
  }
}

// ---------- datos falsos para --dry-run ----------
function fakeRows(dimensions, seed) {
  const sample = {
    query: ['como se calcula el rap en honduras 2026', 'techo rap 2026', 'calculadora isr honduras', 'planilla honduras', 'reloj biometrico nube'],
    page: PRIORITY_PATHS.map((p) => SITE_ORIGIN + p),
    country: ['hnd', 'slv', 'gtm', 'usa'],
    device: ['MOBILE', 'DESKTOP'],
    date: Array.from({ length: 7 }, (_, i) => iso(addDays(new Date(), -10 + i))),
  }
  if (dimensions.length === 0) return [{ clicks: 30 * seed, impressions: 1800 * seed, ctr: 0.016, position: 6.6 }]
  const first = sample[dimensions[0]]
  return first.map((v, i) => {
    const row = { [dimensions[0]]: v }
    if (dimensions[1]) row[dimensions[1]] = sample[dimensions[1]][i % sample[dimensions[1]].length]
    const impressions = Math.round((200 - i * 30) * seed)
    const clicks = Math.max(0, Math.round(impressions * 0.015 * seed))
    return { ...row, clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: 5 + i * 1.7 }
  })
}

// ---------- análisis ----------
const sum = (rows, k) => rows.reduce((a, r) => a + (r[k] || 0), 0)

function totalsOf(rows) {
  const r = rows[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  return { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }
}

function pct(a, b) {
  if (!b) return a ? null : 0
  return (a - b) / b
}

function isBrand(q) {
  return /sisu|humano ?sisu|humanosisu/i.test(q)
}

function deltaBy(cur, prev, key) {
  const prevMap = new Map(prev.map((r) => [r[key], r]))
  return cur.map((r) => {
    const p = prevMap.get(r[key])
    return {
      [key]: r[key],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
      dClicks: r.clicks - (p?.clicks || 0),
      dImpressions: r.impressions - (p?.impressions || 0),
      dPosition: p ? r.position - p.position : null,
      isNew: !p,
    }
  })
}

function analyze(cur, prev) {
  const tc = totalsOf(cur.totals)
  const tp = totalsOf(prev.totals)
  const nonBrandCur = cur.queries.filter((r) => !isBrand(r.query))
  const nonBrandPrev = prev.queries.filter((r) => !isBrand(r.query))
  const queryDeltas = deltaBy(cur.queries, prev.queries, 'query')
  const pageDeltas = deltaBy(cur.pages, prev.pages, 'page')

  return {
    totals: {
      current: tc,
      previous: tp,
      change: {
        clicks: pct(tc.clicks, tp.clicks),
        impressions: pct(tc.impressions, tp.impressions),
        ctr: tc.ctr - tp.ctr,
        position: tc.position - tp.position,
      },
    },
    nonBrand: {
      clicks: sum(nonBrandCur, 'clicks'),
      clicksPrev: sum(nonBrandPrev, 'clicks'),
      impressions: sum(nonBrandCur, 'impressions'),
      impressionsPrev: sum(nonBrandPrev, 'impressions'),
    },
    countries: deltaBy(cur.countries, prev.countries, 'country').sort((a, b) => b.impressions - a.impressions),
    strikingDistance: cur.queries
      .filter((r) => r.position >= 8 && r.position <= 20 && r.impressions >= 5 && !isBrand(r.query))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 30),
    ctrLaggards: cur.pages
      .filter((r) => r.impressions >= 50 && r.ctr < 0.02 && r.position <= 10)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20),
    zeroClickQueries: cur.queries
      .filter((r) => r.impressions >= 10 && r.clicks === 0 && !isBrand(r.query))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 30),
    risingQueries: queryDeltas.filter((r) => r.dImpressions > 0).sort((a, b) => b.dImpressions - a.dImpressions).slice(0, 20),
    fallingPages: pageDeltas.filter((r) => r.dClicks < 0 || (r.dPosition ?? 0) > 2).sort((a, b) => a.dClicks - b.dClicks).slice(0, 20),
    newQueries: queryDeltas.filter((r) => r.isNew && r.impressions >= 3).sort((a, b) => b.impressions - a.impressions).slice(0, 30),
    // "planilla" vs "nómina": qué término usa la gente que ya nos encuentra, por país.
    termSplit: termSplit(cur['query-country']),
  }
}

function termSplit(rows) {
  const out = {}
  for (const r of rows) {
    const term = /n[oó]mina/i.test(r.query) ? 'nomina' : /planilla/i.test(r.query) ? 'planilla' : null
    if (!term) continue
    out[r.country] ??= { planilla: 0, nomina: 0 }
    out[r.country][term] += r.impressions
  }
  return out
}

function fmtPct(x) {
  return x == null ? 'n/d' : `${(x * 100).toFixed(1)}%`
}

function summaryMarkdown(meta, a, inspection) {
  const t = a.totals
  const lines = [
    `# Search Console — ${meta.current.startDate} → ${meta.current.endDate}`,
    '',
    `Comparado con ${meta.previous.startDate} → ${meta.previous.endDate}. Propiedad \`${SITE}\`.`,
    '',
    '| Métrica | Actual | Anterior | Cambio |',
    '| --- | --- | --- | --- |',
    `| Clics | ${t.current.clicks} | ${t.previous.clicks} | ${fmtPct(t.change.clicks)} |`,
    `| Impresiones | ${Math.round(t.current.impressions)} | ${Math.round(t.previous.impressions)} | ${fmtPct(t.change.impressions)} |`,
    `| CTR | ${fmtPct(t.current.ctr)} | ${fmtPct(t.previous.ctr)} | ${(t.change.ctr * 100).toFixed(2)} pp |`,
    `| Posición media | ${t.current.position?.toFixed(1)} | ${t.previous.position?.toFixed(1)} | ${t.change.position?.toFixed(1)} |`,
    `| Clics no-marca | ${a.nonBrand.clicks} | ${a.nonBrand.clicksPrev} | ${fmtPct(pct(a.nonBrand.clicks, a.nonBrand.clicksPrev))} |`,
    '',
    '## Por país',
    '',
    '| País | Clics | Impr. | Δ impr. | Pos. |',
    '| --- | --- | --- | --- | --- |',
    ...a.countries.slice(0, 8).map((r) => `| ${r.country} | ${r.clicks} | ${r.impressions} | ${r.dImpressions} | ${r.position.toFixed(1)} |`),
    '',
    '## A distancia de ataque (pos. 8–20)',
    '',
    ...a.strikingDistance.slice(0, 15).map((r) => `- \`${r.query}\` · impr ${r.impressions} · pos ${r.position.toFixed(1)}`),
    '',
    '## Páginas con CTR bajo (en top 10, CTR < 2%)',
    '',
    ...a.ctrLaggards.map((r) => `- ${r.page} · impr ${r.impressions} · CTR ${fmtPct(r.ctr)} · pos ${r.position.toFixed(1)}`),
    '',
    '## Indexación',
    '',
    ...inspection.map((r) => `- ${r.url} · ${r.coverageState || r.error || 'n/d'}${r.googleCanonical && r.userCanonical && r.googleCanonical !== r.userCanonical ? ' · ⚠ canonical distinto' : ''}`),
    '',
  ]
  return lines.join('\n')
}

// ---------- main ----------
async function main() {
  const meta = { site: SITE, windowDays: WINDOW, generatedAt: new Date().toISOString(), dryRun: DRY, ...windows() }
  const token = DRY ? null : await accessToken()
  const data = { current: {}, previous: {} }

  for (const period of ['current', 'previous']) {
    for (const [name, dims] of Object.entries(DIMENSION_SETS)) {
      data[period][name] = DRY ? fakeRows(dims, period === 'current' ? 1.1 : 1) : await searchAnalytics(token, meta[period], dims)
    }
  }

  const topPages = data.current.pages.sort((a, b) => b.impressions - a.impressions).map((r) => r.page)
  const toInspect = [...new Set([...PRIORITY_PATHS.map((p) => SITE_ORIGIN + p), ...topPages])].slice(0, INSPECT_LIMIT)
  const inspection = DRY
    ? toInspect.map((url) => ({ url, coverageState: 'Submitted and indexed (dry-run)' }))
    : await Promise.all(toInspect.map((u) => inspect(token, u)))

  const analysis = analyze(data.current, data.previous)
  const dir = join(OUT, meta.current.endDate)
  for (const period of ['current', 'previous']) {
    await mkdir(join(dir, period), { recursive: true })
    for (const [name, rows] of Object.entries(data[period])) {
      await writeFile(join(dir, period, `${name}.json`), JSON.stringify(rows, null, 1))
    }
  }
  await writeFile(join(dir, 'inspection.json'), JSON.stringify(inspection, null, 1))
  await writeFile(join(dir, 'summary.json'), JSON.stringify({ meta, analysis }, null, 1))
  await writeFile(join(dir, 'summary.md'), summaryMarkdown(meta, analysis, inspection))
  await writeFile(join(OUT, 'latest.json'), JSON.stringify({ dir: meta.current.endDate, ...meta }, null, 1))

  console.log(`OK ${dir} · clics ${analysis.totals.current.clicks} · impr ${analysis.totals.current.impressions}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
