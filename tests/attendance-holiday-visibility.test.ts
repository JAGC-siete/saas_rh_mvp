import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS = join(__dirname, '..', 'supabase', 'migrations')

/** Cuerpo de la última migración que (re)define la función. */
function latestDefinition(fn: string): string {
  const pattern = new RegExp(`CREATE OR REPLACE FUNCTION (public\\.)?${fn}\\(`)
  const file = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) => pattern.test(readFileSync(join(MIGRATIONS, f), 'utf8')))
    .pop()
  assert.ok(file, `no migration defines ${fn}`)
  const sql = readFileSync(join(MIGRATIONS, file), 'utf8')
  const start = sql.search(pattern)
  return sql.slice(start, sql.indexOf('$$ LANGUAGE', start))
}

// Regresión 15/09 y 07/10/2026: is_work_day_for_employee() es FALSE en feriados, así que si
// employee_days solo usa esa función, las marcas de un feriado desaparecen del panel.
describe('attendance dashboard RPCs show punches on holidays', () => {
  for (const fn of ['attendance_kpis_filtered', 'attendance_lists_filtered']) {
    it(`${fn} keeps non-work days that have a check_in`, () => {
      const body = latestDefinition(fn)
      assert.match(body, /is_work_day_for_employee\(/)
      assert.match(
        body,
        /OR EXISTS \(\s*SELECT 1 FROM public\.attendance_records \w+\s+WHERE \w+\.employee_id = e\.id\s+AND \w+\.date = cal\.work_date\s+AND \w+\.check_in IS NOT NULL/
      )
    })
  }
})
