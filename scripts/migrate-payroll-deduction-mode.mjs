#!/usr/bin/env node
/**
 * Migra payroll_deduction_mode en company_payroll_configs.metadata.
 * Inferencia: última corrida autorizada/distribuida (CON|SIN|2PAGOS), si no CON.
 *
 * Uso:
 *   node scripts/migrate-payroll-deduction-mode.mjs
 *   node scripts/migrate-payroll-deduction-mode.mjs --dry-run
 *   node scripts/migrate-payroll-deduction-mode.mjs --company-id=<uuid>
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local o .env
 */
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const VALID_MODES = new Set(['CON', 'SIN', '2PAGOS'])
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const companyArg = args.find((a) => a.startsWith('--company-id='))
const singleCompanyId = companyArg ? companyArg.split('=')[1] : null

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 0) continue
      const k = t.slice(0, i).trim()
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[k]) process.env[k] = v
    }
    break
  }
}

loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local / .env')
  process.exit(1)
}

const supabase = createClient(url, key)

function isBiweekly(freq) {
  const f = (freq || '').toLowerCase()
  return f === 'quincenal' || f === 'biweekly'
}

function coerceMode(mode, paymentFrequency) {
  if (!VALID_MODES.has(mode)) return 'CON'
  if (mode === '2PAGOS' && !isBiweekly(paymentFrequency)) return 'CON'
  return mode
}

async function inferModeForCompany(companyId) {
  const { data: run, error } = await supabase
    .from('payroll_runs')
    .select('tipo, updated_at, status')
    .eq('company_id', companyId)
    .in('status', ['authorized', 'distributed'])
    .in('tipo', ['CON', 'SIN', '2PAGOS'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (run?.tipo && VALID_MODES.has(run.tipo)) return run.tipo
  return 'CON'
}

async function main() {
  let query = supabase
    .from('company_payroll_configs')
    .select('company_id, metadata, payment_frequency')
    .eq('is_active', true)

  if (singleCompanyId) {
    query = query.eq('company_id', singleCompanyId)
  }

  const { data: configs, error } = await query
  if (error) throw error

  console.log(`Configs activas: ${configs?.length ?? 0}${dryRun ? ' (dry-run)' : ''}`)

  let updated = 0
  let skipped = 0

  for (const row of configs || []) {
    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? { ...row.metadata }
        : {}

    const existing = metadata.payroll_deduction_mode
    if (existing && VALID_MODES.has(existing)) {
      const coerced = coerceMode(existing, row.payment_frequency || metadata.payment_frequency)
      if (coerced === existing) {
        skipped++
        continue
      }
      metadata.payroll_deduction_mode = coerced
    } else {
      const inferred = await inferModeForCompany(row.company_id)
      metadata.payroll_deduction_mode = coerceMode(
        inferred,
        row.payment_frequency || metadata.payment_frequency
      )
    }

    console.log(
      `${row.company_id}: payroll_deduction_mode => ${metadata.payroll_deduction_mode}`
    )

    if (!dryRun) {
      const { error: upErr } = await supabase
        .from('company_payroll_configs')
        .update({
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', row.company_id)
        .eq('is_active', true)

      if (upErr) throw upErr
    }

    updated++
  }

  console.log(`Listo. Actualizadas: ${updated}, sin cambio: ${skipped}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
