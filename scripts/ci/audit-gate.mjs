#!/usr/bin/env node
/**
 * Gate de seguridad para CI: falla si hay vulnerabilidades high o critical en
 * dependencias de producción, salvo las de ALLOWLIST.
 *
 * Sin dependencias: corre `npm audit --omit=dev --json` y filtra el resultado.
 *
 * Uso:
 *   node scripts/ci/audit-gate.mjs
 */

import { spawnSync } from 'node:child_process'

const BLOCKING = new Set(['high', 'critical'])

/**
 * Paquetes aceptados temporalmente, con el motivo. Solo herramientas de build:
 * no llegan a la imagen de producción (.next/standalone).
 * Quitar cada entrada cuando se haga la migración indicada.
 */
const ALLOWLIST = {
  tailwindcss: 'Tailwind 3 en build. Se resuelve migrando a Tailwind 4.',
  chokidar: 'Watcher de Tailwind 3, solo build/dev.',
  'fast-glob': 'Escaneo de archivos de Tailwind 3, solo build.',
  micromatch: 'Vía fast-glob/chokidar de Tailwind 3, solo build.',
  braces: 'Vía micromatch de Tailwind 3, solo build.',
  postcss: 'postcss@8.4.31 fijado dentro de Next 15, solo build. Se resuelve con Next 16.',
}

const run = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})

let report
try {
  report = JSON.parse(run.stdout)
} catch {
  console.error('No se pudo leer la salida de npm audit.\n', run.stderr || run.stdout)
  process.exit(2)
}
if (report.error) {
  console.error('npm audit falló:', report.error.summary || report.error)
  process.exit(2)
}

const vulns = Object.values(report.vulnerabilities ?? {})
const blocking = vulns.filter((v) => BLOCKING.has(v.severity) && !(v.name in ALLOWLIST))
const allowed = vulns.filter((v) => BLOCKING.has(v.severity) && v.name in ALLOWLIST)
const stale = Object.keys(ALLOWLIST).filter(
  (name) => !vulns.some((v) => v.name === name && BLOCKING.has(v.severity))
)

const counts = report.metadata?.vulnerabilities ?? {}
console.log(
  `npm audit (producción): ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ` +
    `${counts.moderate ?? 0} moderate, ${counts.low ?? 0} low`
)

for (const v of allowed) {
  console.log(`  permitido  ${v.severity.padEnd(8)} ${v.name}: ${ALLOWLIST[v.name]}`)
}
for (const name of stale) {
  console.log(`  ::notice::${name} ya no tiene vulnerabilidades high/critical; quítalo de ALLOWLIST.`)
}

if (blocking.length > 0) {
  for (const v of blocking) {
    const titles = v.via
      .filter((x) => typeof x === 'object')
      .map((x) => `${x.title} (${x.url})`)
    const fix =
      v.fixAvailable === true
        ? 'npm audit fix'
        : v.fixAvailable
          ? `${v.fixAvailable.name}@${v.fixAvailable.version}${v.fixAvailable.isSemVerMajor ? ' (major)' : ''}`
          : 'sin fix'
    console.error(`::error::${v.severity} en ${v.name} — fix: ${fix}`)
    for (const t of titles) console.error(`    ${t}`)
  }
  console.error(`\n${blocking.length} paquete(s) con vulnerabilidades high/critical sin permitir.`)
  process.exit(1)
}

console.log('Sin vulnerabilidades high/critical fuera de la lista permitida.')
